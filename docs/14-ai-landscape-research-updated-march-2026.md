# AI Landscape Research — Updated March 14, 2026

> Comprehensive update to `13-ai-landscape-research-march-2026.md`. This document adds the latest model-specific findings, pricing, 1M-context architecture decisions, and concrete implications for LEARN-X.

---

## 1. Model Landscape: Exact Specs (March 14, 2026)

### Flagship Models

| Model | Context | Pricing (in/out per MTok) | Max Output | Key Capability |
|-------|---------|--------------------------|-----------|----------------|
| **Claude Opus 4.6** | 200K standard / **1M GA (no premium)** | $5 / $25 | 128K tokens | Adaptive thinking (4 effort levels); SWE-bench 76.8% |
| **Claude Sonnet 4.6** | 200K / **1M GA** | $3 / $15 | 64K tokens | Near-Opus quality, best cost/performance ratio |
| **GPT-5.4** | 272K base / 1M experimental | $2.50 / $15 | — | Tool Search (47% token reduction); structured outputs |
| **GPT-5.4 Pro** | 272K+ | $30 / $180 | — | Premium reasoning variant |
| **Gemini 3.1 Pro** | **1M** (2M experimental) | $2 / $12 (>200K: $4/$18) | — | Natively multimodal; 8.4h audio / 900-page PDF in one prompt |
| **Gemini 3.1 Flash-Lite** | **1M** | **$0.25 / $1.50** | — | 363 tok/s; 2.5x faster TTFT; natively multimodal |

### Value / Open-Source Tier

| Model | Pricing (in/out per MTok) | Context | Key Strength |
|-------|--------------------------|---------|-------------|
| **DeepSeek V3.2** | $0.28 / $0.42 (90% cache discount) | 128K | MIT license; 685B params; MMLU 94.2% |
| **Llama 4 Scout** | Free (self-host) / $0.11/$0.34 (Groq) | **10M tokens** | Longest context of any model |
| **Llama 4 Maverick** | $0.27 / $0.85 | 1M | 402B params (17B active MoE); native multimodal |
| **Mistral Medium 3.1** | $0.40 / — | — | 90% Sonnet quality; self-hostable on 4 GPUs |

### Key Pricing Trend

LLM API prices dropped **~80% year-over-year**. Claude Opus dropped from $15/$75 to $5/$25 (67% reduction). Open-source models (DeepSeek, Llama 4) are fundamentally disrupting economics.

---

## 2. Claude 4.6 Deep Dive (Critical for LEARN-X)

### 1M Context at No Premium

As of March 13, 2026: A 900K-token request costs the same per-token as a 9K request. No long-context surcharge. Full rate limits apply at every length. 600 images/PDF pages per request (up from 100).

### Adaptive Thinking (Replaces budget_tokens)

Claude dynamically decides when and how much to think. Four effort levels:

| Level | Behavior | Best For |
|-------|----------|----------|
| **Max** | Always extended thinking, no depth constraints | Complex reasoning, research |
| **High** (default) | Almost always thinks, deep reasoning | General use |
| **Medium** | Best speed-cost-performance tradeoff | Agents, code generation |
| **Low** | Skips thinking for simple tasks | Fast responses, simple queries |

**LEARN-X implication:** Use `medium` for chat responses and quiz evaluation (speed matters). Use `high` for lesson generation and concept extraction (quality matters). Use `low` for flashcard generation (simple task).

### Prompt Caching (90% Savings)

| Operation | Cost (Opus 4.6) | Relative |
|-----------|-----------------|----------|
| Base input | $5/MTok | 1x |
| 5-min cache write | $6.25/MTok | 1.25x |
| 1-hour cache write | $10/MTok | 2x |
| **Cache hit** | **$0.50/MTok** | **0.1x (90% savings)** |

Up to 4 cache breakpoints per request. 20-block lookback window. 100% exact matching required — any change invalidates cached section and everything after it.

**LEARN-X implication:** Structure system prompts so persona context (stable across session) comes first as a cached block. Retrieved chunks and user message come after. Expected 50-90% cost reduction on persona portion across a study session.

### Context Compaction (Beta)

Server-side automatic context summarization. Enables effectively infinite conversations. Automatically summarizes earlier parts when approaching window limit.

**LEARN-X implication:** For chat sessions that go long (Socratic tutoring), context compaction prevents quality degradation without client-side management.

---

## 3. GPT-5.4 Deep Dive

### Tool Search (New)

Models receive a lightweight tool list and dynamically look up specific definitions on demand. **47% token reduction** on tool-heavy workflows while maintaining accuracy. Preserves cache efficiency for agent systems.

**LEARN-X implication:** When LEARN-X adds more tools (concept lookup, flashcard surfacing, widget rendering), Tool Search prevents the tool definition overhead from consuming context budget.

### Pricing Advantage

$2.50/M input is 50% cheaper than Claude Opus at $5/M. But output at $15/M matches Claude Sonnet. For input-heavy tasks (RAG with lots of context), GPT-5.4 is more cost-effective. For output-heavy tasks (lesson generation), Claude Sonnet matches at same cost.

---

## 4. Gemini 3.1 Deep Dive

### Flash-Lite: The Budget Powerhouse

$0.25/M input with 1M context and 363 tok/s output speed. This is the model for high-volume, low-stakes generation tasks. Natively multimodal — can process images, audio, video without separate pipelines.

**LEARN-X implication:** Gemini Flash-Lite at $0.25/M could handle flashcard generation, study guide generation, and simple quiz questions at 20x less cost than GPT-4o-mini. Test quality before committing.

### Gemini Embedding 2 (March 10, 2026)

First natively multimodal embedding model. Single 3,072D vector space for text, images, video, audio, and PDFs.

| Feature | Gemini Embedding 2 | text-embedding-3-large |
|---------|--------------------|-----------------------|
| Modalities | Text, image, video, audio, PDF | Text only |
| Dimensions | 3,072 (scalable via MRL) | 3,072 (fixed) |
| Languages | 100+ | Good but fewer |
| Token limit | 8,192 | 8,191 |
| Pricing | ~$0.20/MTok | $0.13/MTok |
| MTEB | Leader (multimodal) | 64.6 (text) |

Uses Matryoshka Representation Learning — can scale from 3,072 to 768 dimensions for cheaper storage with minimal quality loss.

**LEARN-X implication:** Not an urgent migration from text-embedding-3-large (it works fine). But for a fresh start, Gemini Embedding 2's multimodal capability means you could embed slide images, diagrams, and lecture audio in the same vector space as text chunks. This would dramatically improve retrieval for visual-heavy course materials (PPTX, diagrams, charts).

---

## 5. Embedding Models Comparison (March 2026)

| Model | MTEB Score | Pricing/MTok | Modality | Notes |
|-------|-----------|-------------|----------|-------|
| **Gemini Embedding 2** | Leader | ~$0.20 | Multimodal (5 types) | Brand new, March 10 |
| **Gemini Embedding 001** | 68.32 | ~$0.004 | Text | Extremely cheap |
| **Voyage-4** | 68.6 | $0.06 | Text | Strong general-purpose |
| **Cohere Embed v4** | 65.2 | $0.12 | Text + Images | Only multimodal commercial before Gemini 2 |
| **text-embedding-3-large** | 64.6 | $0.13 | Text | Current LEARN-X choice |
| **Qwen3-Embedding-8B** | 70.58 (multilingual) | Free (Apache 2.0) | Text | Best open-source |

**Recommendation for LEARN-X:** Stay with text-embedding-3-large for Phase 1 (it works, it's integrated). For Phase 2, evaluate Gemini Embedding 001 (cheap, better MTEB) or Gemini Embedding 2 (multimodal, future-proof). Migration requires re-embedding all chunks.

---

## 6. The Document Size Gate: Full-Context vs. RAG (Updated)

### The New Math

With Claude Opus 4.6 at $5/MTok input and 90% cache savings on repeated access:

| Scenario | Token Count | First Query Cost | Cached Query Cost |
|----------|------------|-----------------|-------------------|
| 50-page PDF | ~75K tokens | $0.375 | $0.0375 |
| 200-page textbook | ~300K tokens | $1.50 | $0.15 |
| 500-page textbook | ~750K tokens | $3.75 | $0.375 |
| 5 documents, 100 pages each | ~750K tokens | $3.75 | $0.375 |

Compare: RAG hybrid search costs ~$0.00008/query (embedding + search) but misses context. Full-context hits 100% of the material with 0% retrieval failure.

### When to Use Each Approach

| Approach | Use When | Cost Profile |
|----------|----------|-------------|
| **Full-context + caching** | Workspace has ≤ ~800K tokens total; student asks many questions about same material | High first query, very cheap subsequent |
| **RAG (hybrid search)** | Workspace exceeds 1M tokens; documents change frequently; multi-tenant with access control | Consistent low cost per query |
| **Hybrid: full-context for small + RAG for large** | Mixed workspace sizes | Optimal cost/quality balance |

### Updated Decision for LEARN-X

The original doc (13-ai-landscape-research) recommended an 80K token gate. With 1M context now at standard pricing, raise this significantly:

**New gate:** Under ~500K tokens → full-context with prompt caching. Over ~500K tokens → RAG pipeline. This covers most single-course workspaces in full-context mode.

**Implementation:**
1. During document processing, calculate total workspace token count
2. If under threshold: store full document text alongside chunks (for full-context mode)
3. If over threshold: proceed with chunking + hybrid search only
4. Chat route checks workspace mode and uses appropriate retrieval strategy

This is a significant architecture change from the original design. It simplifies Phase 1 (no RAG needed for most workspaces) while keeping the RAG pipeline ready for Phase 2 when workspaces grow.

---

## 7. Contextual RAG: The Upgrade for Large Workspaces

When a workspace exceeds the full-context threshold, Anthropic's Contextual Retrieval technique is the highest-impact improvement:

### How It Works

Before embedding a chunk, use an LLM to generate 50-100 tokens of context explaining where the chunk fits within the overall document. Prepend this to the chunk before embedding AND before BM25 indexing.

### Performance Numbers

- Contextual Embeddings alone: **35% reduction** in retrieval failures
- + Contextual BM25: **49% reduction**
- + Reranking on top: **67% reduction**

### Cost Optimization

Cache the full document once (25% premium), then read from cache for each chunk contextualization (90% discount). For a 200-page document (~300K tokens), contextualizing 500 chunks costs approximately:

- First chunk: $1.875 (cache write)
- Remaining 499 chunks: ~$0.15 each (cache read)
- Total: ~$76 one-time cost for dramatically better retrieval

**LEARN-X implication:** Add contextual chunking to the ingestion pipeline for workspaces that use RAG mode. The one-time cost is justified by the permanent improvement in retrieval quality for every subsequent query.

---

## 8. Agentic RAG Patterns (Phase 2 Roadmap)

### Corrective RAG (CRAG) — Highest Priority

Evaluates retrieved document quality before generation. Classifies chunks as Correct/Incorrect/Ambiguous. Three corrective paths: augment via web search, decompose-then-recompose, or filter irrelevant info.

**LEARN-X use:** After hybrid search returns top-K chunks, a lightweight evaluator grades relevance. If quality is poor, the system either expands the search or informs the student that the uploaded materials don't cover this topic well.

### Self-RAG — Quality Refinement

Model learns when to retrieve on-demand (not every query). Critiques its own retrieved results using reflection tokens. Better factuality and citation accuracy for long-form generation.

**LEARN-X use:** For lesson generation, Self-RAG could verify that generated content actually matches the source material — catching hallucinations before they reach the student.

### Adaptive RAG — Efficiency

Classifies query complexity to determine retrieval strategy. Simple queries skip retrieval entirely; complex queries trigger multi-hop reasoning.

**LEARN-X use:** "What is Newton's second law?" → no retrieval needed (student's material already in context). "How does Newton's second law relate to the engineering examples in chapter 7?" → multi-hop retrieval across concept graph + chunks.

---

## 9. Provider-Agnostic Model Routing (Updated)

### Recommended Routing Table (March 2026)

| Task | Primary Model | Fallback | Rationale |
|------|--------------|----------|-----------|
| **Lesson generation** | Claude Sonnet 4.6 (effort: high) | GPT-5.4 | Best structured output quality; prompt caching economics |
| **Concept extraction** | Claude Sonnet 4.6 (effort: high) | GPT-5.4 | Accuracy critical; structured output reliability |
| **Chat responses** | Claude Sonnet 4.6 (effort: medium) | GPT-5.4 | Speed + quality balance; context compaction for long sessions |
| **Quiz generation (MCQ)** | Gemini 3.1 Flash-Lite | GPT-4o-mini | $0.25/MTok; simple task; high volume |
| **Flashcard generation** | Gemini 3.1 Flash-Lite | GPT-4o-mini | Cheapest option; simple format |
| **Short-answer evaluation** | Claude Sonnet 4.6 (effort: low) | GPT-4o-mini | Fast judgment; low effort sufficient |
| **Study guide** | Gemini 3.1 Flash-Lite | GPT-4o-mini | Summarization; budget task |
| **Widget HTML generation** | Claude Sonnet 4.6 (effort: high) | GPT-5.4 | Code quality matters for interactive widgets |
| **Embeddings** | text-embedding-3-large | Gemini Embedding 001 | Current integration; migrate Phase 2 |
| **Full-context chat (small workspace)** | Claude Opus 4.6 (1M, cached) | — | Prompt caching economics; no retrieval overhead |

### Why Claude Sonnet 4.6 as Primary

At $3/$15 per MTok with 1M context and prompt caching (90% savings on cached portions), Sonnet offers the best cost/quality ratio for most educational tasks. Opus at $5/$25 is reserved for full-context mode where the extra quality justifies the premium.

### Implementation via Vercel AI SDK v6

```typescript
// Environment-based model routing — config change, not code change
const MODEL_ROUTES = {
  LESSON_GENERATION: process.env.LESSON_MODEL ?? 'claude-sonnet-4-6',
  CONCEPT_EXTRACTION: process.env.CONCEPT_MODEL ?? 'claude-sonnet-4-6',
  CHAT: process.env.CHAT_MODEL ?? 'claude-sonnet-4-6',
  FAST_GENERATION: process.env.FAST_MODEL ?? 'gemini-3.1-flash-lite',
  EMBEDDING: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-large',
  FULL_CONTEXT: process.env.FULL_CONTEXT_MODEL ?? 'claude-opus-4-6',
}
```

---

## 10. Prompt Caching Architecture (New Section)

### The Pattern for LEARN-X

Structure every LLM call to maximize cache hits:

```
[CACHE BLOCK 1 — stable across all users] (cache_control: ephemeral)
System instructions: You are LEARN-X, a learning assistant...
Component selection rules (for lesson generation)...
Widget HTML constraints...

[CACHE BLOCK 2 — stable per workspace] (cache_control: ephemeral)
Workspace document summary: This workspace covers [topic]...
Concept graph context: Key concepts are...

[CACHE BLOCK 3 — stable per user session] (cache_control: ephemeral)
Persona context (all 4 layers):
  Learner Profile: interests, aspirations...
  Pedagogical Profile: explanation style, depth...
  Performance Profile: weak concepts, error patterns...
  Framing Engine: current analogy domain, strength...

[VARIABLE — changes per query, NOT cached]
Retrieved chunks (for RAG mode) or full document (for full-context mode)
Conversation history (last 10 messages)
Current user message
```

### Expected Savings

- Block 1 (~1K tokens): Cached across ALL users. At scale, virtually free.
- Block 2 (~2K tokens): Cached across all students in same workspace. High reuse.
- Block 3 (~2K tokens): Cached across a single student's session (5-min TTL, refreshes on reuse).
- Variable (~4-8K tokens): Not cached. Full price.

For a student asking 20 questions in a session: first query costs ~$0.05, subsequent queries cost ~$0.008. That's 84% savings.

---

## 11. Token Budget System (New Section)

### Context Budget Allocator

Based on Google DeepMind's research on context allocation priorities:

| Component | Budget | Priority | Cacheable |
|-----------|--------|----------|-----------|
| System instructions | ~1.5K tokens (10%) | Highest | Yes — Block 1 |
| Persona context (4 layers) | ~2K tokens (13%) | High | Yes — Block 3 |
| Concept graph context | ~1.5K tokens (10%) | High | Yes — Block 2 |
| Retrieved chunks / full doc | ~4-6K tokens (30-40%) | Medium | Partial |
| Conversation history | ~3K tokens (20%) | Lower | No |
| Response headroom | Remaining (~2-4K) | — | — |

Total budget per query: ~16K tokens (well within limits, cost-efficient).

### Conversation History Management

- Last 10 messages: verbatim
- Messages 11-30: summarized into ~500 tokens
- Messages 31+: dropped (or use Claude's context compaction in long sessions)

---

## 12. Spaced Repetition: FSRS Still Gold Standard

FSRS-6 remains the best scheduling algorithm, trained on 700M+ reviews. No successor has emerged. The innovation is in what surrounds it:

### LECTOR Algorithm (2025)

LLM-Enhanced Concept-based Test-Oriented Repetition:
- Concept-based scheduling (tracks mastery per concept, not per card)
- LLM content generation for dynamic card content
- Test-oriented focus (optimizes for assessment performance)
- 90.2% success rate

**LEARN-X implication:** The current `ts-fsrs` integration is correct. Consider extending to concept-level scheduling (aggregate flashcard retention data per concept to inform the mastery record, which LEARN-X already does).

---

## 13. Knowledge Tracing: State of the Art

### Best Models (2026)

| Model | Approach | Strength |
|-------|----------|----------|
| **ANT-KT** | Neural Architecture Search for KT | Auto-discovers optimal transformer architecture per dataset |
| **EB-OOD DKT** | Energy-Based Out-of-Distribution | Detects unusual student behavior; prevents overconfident predictions |
| **Bayesian-Transformer hybrids** | Bayesian + transformer | Interpretable + powerful; explains "why did mastery change?" |
| **SAINT+** | Encoder-decoder transformer | Strong baseline with temporal features |

**LEARN-X implication:** For Phase 1, the current mastery update logic (quiz score + flashcard retention + lesson completion → mastery level) is sufficient. Phase 2 could introduce a lightweight transformer-based knowledge tracing model for more accurate mastery prediction. The key is having enough data first.

---

## 14. MCP (Model Context Protocol): Not Phase 1

97M monthly SDK downloads. 5,800+ servers. Backed by Anthropic, OpenAI, Google, Microsoft.

Relevant for LEARN-X when:
- Integrating with LMS systems (Canvas, Blackboard) in Phase 3
- Connecting to external document storage (Google Drive, OneDrive)
- Adding third-party tools

Not relevant for Phase 1 (standalone platform with internal data). Plan MCP support in Phase 3 architecture.

---

## 15. Vercel AI SDK v6 Patterns for LEARN-X

### Recommended Patterns

| Task | SDK Pattern | Notes |
|------|------------|-------|
| Chat streaming | `streamText` + `useChat` hook | Progressive rendering; standard pattern |
| Lesson generation | `generateObject` with Zod schema | Structured output; reliable schema adherence |
| Widget generation | `streamUI` with `renderWidget` tool | Already in LEARN-X's generative UI spec |
| Quiz evaluation | `generateObject` (sync) | Fast, structured judgment |
| Concept extraction | `generateObject` with triples schema | Already in pipeline spec |

### Cache-Aware Chat Route

```typescript
// System prompt structured for maximum cache hits
const systemPrompt = [
  // Block 1: Static instructions (cached across all users)
  { type: 'text', text: SYSTEM_INSTRUCTIONS, cache_control: { type: 'ephemeral' } },
  // Block 2: Workspace context (cached per workspace)
  { type: 'text', text: workspaceContext, cache_control: { type: 'ephemeral' } },
  // Block 3: Persona context (cached per user session)
  { type: 'text', text: personaContext, cache_control: { type: 'ephemeral' } },
  // Variable: Retrieved chunks + history (NOT cached)
  { type: 'text', text: retrievedChunks },
]
```

---

## 16. Architecture Decisions: What Changes from Original Docs

Based on all research, here are the concrete changes to LEARN-X's architecture:

### Change 1: Add Document Size Gate (Full-Context Mode)

**Original:** All documents go through chunk → embed → hybrid search pipeline.
**Updated:** Workspaces under ~500K tokens use full-context mode with Claude prompt caching. Skip chunking for chat (still chunk for concept extraction).

### Change 2: Provider-Agnostic Model Routing

**Original:** Hardcoded `gpt-4o` and `gpt-4o-mini` throughout.
**Updated:** Named model slots via environment variables. Primary stack shifts to Claude Sonnet 4.6 (best cache economics) + Gemini Flash-Lite (cheapest fast generation).

### Change 3: Prompt Caching Architecture

**Original:** Three-layer caching (provider-level + Helicone semantic + Redis exact-match).
**Updated:** Add explicit `cache_control` blocks to all system prompts. Structure prompts with stable-first ordering. Expected 50-90% cost reduction on per-query basis.

### Change 4: Token Budget System

**Original:** Implicit token management.
**Updated:** Explicit `ContextBudget` utility that allocates tokens across system instructions, persona, retrieved context, conversation history, and response headroom.

### Change 5: Conversation History Summarization

**Original:** Not specified.
**Updated:** Keep last 10 messages verbatim, summarize older into ~500 tokens. Use Claude's context compaction for extended Socratic sessions.

### Change 6: Contextual Chunking for RAG Mode

**Original:** Structure-aware chunking only.
**Updated:** Add Anthropic's contextual chunking — generate 50-100 tokens of context per chunk before embedding. 49% reduction in retrieval failures.

### Change 7: Effort-Level Routing

**Original:** Not available (pre-Claude 4.6).
**Updated:** Set Claude effort level per task type. High for lesson/concept extraction, medium for chat, low for flashcards/evaluation.

### Change 8: Embedding Model Evaluation Path

**Original:** text-embedding-3-large locked in.
**Updated:** Keep for Phase 1. Evaluate Gemini Embedding 001 (better MTEB, cheaper) or Gemini Embedding 2 (multimodal) for Phase 2. Migration requires full re-embedding.

---

## 17. Cost Projections (Updated March 2026)

### Per-Student Monthly Cost (Active Student: 100 queries, 5 lessons, 10 quizzes, 50 flashcard reviews)

| Component | Model | Cost |
|-----------|-------|------|
| Chat (100 queries, cached) | Claude Sonnet 4.6 | ~$0.80 |
| Lesson generation (5 lessons) | Claude Sonnet 4.6 | ~$0.45 |
| Quiz generation (10 quizzes) | Gemini Flash-Lite | ~$0.03 |
| Flashcard generation (5 sets) | Gemini Flash-Lite | ~$0.02 |
| Concept extraction (per workspace) | Claude Sonnet 4.6 | ~$0.15 |
| Embeddings (per workspace) | text-embedding-3-large | ~$0.10 |
| **Total per active student/month** | | **~$1.55** |

At $12/month student pricing, this is ~87% gross margin. With prompt caching at scale, per-query costs drop further.

---

## Sources

### Models (March 2026)
- [Claude 4.6 What's New — Anthropic Platform Docs](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-6)
- [Claude 1M Context GA Announcement](https://claude.com/blog/1m-context-ga)
- [Claude Adaptive Thinking — Anthropic Docs](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [Claude Effort Levels — Anthropic Docs](https://platform.claude.com/docs/en/build-with-claude/effort)
- [Claude Prompt Caching — Anthropic Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [GPT-5.4 Release — TechCrunch (March 5, 2026)](https://techcrunch.com/2026/03/05/openai-launches-gpt-5-4-with-pro-and-thinking-versions/)
- [GPT-5.4 Tool Search — Digital Applied](https://www.digitalapplied.com/blog/gpt-5-4-computer-use-tool-search-benchmarks-pricing)
- [Gemini 3.1 Flash-Lite — Google Blog (March 3, 2026)](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-lite/)
- [Gemini Embedding 2 — Google Blog (March 10, 2026)](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-embedding-2/)
- [Llama 4 Launch — VentureBeat](https://venturebeat.com/ai/metas-answer-to-deepseek-is-here-llama-4-launches/)
- [Embedding Model Leaderboard MTEB March 2026 — Awesome Agents](https://awesomeagents.ai/leaderboards/embedding-model-leaderboard-mteb-march-2026/)
- [Voyage-4 Model Family — Voyage AI Blog](https://blog.voyageai.com/2026/01/15/voyage-4/)
- [LLM Pricing Comparison 2026 — CloudIDR](https://www.cloudidr.com/blog/llm-pricing-comparison-2026)

### RAG & Retrieval
- [Anthropic Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
- [Agentic RAG Survey — arXiv 2501.09136](https://arxiv.org/abs/2501.09136)
- [A-RAG — arXiv 2602.03442](https://arxiv.org/abs/2602.03442)
- [Corrective RAG — arXiv 2401.15884](https://arxiv.org/abs/2401.15884)
- [Self-RAG — arXiv 2310.11511](https://arxiv.org/abs/2310.11511)
- [ColPali — arXiv 2407.01449](https://arxiv.org/abs/2407.01449)
- [LinearRAG — ICLR 2026](https://github.com/DEEP-PolyU/LinearRAG)
- [Late Chunking — arXiv 2409.04701](https://arxiv.org/abs/2409.04701)
- [Long Context vs RAG — SitePoint](https://www.sitepoint.com/long-context-vs-rag-1m-token-windows/)

### Context Engineering & Memory
- [Context Engineering — Gartner](https://www.gartner.com/en/articles/context-engineering)
- [Context Engineering — LangChain Blog](https://blog.langchain.com/the-rise-of-context-engineering/)
- [Mem0 AI Agent Memory — arXiv](https://arxiv.org/pdf/2504.19413)
- [Mem0 vs Zep Comparison 2026](https://dev.to/anajuliabit/mem0-vs-zep-vs-langmem-vs-memoclaw-ai-agent-memory-comparison-2026-1l1k)
- [Claude Context Compaction — InfoQ](https://www.infoq.com/news/2026/03/opus-4-6-context-compaction/)

### Education AI
- [Harvard AI Tutoring RCT 2025 — Nature](https://www.nature.com/articles/s41598-025-97652-6)
- [Duolingo Birdbrain Algorithm](https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain/)
- [FSRS Awesome Repository](https://github.com/open-spaced-repetition/awesome-fsrs)
- [LECTOR Algorithm — arXiv](https://arxiv.org/html/2508.03275v1)
- [ANT-KT Knowledge Tracing](https://www.mdpi.com/2079-9292/14/21/4148)
- [OECD Digital Education Outlook 2026](https://www.oecd.org/content/dam/oecd/en/publications/reports/2026/01/oecd-digital-education-outlook-2026_940e0dd8/062a7394-en.html)

### Frameworks & Tools
- [Vercel AI SDK v6](https://ai-sdk.dev/)
- [Building Effective Agents — Anthropic](https://www.anthropic.com/engineering/building-effective-agents)
- [MCP Year in Review 2025](https://www.pento.ai/blog/a-year-of-mcp-2025-review)
- [Bifrost Proxy — Maxim AI](https://www.getmaxim.ai/blog/bifrost-a-drop-in-llm-proxy-40x-faster-than-litellm/)
- [Prompt Caching Guide — ngrok](https://ngrok.com/blog/prompt-caching)
