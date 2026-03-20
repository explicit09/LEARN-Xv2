# Testing & Quality

## The Problem This Doc Solves

The architecture docs prevent structural drift. This doc prevents **quality drift** — the subtler failure mode where the system stays architecturally clean while the actual product gets worse. A lesson generator that passes all unit tests can still produce garbage lessons. A retrieval pipeline that has no failing tests can still return irrelevant chunks. Quality drift is silent until users leave.

This doc defines what "working correctly" means at every layer, and how to detect when it stops being true.

---

## Testing Layers

| Layer         | Tool                       | What it catches                                             |
| ------------- | -------------------------- | ----------------------------------------------------------- |
| Unit          | Vitest                     | Logic bugs in pure functions (FSRS, chunker, deduplication) |
| Contract      | Vitest + tRPC caller       | tRPC input/output schema violations, auth enforcement       |
| Integration   | Vitest + Supabase local    | DB queries, RLS policies, RPC functions, migrations         |
| AI evaluation | Langfuse + custom runners  | Prompt regressions, lesson quality drift, retrieval quality |
| Acceptance    | Playwright                 | End-to-end user flows                                       |
| Latency       | Custom + Vercel Analytics  | Endpoint SLA violations                                     |
| Cost          | ai_requests table + alerts | Per-operation overspend                                     |

---

## Unit Tests

### What gets unit tested

Only pure functions with no side effects. No mocking the database. No mocking HTTP calls. If a function requires a mock to test, it has the wrong boundary.

**Test these:**

```
packages/utils/src/fsrs.ts           — FSRS algorithm correctness
packages/utils/src/chunker.ts        — chunk boundaries, overlap, token counts
services/knowledge/concept-dedup.ts  — normalization, deduplication logic
services/ai/cost-calculator.ts       — token cost math per model
services/retrieval/rrf.ts            — Reciprocal Rank Fusion score calculation
packages/validators/src/*.ts         — Zod schema parse/reject behavior
apps/web/src/lib/ai/prompt-builders/ — prompt output shape (no LLM calls)
```

**Do not unit test:**

- tRPC procedures (integration test those against real Supabase local)
- Supabase queries (integration test those)
- LLM generation (evaluation test those)
- React components (acceptance test the flows, not the render tree)

### FSRS algorithm tests

The FSRS algorithm is the core of flashcard scheduling. A bug here silently breaks the retention system.

```typescript
// packages/utils/src/__tests__/fsrs.test.ts
import { describe, it, expect } from 'vitest'
import { scheduleCard, FSRSRating } from '../fsrs'

describe('FSRS scheduling', () => {
  it('new card rated Again stays in learning state', () => {
    const card = makeNewCard()
    const result = scheduleCard(card, FSRSRating.Again)
    expect(result.fsrs_state).toBe('learning')
    expect(result.fsrs_reps).toBe(0) // Again does not count as a rep
    expect(result.next_review_at).toBeDefined()
  })

  it('new card rated Good moves to review', () => {
    const card = makeNewCard()
    const after_learning = scheduleCard(card, FSRSRating.Good)
    const after_review = scheduleCard(after_learning, FSRSRating.Good)
    expect(after_review.fsrs_state).toBe('review')
    expect(after_review.fsrs_scheduled_days).toBeGreaterThan(0)
  })

  it('Easy rating schedules further out than Good', () => {
    const card = makeReviewCard()
    const good = scheduleCard(card, FSRSRating.Good)
    const easy = scheduleCard(card, FSRSRating.Easy)
    expect(easy.fsrs_scheduled_days).toBeGreaterThan(good.fsrs_scheduled_days)
  })

  it('Again on review card triggers relearning', () => {
    const card = makeReviewCard()
    const result = scheduleCard(card, FSRSRating.Again)
    expect(result.fsrs_state).toBe('relearning')
    expect(result.fsrs_lapses).toBe(card.fsrs_lapses + 1)
  })

  it('stability increases monotonically with Good ratings', () => {
    let card = makeNewCard()
    const stabilities: number[] = []
    for (let i = 0; i < 5; i++) {
      card = scheduleCard(card, FSRSRating.Good)
      stabilities.push(card.fsrs_stability)
    }
    for (let i = 1; i < stabilities.length; i++) {
      expect(stabilities[i]).toBeGreaterThan(stabilities[i - 1])
    }
  })
})
```

### Chunker tests

````typescript
// apps/web/src/server/services/ingestion/__tests__/chunker.test.ts
describe('structure-aware chunker', () => {
  it('respects heading boundaries — never splits a heading from its first paragraph', () => {
    const text = "## Newton's First Law\nAn object at rest stays at rest..."
    const chunks = chunkDocument({ text, targetTokens: 512 })
    expect(chunks[0].content).toContain("Newton's First Law")
    expect(chunks[0].sectionHeading).toBe("Newton's First Law")
  })

  it('keeps worked examples intact even if they exceed target token count', () => {
    const example = 'Example:\n' + 'step '.repeat(200) // deliberately long
    const chunks = chunkDocument({ text: example, targetTokens: 100 })
    const exampleChunk = chunks.find((c) => c.contentType === 'example')
    expect(exampleChunk).toBeDefined()
    // The whole example should be in one chunk, not split mid-step
    expect(exampleChunk!.content).toContain('step step step')
  })

  it('applies 15% overlap between adjacent text chunks', () => {
    const longText = 'word '.repeat(1000)
    const chunks = chunkDocument({ text: longText, targetTokens: 100 })
    // Check that consecutive chunks share ~15 tokens of content
    for (let i = 1; i < chunks.length; i++) {
      const overlap = findOverlap(chunks[i - 1].content, chunks[i].content)
      expect(overlap.tokenCount).toBeGreaterThan(10)
      expect(overlap.tokenCount).toBeLessThan(20)
    }
  })

  it('detects and tags content types correctly', () => {
    const code = '```python\ndef factorial(n):\n    return 1 if n <= 1 else n * factorial(n-1)\n```'
    const [chunk] = chunkDocument({ text: code, targetTokens: 512 })
    expect(chunk.contentType).toBe('code')
  })
})
````

### Concept deduplication tests

```typescript
describe('concept deduplication', () => {
  it('normalizes different casings of the same concept', () => {
    const triples = [
      { source: "Newton's Second Law", relation: 'prerequisite', target: 'Kinematics' },
      { source: "newton's second law", relation: 'related', target: 'Force' },
    ]
    const deduped = deduplicateTriples(triples)
    const secondLawConcepts = deduped.filter(
      (t) => normalize(t.source) === normalize("Newton's Second Law"),
    )
    expect(secondLawConcepts).toHaveLength(2) // kept both (different targets), but normalized
    expect(secondLawConcepts[0].source).toBe(secondLawConcepts[1].source) // same normalized form
  })

  it('removes exact duplicate triples', () => {
    const triples = [
      { source: 'Derivatives', relation: 'prerequisite', target: 'Limits' },
      { source: 'Derivatives', relation: 'prerequisite', target: 'Limits' },
    ]
    expect(deduplicateTriples(triples)).toHaveLength(1)
  })

  it('strips leading articles before normalization', () => {
    const a = normalize('The Krebs Cycle')
    const b = normalize('Krebs Cycle')
    expect(a).toBe(b)
  })
})
```

---

## Contract Tests (tRPC)

Contract tests verify that tRPC procedures enforce their input schemas, return the correct shapes, and respect auth middleware. They run against a real Supabase local instance — **no database mocking**.

```typescript
// apps/web/src/server/routers/__tests__/workspace.contract.test.ts
import { createCallerFactory } from '@trpc/server'
import { appRouter } from '../_app'
import { createTestContext } from '../../test-utils/context'
import { supabaseLocalClient } from '../../test-utils/supabase'

const createCaller = createCallerFactory(appRouter)

describe('workspace router — contract', () => {
  let authenticatedCtx: Awaited<ReturnType<typeof createTestContext>>
  let unauthenticatedCtx: Awaited<ReturnType<typeof createTestContext>>

  beforeEach(async () => {
    authenticatedCtx = await createTestContext({ authenticated: true })
    unauthenticatedCtx = await createTestContext({ authenticated: false })
  })

  afterEach(async () => {
    await supabaseLocalClient.from('workspaces').delete().eq('user_id', authenticatedCtx.userId)
  })

  describe('workspace.create', () => {
    it('rejects unauthenticated requests', async () => {
      const caller = createCaller(unauthenticatedCtx)
      await expect(caller.workspace.create({ name: 'Test' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })

    it('rejects empty name', async () => {
      const caller = createCaller(authenticatedCtx)
      await expect(caller.workspace.create({ name: '' })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      })
    })

    it('rejects name over 200 characters', async () => {
      const caller = createCaller(authenticatedCtx)
      await expect(caller.workspace.create({ name: 'x'.repeat(201) })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      })
    })

    it('returns a workspace matching the input', async () => {
      const caller = createCaller(authenticatedCtx)
      const result = await caller.workspace.create({
        name: 'My Course',
        description: 'Spring 2026',
      })
      expect(result.name).toBe('My Course')
      expect(result.description).toBe('Spring 2026')
      expect(result.status).toBe('active')
      expect(result.id).toMatch(/^[0-9a-f-]{36}$/)
    })
  })

  describe('workspace.get', () => {
    it('returns 403 when user does not own the workspace', async () => {
      const otherCtx = await createTestContext({ authenticated: true, newUser: true })
      const otherCaller = createCaller(otherCtx)
      const workspace = await otherCaller.workspace.create({ name: 'Not yours' })

      const caller = createCaller(authenticatedCtx)
      await expect(caller.workspace.get({ workspaceId: workspace.id })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })
  })
})
```

### Auth enforcement contract

Every `protectedProcedure` must reject unauthenticated requests. Generate this test automatically from the router list.

```typescript
// apps/web/src/server/routers/__tests__/auth-enforcement.test.ts
import { protectedProcedures } from '../_app' // export list of protected procedures

describe('auth enforcement — all protected procedures', () => {
  const unauthCtx = createTestContext({ authenticated: false })

  for (const [path, proc] of protectedProcedures) {
    it(`${path} rejects unauthenticated calls`, async () => {
      const caller = createCaller(unauthCtx)
      const fn = resolveProcedurePath(caller, path)
      await expect(fn({})).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  }
})
```

---

## Integration Tests (Database)

Run against `supabase start` (local Docker). Never against staging or production.

### RLS policy tests

```typescript
// supabase/tests/rls.test.ts
describe('Row Level Security', () => {
  describe('workspaces', () => {
    it("user A cannot read user B's workspaces", async () => {
      const userA = await createTestUser()
      const userB = await createTestUser()
      await supabase.from('workspaces').insert({ user_id: userB.id, name: 'B workspace' })

      const { data, error } = await supabase.auth
        .setSession(userA.session)
        .from('workspaces')
        .select()

      expect(data).toHaveLength(0)
      expect(error).toBeNull()
    })

    it('user can read their own workspaces', async () => {
      const user = await createTestUser()
      await supabase.from('workspaces').insert({ user_id: user.id, name: 'My workspace' })

      const { data } = await supabase.auth.setSession(user.session).from('workspaces').select()

      expect(data).toHaveLength(1)
      expect(data![0].name).toBe('My workspace')
    })
  })

  describe('chunks (cascade access)', () => {
    it("user cannot read chunks from another user's workspace", async () => {
      const { workspace } = await createWorkspaceWithChunks({ forOtherUser: true })
      const user = await createTestUser()

      const { data } = await supabase.auth
        .setSession(user.session)
        .from('chunks')
        .select()
        .eq('workspace_id', workspace.id)

      expect(data).toHaveLength(0)
    })
  })
})
```

### RPC function tests

```typescript
describe('hybrid_search RPC', () => {
  it('returns results scoped to the correct workspace', async () => {
    const { workspaceA, workspaceB } = await seedTwoWorkspacesWithDistinctContent()
    const queryEmbedding = await generateTestEmbedding('photosynthesis')

    const { data } = await supabase.rpc('hybrid_search', {
      p_workspace_id: workspaceA.id,
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_query_text: 'photosynthesis',
      p_match_count: 5,
    })

    // All returned chunks belong to workspaceA only
    const chunkIds = data.map((r) => r.chunk_id)
    const { data: chunks } = await supabase.from('chunks').select().in('id', chunkIds)
    expect(chunks!.every((c) => c.workspace_id === workspaceA.id)).toBe(true)
  })

  it('returns higher rank_score for exact phrase match than unrelated chunk', async () => {
    await seedChunks([
      { content: 'Mitochondria are the powerhouse of the cell', workspaceId: testWorkspaceId },
      { content: 'The Treaty of Versailles was signed in 1919', workspaceId: testWorkspaceId },
    ])
    const embedding = await generateTestEmbedding('mitochondria powerhouse')
    const { data } = await supabase.rpc('hybrid_search', {
      p_workspace_id: testWorkspaceId,
      p_query_embedding: JSON.stringify(embedding),
      p_query_text: 'mitochondria powerhouse',
      p_match_count: 2,
    })
    expect(data[0].content).toContain('Mitochondria')
    expect(data[0].rank_score).toBeGreaterThan(data[1].rank_score)
  })
})

describe('get_due_flashcards RPC', () => {
  it('returns relearning cards before learning cards before new cards', async () => {
    const userId = await createTestUser()
    await seedFlashcardsInAllStates(userId)

    const { data } = await supabase.rpc('get_due_flashcards', {
      p_user_id: userId,
      p_limit: 10,
    })

    const states = data.map((c) => c.fsrs_state)
    const relearningIdx = states.lastIndexOf('relearning')
    const learningIdx = states.indexOf('learning')
    const newIdx = states.indexOf('new')
    if (relearningIdx >= 0 && learningIdx >= 0) expect(relearningIdx).toBeLessThan(learningIdx)
    if (learningIdx >= 0 && newIdx >= 0) expect(learningIdx).toBeLessThan(newIdx)
  })

  it('does not return review cards scheduled for the future', async () => {
    const userId = await createTestUser()
    await insertFlashcard({
      userId,
      fsrs_state: 'review',
      next_review_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    })

    const { data } = await supabase.rpc('get_due_flashcards', { p_user_id: userId })
    expect(data).toHaveLength(0)
  })
})
```

### Migration verification

Every migration file must pass these checks before merging:

```typescript
// tooling/scripts/verify-migration.ts
// Run via: pnpm db:verify-migration <migration_file>

async function verifyMigration(migrationPath: string) {
  // 1. Apply migration to local DB
  await runMigration(migrationPath)

  // 2. Check no data was silently dropped
  const rowCounts = await getAllTableRowCounts()
  const previous = await loadPreviousRowCounts()
  for (const [table, count] of Object.entries(rowCounts)) {
    if (count < previous[table]) {
      throw new Error(`Migration dropped rows in ${table}: was ${previous[table]}, now ${count}`)
    }
  }

  // 3. Verify HNSW index still exists on chunk_embeddings
  const { data: indexes } = await supabase
    .from('pg_indexes')
    .select()
    .eq('tablename', 'chunk_embeddings')
    .eq('indexname', 'idx_chunk_embeddings_hnsw')
  if (!indexes?.length) throw new Error('HNSW index missing after migration')

  // 4. Run all RPC functions to confirm they still execute
  await supabase.rpc('hybrid_search', {
    /* minimal test args */
  })
  await supabase.rpc('get_due_flashcards', {
    /* minimal test args */
  })
  await supabase.rpc('get_workspace_mastery_summary', {
    /* minimal test args */
  })

  // 5. Verify no FK constraints are broken
  await checkForeignKeyIntegrity()
}
```

---

## Retrieval Quality

Silent quality drift in retrieval is the most dangerous failure mode. A retrieval bug doesn't throw an error — it just returns slightly worse results, and lesson and chat quality degrades invisibly.

### Golden dataset

Maintain a retrieval golden dataset in `tooling/eval/retrieval-golden.json`:

```json
[
  {
    "id": "biology-001",
    "workspace_seed": "cell-biology-textbook",
    "query": "What is the role of mitochondria in ATP synthesis?",
    "relevant_chunk_ids": ["chunk-uuid-1", "chunk-uuid-2"],
    "irrelevant_chunk_ids": ["chunk-uuid-3", "chunk-uuid-4"]
  },
  ...
]
```

Minimum 30 query/answer pairs. Sourced from real student questions on real study documents. Add 5 new pairs per new subject domain added.

### Retrieval metrics

```typescript
// tooling/eval/retrieval-quality.ts
// Run: pnpm eval:retrieval

interface RetrievalMetrics {
  mrr: number // Mean Reciprocal Rank — did the best chunk appear near the top?
  recall_at_5: number // Was at least one relevant chunk in the top 5?
  recall_at_10: number
  ndcg_at_10: number // Normalized Discounted Cumulative Gain
}

// Thresholds — if any metric drops below these, block the deploy
const RETRIEVAL_THRESHOLDS: RetrievalMetrics = {
  mrr: 0.65,
  recall_at_5: 0.75,
  recall_at_10: 0.85,
  ndcg_at_10: 0.7,
}

async function runRetrievalEval(): Promise<RetrievalMetrics> {
  const golden = loadGoldenDataset()
  const results: RetrievalResult[] = []

  for (const item of golden) {
    const embedding = await generateEmbeddings([item.query])
    const retrieved = await hybridSearch({
      workspaceId: item.workspaceId,
      queryEmbedding: embedding[0],
      queryText: item.query,
      limit: 10,
    })
    results.push({
      retrieved: retrieved.map((r) => r.chunk_id),
      relevant: item.relevant_chunk_ids,
    })
  }

  const metrics = computeMetrics(results)

  // Save to Langfuse for trend tracking
  await langfuse.score({ name: 'retrieval_mrr', value: metrics.mrr })
  await langfuse.score({ name: 'retrieval_recall_5', value: metrics.recall_at_5 })

  return metrics
}
```

**Run retrieval eval when:**

- Changing the chunking strategy
- Changing the embedding model or dimensions
- Changing `hybrid_search` vector/FTS weight ratio
- Adding or modifying HNSW index parameters

---

## Prompt Regression Tests

### Structure

Every prompt version has a corresponding eval set. When a prompt is updated, the eval runs against the new version and must meet the acceptance threshold before the version is promoted.

```
tooling/eval/
├── prompts/
│   ├── lesson-generation/
│   │   ├── golden-inputs.json       # 15 (concept, chunks, persona) inputs
│   │   ├── golden-rubric.ts         # Scoring rubric
│   │   └── results/
│   │       ├── v1-baseline.json     # Baseline scores
│   │       └── v2-candidate.json    # Scores for the candidate version
│   ├── quiz-generation/
│   │   ├── golden-inputs.json
│   │   ├── golden-rubric.ts
│   │   └── results/
│   └── concept-extraction/
│       ├── golden-inputs.json
│       ├── expected-concepts.json   # Expected concepts for each input
│       └── results/
```

### Lesson generation rubric

```typescript
// tooling/eval/prompts/lesson-generation/golden-rubric.ts

interface LessonEvalResult {
  is_grounded: boolean // References source material, not hallucinated
  component_variety: number // Count of distinct component types used
  has_non_text_component: boolean // At least one non-text section
  has_comprehension_check: boolean // mini_quiz or key_takeaway present
  persona_adapted: boolean // Detectable persona signals in content
  widget_html_valid: boolean // If interactive_widget present, HTML is valid
  word_count_in_range: boolean // 400–1500 words
}

// Thresholds — averaged over 15 golden inputs
const LESSON_THRESHOLDS = {
  grounded_rate: 0.9, // ≥90% of lessons must be grounded
  avg_component_variety: 3.5, // average ≥3.5 distinct component types
  non_text_rate: 0.95, // ≥95% of lessons have at least one non-text component
  comprehension_check_rate: 0.9,
  persona_adaptation_rate: 0.8,
  widget_html_valid_rate: 1.0, // All widget HTML must be valid
  word_count_in_range_rate: 0.95,
}
```

### Concept extraction eval

```typescript
// tooling/eval/prompts/concept-extraction/run.ts

async function evalConceptExtraction() {
  const inputs = loadGoldenInputs() // 15 document excerpts
  const expected = loadExpectedConcepts() // expected concept names per input

  let totalPrecision = 0
  let totalRecall = 0

  for (const [input, expectedConcepts] of zip(inputs, expected)) {
    const extracted = await extractConceptTriples(input.chunks, 'test-workspace')
    const extractedNames = new Set(
      extracted.flatMap((t) => [normalize(t.source), normalize(t.target)]),
    )
    const expectedSet = new Set(expectedConcepts.map(normalize))

    const intersection = [...extractedNames].filter((n) => expectedSet.has(n))
    totalPrecision += intersection.length / extractedNames.size
    totalRecall += intersection.length / expectedSet.size
  }

  const avgPrecision = totalPrecision / inputs.length
  const avgRecall = totalRecall / inputs.length

  // Must meet both thresholds
  if (avgPrecision < 0.6) throw new Error(`Concept extraction precision too low: ${avgPrecision}`)
  if (avgRecall < 0.7) throw new Error(`Concept extraction recall too low: ${avgRecall}`)
}
```

### Quiz correctness eval

```typescript
// tooling/eval/prompts/quiz-generation/correctness.ts
// AI-as-judge: use a separate LLM call to verify each generated question

async function evalQuizCorrectness(quiz: Quiz) {
  const issues: string[] = []

  for (const question of quiz.questions) {
    // Structural checks (no LLM needed)
    if (question.question_type === 'mcq') {
      const correctOptions = question.options?.filter((o) => o.is_correct)
      if (!correctOptions || correctOptions.length !== 1) {
        issues.push(`Question ${question.id}: MCQ must have exactly 1 correct answer`)
      }
    }
    if (!question.explanation) {
      issues.push(`Question ${question.id}: missing explanation`)
    }
    if (!question.bloom_level) {
      issues.push(`Question ${question.id}: missing Bloom's level`)
    }

    // Factual accuracy check (LLM-as-judge)
    const { object: judgment } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        is_factually_correct: z.boolean(),
        explanation_matches_answer: z.boolean(),
        issue: z.string().optional(),
      }),
      prompt: buildQuizJudgePrompt(question),
    })

    if (!judgment.is_factually_correct) {
      issues.push(`Question ${question.id}: factually incorrect — ${judgment.issue}`)
    }
    if (!judgment.explanation_matches_answer) {
      issues.push(`Question ${question.id}: explanation contradicts answer`)
    }
  }

  return { passed: issues.length === 0, issues }
}
```

**When to run quiz correctness eval:**

- In production after every `generate-quiz` job completes. Failed questions are flagged (not shown to the student) and logged for prompt improvement.

---

## Lesson Generation Acceptance Criteria

A generated lesson is acceptable for display only if it passes all of these checks. Run in the `generate-lessons` Trigger.dev task after generation, before storing.

```typescript
// trigger/src/jobs/generate-lessons.ts

async function validateLesson(lesson: GeneratedLesson): Promise<ValidationResult> {
  const issues: string[] = []

  // Structural checks
  if (lesson.sections.length < 4) {
    issues.push('Lesson has fewer than 4 sections — likely incomplete generation')
  }

  const componentTypes = new Set(lesson.sections.map((s) => s.type))
  if (componentTypes.size < 3) {
    issues.push(`Only ${componentTypes.size} distinct component types — expected ≥3`)
  }

  const hasNonText = lesson.sections.some((s) => s.type !== 'text')
  if (!hasNonText) {
    issues.push('All sections are plain text — lesson not using generative UI components')
  }

  const hasComprehensionCheck = lesson.sections.some(
    (s) => s.type === 'mini_quiz' || s.type === 'key_takeaway',
  )
  if (!hasComprehensionCheck) {
    issues.push('No mini_quiz or key_takeaway — lesson has no comprehension reinforcement')
  }

  // Widget HTML validation
  for (const section of lesson.sections) {
    if (section.type === 'interactive_widget' || section.type === 'data_visualization') {
      if (!isValidHtml(section.widget_html)) {
        issues.push(`Section "${section.title}": widget_html is not valid HTML`)
      }
      const externalUrls = extractExternalUrls(section.widget_html)
      const disallowed = externalUrls.filter((u) => !ALLOWED_CDNS.some((cdn) => u.startsWith(cdn)))
      if (disallowed.length > 0) {
        issues.push(
          `Section "${section.title}": widget uses disallowed CDN: ${disallowed.join(', ')}`,
        )
      }
    }
  }

  // Groundedness check: lesson must cite content from retrieved chunks
  const wordCount = countWords(lesson.sections.map((s) => JSON.stringify(s)).join(' '))
  if (wordCount < 300) {
    issues.push(`Lesson too short: ${wordCount} words, expected ≥300`)
  }
  if (wordCount > 2000) {
    issues.push(`Lesson too long: ${wordCount} words, expected ≤2000`)
  }

  return { passed: issues.length === 0, issues }
}

// If validation fails: regenerate once. If still fails: store as draft, flag for review.
```

---

## Latency Budgets

These are P95 targets. Measured via Vercel Analytics (frontend) and custom timing in `ai_requests` table (AI operations). Breaching a P95 budget for 3 consecutive days triggers an investigation ticket.

| Operation                          | P50 target | P95 target | Measured via                        |
| ---------------------------------- | ---------- | ---------- | ----------------------------------- |
| Page load (dashboard)              | 300ms      | 800ms      | Vercel Analytics                    |
| Page load (lesson reader)          | 400ms      | 1000ms     | Vercel Analytics                    |
| tRPC query (workspace.list)        | 80ms       | 200ms      | tRPC middleware timer               |
| tRPC query (flashcard.getDueCards) | 50ms       | 150ms      | tRPC middleware timer               |
| hybrid_search RPC                  | 100ms      | 300ms      | `ai_requests.latency_ms`            |
| Chat TTFT (time to first token)    | 600ms      | 1500ms     | AI SDK streaming headers            |
| Document upload → job queued       | 500ms      | 2000ms     | Job created_at − upload finished_at |
| Document processing (10-page PDF)  | 30s        | 90s        | Job completed_at − started_at       |
| Lesson generation (single concept) | 15s        | 45s        | Job completed_at − started_at       |

### Latency monitoring query

```sql
-- Run daily: flag any AI operations exceeding their P95 budget
SELECT
  task_type,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms) AS p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms,
  COUNT(*) AS request_count
FROM ai_requests
WHERE created_at > now() - interval '24 hours'
GROUP BY task_type
ORDER BY p95_ms DESC;
```

---

## Cost Budgets

Every LLM call is tracked in `ai_requests`. Budgets are enforced at two levels: per-operation (catch runaway prompts) and per-user-per-day (catch abuse).

### Per-operation cost targets

| Operation                       | Model                  | Expected cost | Hard limit (fail job if exceeded) |
| ------------------------------- | ---------------------- | ------------- | --------------------------------- |
| Lesson generation               | gpt-4o                 | $0.03–0.06    | $0.15                             |
| Quiz generation (10 questions)  | gpt-4o-mini            | $0.005–0.015  | $0.05                             |
| Flashcard generation (20 cards) | gpt-4o-mini            | $0.003–0.008  | $0.03                             |
| Concept extraction (50 chunks)  | gpt-4o                 | $0.02–0.05    | $0.15                             |
| Chat message (incl. retrieval)  | gpt-4o                 | $0.001–0.004  | $0.02                             |
| Batch embedding (1000 chunks)   | text-embedding-3-large | $0.04–0.08    | $0.20                             |
| Widget HTML generation          | gpt-4o                 | $0.01–0.03    | $0.10                             |

```typescript
// Cost guard — wraps every LLM call
async function assertCostWithinBudget(
  taskType: AiTaskType,
  estimatedTokens: number,
): Promise<void> {
  const estimatedCost = calculateCost(MODEL_FOR_TASK[taskType], estimatedTokens)
  const hardLimit = COST_HARD_LIMITS[taskType]

  if (estimatedCost > hardLimit) {
    throw new Error(
      `Cost guard: estimated $${estimatedCost.toFixed(4)} for ${taskType} exceeds hard limit $${hardLimit}`,
    )
  }
}
```

### Per-user daily budget

```typescript
// Checked at the start of every tRPC mutation that triggers a job
async function checkUserDailyBudget(userId: string): Promise<void> {
  const { data } = await supabase.rpc('get_user_daily_spend', { p_user_id: userId })

  const DAILY_LIMIT_CENTS = 50 // $0.50 per user per day (free tier)

  if (data.total_cost_cents > DAILY_LIMIT_CENTS) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Daily generation limit reached. Limit resets at midnight UTC.',
    })
  }
}
```

```sql
CREATE OR REPLACE FUNCTION get_user_daily_spend(p_user_id UUID)
RETURNS TABLE (total_cost_cents REAL) AS $$
  SELECT COALESCE(SUM(cost_cents), 0)::REAL AS total_cost_cents
  FROM ai_requests
  WHERE user_id = p_user_id
    AND created_at > date_trunc('day', now() AT TIME ZONE 'UTC');
$$ LANGUAGE sql STABLE;
```

### Monthly cost alerts

Track actual vs. expected cost per operation in the `ai_requests` table. A sudden 3× increase in `cost_cents` for `lesson_gen` (without a model change) signals a prompt that's generating far more tokens than expected — investigate immediately.

---

## CI Pipeline

```yaml
# .github/workflows/ci.yml

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test:unit # Vitest, no external services

  contract-tests:
    runs-on: ubuntu-latest
    services:
      supabase: { image: supabase/postgres:15, ... }
    steps:
      - run: pnpm supabase:migrate
      - run: pnpm test:contract # tRPC callers against local Supabase

  integration-tests:
    runs-on: ubuntu-latest
    services:
      supabase: { image: supabase/postgres:15, ... }
    steps:
      - run: pnpm supabase:migrate
      - run: pnpm test:integration # RLS, RPC functions, migration checks

  type-check:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm typecheck # tsc --noEmit across all packages

  lint:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm lint

  file-size-check:
    runs-on: ubuntu-latest
    steps:
      - run: bash tooling/scripts/check-file-sizes.sh # fail if any file > 400 lines

  # Prompt evals run nightly (not on every PR — too slow, too expensive)
  # .github/workflows/eval-nightly.yml
  retrieval-eval:
    schedule: '0 2 * * *' # 2am UTC
    steps:
      - run: pnpm eval:retrieval
        # Fails the run if metrics drop below thresholds

  lesson-eval:
    schedule: '0 3 * * *'
    steps:
      - run: pnpm eval:lessons
        # Runs 5 lesson generations (not all 15 golden — cost management)
        # Full 15-input eval only on prompt version bump
```

---

## Quality Dashboard (Operational)

The following queries run on the Supabase dashboard or an internal admin page to give a daily health read.

```sql
-- Yesterday's AI quality summary
SELECT
  task_type,
  COUNT(*)                                                      AS requests,
  ROUND(AVG(latency_ms))                                        AS avg_latency_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)) AS p95_latency_ms,
  ROUND(SUM(cost_cents)::numeric, 2)                            AS total_cost_cents,
  ROUND(AVG(cost_cents)::numeric, 4)                            AS avg_cost_cents,
  SUM(CASE WHEN was_cached THEN 1 ELSE 0 END)::float / COUNT(*) AS cache_hit_rate,
  SUM(CASE WHEN NOT validation_passed THEN 1 ELSE 0 END)        AS validation_failures
FROM ai_requests
WHERE created_at > now() - interval '24 hours'
GROUP BY task_type
ORDER BY total_cost_cents DESC;
```

**Red flags to investigate immediately:**

- `validation_failures` > 2 for any task type in a day
- `p95_latency_ms` > 2× the budget target
- `avg_cost_cents` > 2× the expected range (prompt runaway)
- `cache_hit_rate` drops below 15% (semantic cache misconfigured)
