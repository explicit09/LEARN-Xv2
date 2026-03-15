# AI Pipeline

## Overview

The AI pipeline is the core infrastructure that makes every downstream feature work. If parsing quality is poor, every lesson, quiz, flashcard, and chat response is degraded. Get this right.

```
Upload
  → Parse (Reducto REST)
  → Chunk (structure-aware, 512 tokens)
  → Enrich chunks (Haiku generates 50-100 token context per chunk — 67% retrieval improvement)
  → Embed enriched content (text-embedding-3-large, batched, stored as halfvec(3072))
  → Store (pgvector single table, FTS on enriched content)
  → Update workspace.total_token_count
  → Extract concepts (LLM, deduped)
  → Build persona context (4 layers: learner + pedagogical + performance + framing)
  → Generate lessons (LLM, persona-adapted + interest-framed)
  → Generate artifacts (quizzes, flashcards — examples from student's interest domain)

Query (chat / quiz / lesson generation)
  → Check workspace.total_token_count
  → If < 500K: Full-context mode (Claude Opus, cached document corpus, 0% retrieval failure)
  → If ≥ 500K: RAG mode
       → Embed query (halfvec)
       → hybrid_search (vector + FTS, RRF merge)
       → [Optional] Rerank top-20 → top-5
  → Build persona context → resolve framing context
  → Build prompt with cache blocks (system → workspace → persona → [chunks/history] → query)
  → Stream response
```

---

## Phase 1 AI Stack (TypeScript only)

| Task | Tool | Notes |
|------|------|-------|
| Document parsing | Reducto REST API | `reducto-ts` npm package — replaces LlamaParse (EOL May 2026) |
| Chunking | Custom TypeScript logic | Structure-aware + contextual enrichment, see below |
| Embeddings | OpenAI `text-embedding-3-large` via Helicone | 3072 dimensions, batch API, stored as `halfvec` |
| Content generation | Claude Sonnet 4.6 via Vercel AI SDK + Helicone | Lessons, concept extraction, chat |
| Fast generation | Gemini 3.1 Flash-Lite via Vercel AI SDK + Helicone | Quizzes, flashcards, study guides — $0.25/MTok |
| Reranking | None in Phase 1 | Add Cohere Rerank in Phase 2 when quality demands it |

Phase 2 adds the Python FastAPI service for Docling (table extraction), custom reranking, and more complex RAG pipelines.

---

## Document Parsing

### Reducto

Use `reducto-ts` (the official Reducto TypeScript SDK).

> **Migration note:** LlamaParse is EOL May 1, 2026. Reducto is the drop-in replacement — same Markdown output format, same REST API pattern, improved table and equation handling.

```typescript
import Reducto from 'reducto-ts'

const reducto = new Reducto({ apiKey: process.env.REDUCTO_API_KEY })

async function parseDocument(fileBuffer: Buffer, fileType: string): Promise<ParsedDocument> {
  const result = await reducto.parse({
    document: fileBuffer,
    options: {
      output_format: 'markdown',     // returns clean Markdown
      extract_tables: true,
      extract_equations: true,
    },
  })

  return {
    text: result.content,
    pageCount: result.page_count,
    wordCount: countWords(result.content),
  }
}
```

**Why Reducto:** Consistent parsing regardless of document complexity. Handles tables, code blocks, equations, and scanned documents. Returns clean Markdown that feeds directly into structure-aware chunking. Managed API with no self-hosted infrastructure required.

### URL ingestion

```typescript
import FirecrawlApp from '@mendable/firecrawl-js'

async function scrapeUrl(url: string): Promise<ParsedDocument> {
  const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })
  const result = await app.scrapeUrl(url, { formats: ['markdown'] })
  return { text: result.markdown, pageCount: 1, wordCount: countWords(result.markdown) }
}
```

### YouTube transcripts

```typescript
import { YoutubeTranscript } from 'youtube-transcript'

async function getYoutubeTranscript(url: string): Promise<ParsedDocument> {
  const videoId = extractVideoId(url)
  const transcript = await YoutubeTranscript.fetchTranscript(videoId)
  const text = transcript.map(t => t.text).join(' ')
  return { text, pageCount: 1, wordCount: countWords(text) }
}
```

---

## Chunking Strategy

### Targets
- **Q&A / quiz / flashcard retrieval:** 512 tokens, 15% overlap (~77 tokens)
- **Lesson generation:** 1024 tokens (wider context for narrative generation)

### Structure-aware splitting

Parse the LlamaParse Markdown output to extract headings and section boundaries before splitting. A heading marks a new semantic unit.

```typescript
function chunkDocument(parsed: ParsedDocument): Chunk[] {
  const chunks: Chunk[] = []
  const sections = splitByMarkdownHeadings(parsed.text)
  // Returns: [{ heading: string, content: string, level: 1|2|3 }]

  for (const section of sections) {
    if (countTokens(section.content) <= 512) {
      // Small section → single chunk, preserve heading as metadata
      chunks.push({
        content: section.content,
        sectionHeading: section.heading,
        contentType: detectContentType(section.content),  // text|table|code|equation
      })
    } else {
      // Large section → split with overlap, carry heading forward
      const subChunks = splitWithOverlap(section.content, 512, 77)
      subChunks.forEach((sub, i) => {
        chunks.push({
          content: sub,
          sectionHeading: section.heading,
          contentType: detectContentType(sub),
          chunkIndex: i,
        })
      })
    }
  }

  return chunks
}
```

**Critical:** Never split in the middle of a worked example, definition, or proof. Detect these patterns and keep them as a single chunk even if they exceed 512 tokens (cap at 1024).

```typescript
function detectContentType(text: string): ContentType {
  if (/^```|^\s{4}/.test(text)) return 'code'
  if (/\|.*\|.*\|/.test(text)) return 'table'
  if (/\$.*\$|\\[.*\\]/.test(text)) return 'equation'
  if (/^(Definition|Theorem|Proof|Example|Note):/.test(text)) return 'definition'
  if (/^(Example|Case study|Worked example):/.test(text)) return 'example'
  return 'text'
}
```

---

## Contextual Enrichment (Anthropic's Contextual Retrieval)

This step runs **after chunking, before embedding**. It is the highest-ROI single improvement to retrieval quality.

### Why

Chunks lose context when split from their document. A chunk containing "The formula is F = ma" has no embedding signal indicating it is from a physics document, in the Forces chapter, after the Newton's Laws introduction. Without context, retrieval fails on semantically similar but topically different queries.

### Results

| Approach | Retrieval Failure Rate |
|----------|----------------------|
| Baseline hybrid search | 5.7% |
| + Contextual embeddings | 3.5% (−38%) |
| + Contextual BM25 | 2.9% (−49%) |
| + Reranker on top | 1.9% (−67%) |

Source: Anthropic Contextual Retrieval research.

### Implementation

Cache the full document at the start (cache write cost). Then for each chunk, use Claude Haiku with the cached document to generate a 50-100 token context summary. Prepend it to the chunk before embedding **and** before FTS indexing.

```typescript
async function enrichChunksWithContext(
  chunks: Chunk[],
  fullDocumentText: string,
): Promise<Chunk[]> {
  const enriched: Chunk[] = []

  for (const chunk of chunks) {
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5'),
      messages: [
        {
          role: 'user',
          content: [
            // Cache the full document — pay cache_write once, read from cache for every chunk
            {
              type: 'text',
              text: `<document>\n${fullDocumentText}\n</document>`,
              experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
              },
            },
            {
              type: 'text',
              text: `Here is a chunk from the document above:\n<chunk>\n${chunk.content}\n</chunk>\n\nIn 1-2 sentences, describe what this chunk is about and how it fits into the broader document. Be specific. Do not summarize the chunk itself.`,
            },
          ],
        },
      ],
    })

    enriched.push({
      ...chunk,
      // Prepend context to content used for embedding and FTS — NOT to stored content
      enrichedContent: `${text}\n\n${chunk.content}`,
    })
  }

  return enriched
}
```

**Cost:** Cache write for a 200-page document (~300K tokens): ~$1.88. Each subsequent chunk contextualization reads from cache: ~$0.00015/chunk. For 500 chunks: ~$0.075. Total one-time ingestion cost: ~$1.96. The retrieval quality improvement is permanent across every future query.

**Implementation rule:** Embed and FTS-index `enrichedContent`, but store the original `content` in the `chunks` table — students see the original, unmodified text in citations.

---

## Embeddings

### Generation

Always batch embed. Never embed one-by-one.

```typescript
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Helicone proxy → OpenAI
  const BATCH_SIZE = 100
  const batches = chunk(texts, BATCH_SIZE)
  const embeddings: number[][] = []

  for (const batch of batches) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: batch,
      dimensions: 3072,
    })
    embeddings.push(...response.data.map(d => d.embedding))
  }

  return embeddings
}
```

**Model:** `text-embedding-3-large`, 3072 dimensions. Do not change without migrating all existing embeddings and re-indexing.

### Storage

```typescript
// After generating embeddings, store in a single transaction
// Note: cast to halfvec — required at 3072 dims for HNSW index compatibility
await db.transaction(async (tx) => {
  const insertedChunks = await tx.insert(chunksTable)
    .values(chunks.map(c => ({
      ...c,
      content: c.content,          // original content — what students see in citations
      documentId,
      workspaceId,
    })))
    .returning()

  await tx.insert(chunkEmbeddings).values(
    insertedChunks.map((chunk, i) => ({
      chunkId: chunk.id,
      embedding: sql`${JSON.stringify(embeddings[i])}::halfvec`,  // halfvec not vector
      modelVersion: 'text-embedding-3-large',
    }))
  )
})
```

---

## Retrieval

### The One Retrieval Path

All retrieval — chat, lesson generation, quiz generation — goes through the `hybrid_search` Postgres function. No exceptions. See `03-database.md` for the SQL implementation.

```typescript
// Knowledge Store service — the only place hybrid_search is called
async function retrieveChunks(params: {
  workspaceId: string,
  query: string,
  limit?: number,
  vectorWeight?: number,
}): Promise<RetrievedChunk[]> {
  // 1. Embed the query
  const [queryEmbedding] = await generateEmbeddings([params.query])

  // 2. Call hybrid_search RPC
  const results = await supabase.rpc('hybrid_search', {
    p_workspace_id: params.workspaceId,
    p_query_embedding: JSON.stringify(queryEmbedding),
    p_query_text: params.query,
    p_match_count: params.limit ?? 10,
    p_vector_weight: params.vectorWeight ?? 0.7,
  })

  return results.data
}
```

### Reranking (Phase 2)

After `hybrid_search` returns top-20, add a Cohere Rerank cross-encoder step:

```typescript
// Phase 2 addition
const reranked = await cohere.rerank({
  model: 'rerank-english-v3.0',
  query: params.query,
  documents: top20.map(r => r.content),
  topN: 5,
})
```

---

## Concept Extraction

This is the make-or-break step. Noisy concepts break the knowledge graph, lesson ordering, and mastery tracking.

### Strategy

1. Sample representative chunks (max 50 — no need to process all 500)
2. Extract (entity, relationship, entity) triples via structured LLM output
3. Deduplicate: normalize names (lowercase, strip articles), merge near-duplicates
4. Build the concept graph

```typescript
const conceptExtractionPrompt = `
You are an expert knowledge extractor. Given the following course material chunks, extract key concepts and their relationships.

Return a JSON array of triples:
[
  { "source": "concept name", "relation": "prerequisite|related|part_of|extends", "target": "concept name" },
  ...
]

Rules:
- Concepts must be specific (not "introduction" or "overview")
- Concepts must be teachable units (a student could be tested on them)
- prerequisite: source must be understood before target
- part_of: source is a component of target
- related: conceptually connected but neither is prerequisite
- extends: target builds on source
- Maximum 30 triples
- Concept names: 2-5 words, noun phrase, title case

Course material:
{chunks}
`
```

```typescript
async function extractConceptTriples(
  chunks: Chunk[],
  workspaceId: string
): Promise<ConceptTriple[]> {
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: z.object({
      triples: z.array(z.object({
        source: z.string(),
        relation: z.enum(['prerequisite', 'related', 'part_of', 'extends']),
        target: z.string(),
      }))
    }),
    prompt: buildConceptExtractionPrompt(chunks),
  })

  // Record AI request for observability
  await recordAIRequest({ taskType: 'concept_extract', model: 'gpt-4o', ... })

  return deduplicateTriples(object.triples)
}
```

### Deduplication

```typescript
function deduplicateTriples(triples: ConceptTriple[]): ConceptTriple[] {
  // Normalize: lowercase, remove leading articles (a/an/the), trim
  const normalize = (name: string) =>
    name.toLowerCase().replace(/^(a|an|the)\s+/i, '').trim()

  // Deduplicate by normalized name pair + relation
  const seen = new Set<string>()
  return triples.filter(t => {
    const key = `${normalize(t.source)}|${t.relation}|${normalize(t.target)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
```

---

## Lesson Generation

> **See `10-generative-ui.md`** for the full generative UI lesson structure. Lessons are NOT markdown — they are structured component specs. The prompt below must include the component selection rules from that doc.

### Prompt Structure

```typescript
const lessonGenerationPrompt = `
You are an expert educator creating a personalized lesson.

Student profile:
- Learning style: {learningStyle}
- Explanation depth: {explanationDepth}
- Tone preference: {tonePreference}
- Structure preference: {structurePreference}

Interest-based framing:
- Student interests: {interests}
- Suggested analogy domain: {analogyDomain}
- Framing strength: {framingStrength}  // 'light' | 'moderate' | 'none'
- Career relevance frame: {relevanceFrame}

Framing rules:
- If framingStrength is 'none', do not use interest-based examples.
- If 'light', use one analogy in the hook or first example only.
- If 'moderate', use the interest domain for up to 2 examples/analogies.
- Once the student understands the concept, switch to precise academic language.
- Never force a metaphor where the literal explanation is clearer.
- Academic precision always wins when they conflict.

Topic: {conceptName}
Prerequisite concepts already covered: {prerequisites}

Source material (use this as the ground truth — do not invent facts):
{retrievedChunks}

Create a lesson with:
1. A clear title
2. A hook (why this matters — use {relevanceFrame} if provided)
3. Core explanation (adapted to the student's style and depth preference)
4. {exampleCount} examples (use {analogyDomain} domain where natural and helpful)
5. Common misconceptions to avoid
6. Key takeaways (3-5 bullet points)
7. A bridge to the next concept

Format as JSON matching the structured_sections schema.
Length: {targetLength} words.
`
```

### Model routing

All model slots are environment-variable controlled for A/B testing and provider flexibility. Primary stack as of March 2026:

| Content type | Model | Effort | Rationale |
|-------------|-------|--------|-----------|
| Lesson generation | `claude-sonnet-4-6` | `high` | Best structured output quality; prompt caching economics |
| Concept extraction | `claude-sonnet-4-6` | `high` | Accuracy critical; structured output reliability |
| Chat responses | `claude-sonnet-4-6` | `medium` | Speed + quality; context compaction for long sessions |
| Widget HTML generation | `claude-sonnet-4-6` | `high` | Code quality matters for interactive components |
| Quiz questions (MCQ, T/F) | `gemini-3.1-flash-lite` | — | $0.25/MTok; simple task; high volume |
| Flashcard generation | `gemini-3.1-flash-lite` | — | Cheapest option; simple format |
| Short-answer evaluation | `claude-sonnet-4-6` | `low` | Fast judgment; low effort sufficient |
| Study guide | `gemini-3.1-flash-lite` | — | Summarization; budget task |
| Chunk context enrichment | `claude-haiku-4-5` | — | Fast, cheap; benefits from document cache hits |
| Full-context chat (small workspace) | `claude-opus-4-6` | `medium` | 1M context at flat rate; no retrieval overhead |

```typescript
// Environment-based model routing — config change, not code change
export const MODEL_ROUTES = {
  LESSON_GENERATION:   process.env.LESSON_MODEL    ?? 'claude-sonnet-4-6',
  CONCEPT_EXTRACTION:  process.env.CONCEPT_MODEL   ?? 'claude-sonnet-4-6',
  CHAT:                process.env.CHAT_MODEL       ?? 'claude-sonnet-4-6',
  FAST_GENERATION:     process.env.FAST_MODEL       ?? 'gemini-3.1-flash-lite',
  CHUNK_ENRICHMENT:    process.env.ENRICHMENT_MODEL ?? 'claude-haiku-4-5',
  FULL_CONTEXT_CHAT:   process.env.FULL_CTX_MODEL   ?? 'claude-opus-4-6',
  EMBEDDING:           process.env.EMBEDDING_MODEL  ?? 'text-embedding-3-large',
} as const
```

---

## AI Observability

Every LLM call must record to `ai_requests`. Use this wrapper:

```typescript
async function trackedGenerate<T>(params: {
  taskType: AiTaskType,
  model: string,
  fn: () => Promise<{ result: T, usage: TokenUsage, latencyMs: number }>,
  jobId?: string,
  userId?: string,
}): Promise<T> {
  const start = Date.now()

  try {
    const { result, usage } = await params.fn()
    const latencyMs = Date.now() - start

    await db.insert(aiRequests).values({
      userId: params.userId,
      jobId: params.jobId,
      taskType: params.taskType,
      provider: 'openai',
      model: params.model,
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      latencyMs,
      costCents: calculateCost(params.model, usage),
      wasCached: false,
      validationPassed: true,
    })

    return result
  } catch (error) {
    // Still record failed requests for debugging
    await db.insert(aiRequests).values({ ..., validationPassed: false })
    throw error
  }
}
```

### Langfuse integration

Add Langfuse tracing for multi-step pipeline observability (lesson generation involves retrieval + persona fetch + generation — trace all steps):

```typescript
import Langfuse from 'langfuse'

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
})

// Wrap lesson generation with a trace
const trace = langfuse.trace({ name: 'lesson-generation', userId })
const span = trace.span({ name: 'retrieval' })
// ... retrieval ...
span.end()
const generation = trace.generation({ name: 'sonnet-lesson', model: 'claude-sonnet-4-6', input: prompt })
// ... generate ...
generation.end({ output: result })
```

---

## Prompt Versioning

All prompts are versioned strings stored in `lib/ai/prompts/`. Never inline prompts in task files.

```
lib/ai/prompts/
├── concept-extraction.v1.ts
├── lesson-generation.v1.ts
├── quiz-generation.v1.ts
├── flashcard-generation.v1.ts
├── chat-system.v1.ts
└── persona-context-builder.v1.ts   ← builds the framing context from Persona layers
```

Each prompt file exports a builder function:
```typescript
export const lessonGenerationPromptV1 = (params: LessonPromptParams): string => `...`
export const PROMPT_VERSION = 'lesson-generation.v1'
```

Record `PROMPT_VERSION` in every `ai_requests` row. This lets you correlate quality regressions with prompt changes.

---

## Full-Context Mode vs. RAG Mode

With Claude Opus 4.6 offering 1M tokens at standard pricing (no long-context surcharge), small workspaces can skip RAG entirely and load the full document set into context — with dramatic simplicity and 0% retrieval failure.

### Decision Gate

```
workspace.total_token_count < 500_000  →  Full-context mode
workspace.total_token_count >= 500_000 →  RAG mode (hybrid_search)
```

The `total_token_count` column on `workspaces` is updated by the `document_processing` job when each document completes.

### Full-Context Mode

For workspaces under the threshold, skip chunk retrieval. Instead:

1. Load the full raw document text for the workspace
2. Structure it as a cached prompt block (cache write on first query, cache read on all subsequent)
3. Query the model directly — 0% retrieval failure, full document comprehension

```typescript
async function buildFullContextMessages(
  workspaceId: string,
  personaContext: PersonaContext,
  conversationHistory: Message[],
  userMessage: string,
): Promise<CoreMessage[]> {
  const documents = await db.query.documents.findMany({
    where: eq(documents.workspaceId, workspaceId),
    columns: { fullText: true, fileName: true },
  })

  return [
    {
      role: 'system',
      content: [
        // Block 1: Static system instructions — cached across all users
        {
          type: 'text',
          text: SYSTEM_INSTRUCTIONS,
          experimental_providerMetadata: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
        // Block 2: Full document corpus — cached per workspace
        {
          type: 'text',
          text: documents.map(d => `## ${d.fileName}\n\n${d.fullText}`).join('\n\n---\n\n'),
          experimental_providerMetadata: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
        // Block 3: Persona context — cached per user session
        {
          type: 'text',
          text: serializePersonaContext(personaContext),
          experimental_providerMetadata: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
      ],
    },
    // Variable: conversation history + current message (NOT cached)
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ]
}
```

### RAG Mode (Workspaces ≥ 500K Tokens)

Standard hybrid search pipeline. See Retrieval section above.

### Cost Comparison (100 queries, 50-page workspace ~75K tokens)

| | First query | Subsequent (cached) | 100-query total |
|--|-------------|---------------------|-----------------|
| Full-context (Claude Opus) | $0.375 | $0.038 | ~$4.12 |
| RAG (hybrid search + Sonnet) | $0.05 | $0.05 | $5.00 |

At small workspace sizes, full-context with caching is cheaper and simpler. RAG wins at scale.

---

## Prompt Caching Architecture

Structure every LLM call to maximize cache hits. The rule: **static content first, dynamic content last.** Any change in a prompt prefix invalidates the cache for everything after it.

### Canonical Block Order

```
[BLOCK 1 — cached across all users]      ← system instructions, constraints, output format
[BLOCK 2 — cached per workspace]         ← workspace summary, concept graph context
[BLOCK 3 — cached per user session]      ← persona context (all 4 layers)
[VARIABLE — NOT cached]                  ← retrieved chunks OR full doc, history, user query
```

### Expected Savings Per Session (20 queries)

| Block | Tokens | Cache? | First query | Query 2-20 |
|-------|--------|--------|-------------|------------|
| System instructions | ~1.5K | Yes | $0.0075 | $0.00075 |
| Workspace context | ~2K | Yes | $0.01 | $0.001 |
| Persona context | ~2K | Yes | $0.01 | $0.001 |
| Variable (chunks + history + query) | ~6K | No | $0.03 | $0.03 |
| **Total** | | | **$0.058** | **$0.033** |

Session savings: 43% on queries 2-20. At scale across thousands of daily active users, prompt caching is the single largest cost lever available.

### Implementation Note

Anthropic's automatic prompt caching (enabled by default in 2026) handles common static prefixes without explicit `cacheControl` annotations. Still add explicit breakpoints for clarity and to guarantee cache hit rates on the workspace and persona blocks.
