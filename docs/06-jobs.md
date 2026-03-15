# Background Jobs

## System: Trigger.dev v3

All long-running or AI-intensive work runs as Trigger.dev tasks. No exceptions (see Architecture Rule 1).

**Why Trigger.dev:**
- No execution timeouts — critical for processing 100-page documents
- Native Supabase webhook integration
- TypeScript-first, shares types with the rest of the monorepo
- Built-in retry, observability, and progress tracking
- Managed compute — no infrastructure to maintain

---

## Job Lifecycle

Every job has a corresponding row in the `jobs` table. This makes job state visible to:
- The client (progress bars, status indicators)
- Supabase Realtime subscriptions (live updates)
- Logging/debugging

```
pending → running → completed
                 → failed (retried up to maxAttempts)
         → cancelled (user-initiated)
```

### Progress broadcasting

Trigger.dev tasks call `updateJob()` at key checkpoints. The `jobs` table has a Supabase Realtime subscription on the client side, so the progress bar updates without polling.

```typescript
// Inside any Trigger.dev task
async function updateJob(jobId: string, update: Partial<JobUpdate>) {
  await db.update(jobs)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(jobs.id, jobId))
  // Supabase Realtime picks this up and pushes to subscribed clients
}
```

---

## Job Types

| job_type | Trigger | Input | Output |
|----------|---------|-------|--------|
| `document_processing` | document.confirmUpload mutation | `{ documentId, workspaceId, userId }` | Chunks + embeddings stored |
| `concept_extraction` | After document_processing completes | `{ workspaceId, documentId }` | Concepts + relations stored |
| `lesson_generation` | After concept_extraction completes | `{ workspaceId, userId, conceptIds? }` | Lessons stored |
| `quiz_generation` | quiz.generate mutation | `{ workspaceId, userId, lessonId?, conceptIds?, config }` | Quiz + questions stored |
| `flashcard_generation` | flashcard.generateSet mutation | `{ workspaceId, userId, sourceType, sourceId, cardCount }` | FlashcardSet + cards stored |
| `audio_generation` | audio.generate mutation | `{ workspaceId, userId, lessonId?, audioType, voiceConfig }` | audio_generations record with R2 URL |
| `study_plan_generation` | studyPlan.generate mutation | `{ workspaceId, userId, targetDate?, hoursPerDay? }` | StudyGuide stored |
| `syllabus_generation` | After document_processing completes (first doc in workspace) | `{ workspaceId, userId, documentId, batchId? }` | syllabuses + units + topics stored |
| `syllabus_update` | After document_processing completes (subsequent doc, role = primary/supplementary) | `{ workspaceId, userId, newDocumentId, syllabusId }` | New syllabus version; old marked superseded; affected lessons flagged |
| `syllabus_batch_synthesis` | After all docs in a batch reach 'completed' | `{ workspaceId, userId, documentIds, batchId }` | Holistic synthesis from all batch docs; single new syllabus version |

---

## Task Implementations

### process-document

The most critical pipeline. Runs in sequence, with fan-out at the end.

```typescript
export const processDocument = task({
  id: 'process-document',
  retry: { maxAttempts: 3, minTimeoutInMs: 2000, factor: 2 },

  run: async ({ documentId, workspaceId, userId, jobId }) => {
    try {
      await updateJob(jobId, { status: 'running', progress: 0.05, progressMessage: 'Fetching document...' })

      // 1. Get document from DB, download from Supabase Storage
      const document = await db.query.documents.findFirst({ where: eq(documents.id, documentId) })
      const fileBuffer = await downloadFromStorage(document.storagePath)

      await updateJob(jobId, { progress: 0.15, progressMessage: 'Parsing document...' })

      // 2. Parse via Reducto REST API (LlamaParse EOL May 2026 — Reducto is the replacement)
      const parsed = await reductoParseDocument(fileBuffer, document.fileType)
      // Returns: { text: string, pageCount: number, wordCount: number }

      await updateJob(jobId, { progress: 0.3, progressMessage: 'Chunking content...' })

      // 3. Chunk (structure-aware, 512 tokens, 15% overlap)
      const chunks = chunkDocument(parsed)
      // See ai-pipeline.md for chunking strategy

      await updateJob(jobId, { progress: 0.4, progressMessage: 'Enriching chunks with context...' })

      // 4. Contextual enrichment (Anthropic Contextual Retrieval — 67% retrieval improvement)
      // Generates 50-100 token context per chunk using Haiku with cached full document
      const enrichedChunks = await enrichChunksWithContext(chunks, parsed.text)

      await updateJob(jobId, { progress: 0.5, progressMessage: `Embedding ${chunks.length} chunks...` })

      // 5. Generate embeddings (batch, via Helicone → OpenAI)
      // Embeds enrichedContent but stores original content for citations
      const embeddings = await generateEmbeddings(enrichedChunks.map(c => c.enrichedContent))

      await updateJob(jobId, { progress: 0.65, progressMessage: 'Storing chunks and embeddings...' })

      // 6. Store chunks + embeddings in a single transaction
      // Note: halfvec cast required at 3072 dims — see 07-ai-pipeline.md
      await db.transaction(async (tx) => {
        const insertedChunks = await tx.insert(chunksTable).values(
          chunks.map((c) => ({ ...c, documentId, workspaceId }))
        ).returning()

        await tx.insert(chunkEmbeddings).values(
          insertedChunks.map((chunk, i) => ({
            chunkId: chunk.id,
            embedding: sql`${JSON.stringify(embeddings[i])}::halfvec`,
            modelVersion: 'text-embedding-3-large',
          }))
        )
      })

      // 7. Update document status + word count, and workspace total token count
      await db.update(documents)
        .set({ status: 'completed', wordCount: parsed.wordCount, pageCount: parsed.pageCount })
        .where(eq(documents.id, documentId))

      await db.update(workspaces)
        .set({ totalTokenCount: sql`total_token_count + ${parsed.tokenCount}` })
        .where(eq(workspaces.id, workspaceId))

      await updateJob(jobId, { progress: 0.75, progressMessage: 'Extracting concepts...' })

      // 7. Trigger concept extraction (waits for completion before continuing)
      await extractConcepts.triggerAndWait({ workspaceId, documentId, userId })

      await updateJob(jobId, { progress: 0.9, progressMessage: 'Generating lessons...' })

      // 8. Trigger lesson generation (fire-and-forget — user can watch progress separately)
      await generateLessons.trigger({ workspaceId, userId })

      await updateJob(jobId, { status: 'completed', progress: 1.0, progressMessage: 'Done' })

    } catch (error) {
      await db.update(documents).set({ status: 'failed', processingError: error.message })
        .where(eq(documents.id, documentId))
      await updateJob(jobId, { status: 'failed', errorMessage: error.message })
      throw error  // Let Trigger.dev handle retry
    }
  },
})
```

### extract-concepts

```typescript
export const extractConcepts = task({
  id: 'extract-concepts',
  retry: { maxAttempts: 2 },

  run: async ({ workspaceId, documentId, userId, jobId }) => {
    await updateJob(jobId, { status: 'running', progressMessage: 'Extracting concepts from document...' })

    // 1. Fetch all chunks for this document
    const chunks = await db.query.chunks.findMany({ where: eq(chunksTable.documentId, documentId) })

    // 2. Sample representative chunks (avoid processing 500 chunks; 50 is enough for concepts)
    const sampledChunks = sampleChunksForConceptExtraction(chunks)

    // 3. Extract (entity, relationship, entity) triples via LLM
    const triples = await extractConceptTriples(sampledChunks, workspaceId)
    // Prompt: see ai-pipeline.md §Concept Extraction

    // 4. Deduplicate + upsert concepts
    for (const triple of triples) {
      const [source, rel, target] = triple
      const [sourceConcept, targetConcept] = await Promise.all([
        upsertConcept(workspaceId, source),
        upsertConcept(workspaceId, target),
      ])
      await upsertConceptRelation(sourceConcept.id, targetConcept.id, rel)
    }

    // 5. Link chunks to their relevant concepts
    await linkChunksToConcepts(chunks, workspaceId)

    await updateJob(jobId, { status: 'completed', progress: 1.0 })
  },
})
```

### generate-lessons

```typescript
export const generateLessons = task({
  id: 'generate-lessons',
  retry: { maxAttempts: 2 },

  run: async ({ workspaceId, userId, jobId }) => {
    // 1. Fetch all concepts for workspace, ordered by dependency graph
    const orderedConcepts = await getConceptsInTopologicalOrder(workspaceId)

    // 2. Fetch user persona for personalization
    const persona = await getLatestPersona(userId)

    // 3. Generate lesson for each concept cluster (group related concepts)
    const conceptClusters = clusterConcepts(orderedConcepts)

    // 4. Generate in parallel batches (max 3 at a time to avoid rate limits)
    for (const batch of chunks(conceptClusters, 3)) {
      await Promise.all(batch.map(cluster =>
        generateSingleLesson({ cluster, workspaceId, userId, persona })
      ))
      await updateJob(jobId, { progress: calculateProgress() })
    }

    await updateJob(jobId, { status: 'completed', progress: 1.0 })
  },
})
```

### generate-quiz

```typescript
export const generateQuiz = task({
  id: 'generate-quiz',
  retry: { maxAttempts: 2 },

  run: async ({ workspaceId, userId, lessonId, conceptIds, config, jobId }) => {
    const { quizType, questionCount, questionTypes, difficultyLevel } = config

    // 1. Get relevant chunks via hybrid_search for each concept
    // 2. Get persona for difficulty calibration
    // 3. Generate questions via LLM (Bloom's-tagged, diverse types)
    // 4. Validate: check question quality, correct answer exists, explanation present
    // 5. Store quiz + questions
    // 6. Update job as completed with quizId in output_data
  },
})
```

### generate-flashcards

```typescript
export const generateFlashcards = task({
  id: 'generate-flashcards',
  retry: { maxAttempts: 2 },

  run: async ({ workspaceId, userId, sourceType, sourceId, cardCount, jobId }) => {
    // 1. Fetch source content (lesson markdown or workspace chunks)
    // 2. Generate front/back pairs via LLM
    //    - Front: question or incomplete statement
    //    - Back: concise answer (max 2 sentences)
    // 3. Link each card to its concept_id
    // 4. Store FlashcardSet + Flashcards with FSRS initial state (all 'new')
    // 5. Initialize card_count on the set
  },
})
```

### generate-syllabus

Runs after the first document in a workspace completes processing, or for a batch of documents once all have completed.

```typescript
export const generateSyllabus = task({
  id: 'generate-syllabus',
  retry: { maxAttempts: 2 },

  run: async ({ workspaceId, userId, documentIds, batchId, jobId }) => {
    await updateJob(jobId, { status: 'running', progressMessage: 'Classifying document roles...' })

    // 1. Fetch all documents in the set (single doc or batch)
    const documents = await db.query.documents.findMany({
      where: inArray(documents.id, documentIds),
    })

    // 2. Classify document role for each doc (primary | supplementary | reference)
    //    Uses LLM with doc metadata: title, page count, heading structure, first 2000 chars
    //    Confidence < 0.65 → default to 'supplementary', surface UI confirmation
    for (const doc of documents) {
      const { role, confidence } = await classifyDocumentRole(doc)
      await db.update(documents)
        .set({ role, roleConfidence: confidence })
        .where(eq(documents.id, doc.id))
    }

    await updateJob(jobId, { progress: 0.3, progressMessage: 'Generating syllabus outline...' })

    // 3. Primary docs drive the structure; supplementary docs enrich topics
    const primaryDocs = documents.filter(d => d.role === 'primary')
    const supplementaryDocs = documents.filter(d => d.role === 'supplementary')

    if (primaryDocs.length === 0) {
      // No primary doc — use supplementary docs to build a lightweight syllabus
      // or wait for user to designate a primary
      await updateJob(jobId, { status: 'completed', progress: 1.0, progressMessage: 'No primary document — syllabus pending primary source' })
      return
    }

    // 4. Extract outline from primary docs via LLM (headings + table of contents → unit/topic tree)
    const outline = await extractSyllabusOutline(primaryDocs)
    // Returns: { units: [{ title, description, topics: [{ title, description }] }] }

    // 5. Embed each topic for future deduplication/merging during incremental updates
    const topicTexts = outline.units.flatMap(u => u.topics.map(t => `${u.title}: ${t.title} — ${t.description}`))
    const topicEmbeddings = await generateEmbeddings(topicTexts)

    await updateJob(jobId, { progress: 0.6, progressMessage: 'Storing syllabus...' })

    // 6. Store syllabus in a transaction
    await db.transaction(async (tx) => {
      const [syllabus] = await tx.insert(syllabuses).values({
        workspaceId,
        version: 1,
        status: 'active',
        generatedBy: documentIds.length > 1 ? 'merged' : 'ai',
      }).returning()

      let embeddingIdx = 0
      for (const [unitIdx, unit] of outline.units.entries()) {
        const [dbUnit] = await tx.insert(syllabusUnits).values({
          syllabusId: syllabus.id,
          title: unit.title,
          description: unit.description,
          orderIndex: unitIdx,
        }).returning()

        for (const [topicIdx, topic] of unit.topics.entries()) {
          const [dbTopic] = await tx.insert(syllabusTopics).values({
            syllabusId: syllabus.id,
            unitId: dbUnit.id,
            title: topic.title,
            description: topic.description,
            orderIndex: topicIdx,
            embedding: sql`${JSON.stringify(topicEmbeddings[embeddingIdx++])}::halfvec`,
          }).returning()

          // Link primary documents to topics they cover
          await tx.insert(syllabusTopicDocuments).values(
            primaryDocs.map(d => ({ topicId: dbTopic.id, documentId: d.id, isPrimary: true }))
          )
        }
      }

      // 7. Map supplementary docs to matching topics (cosine similarity ≥ 0.85)
      if (supplementaryDocs.length > 0) {
        await mapSupplementaryDocsToTopics(tx, syllabus.id, supplementaryDocs)
      }
    })

    await updateJob(jobId, { status: 'completed', progress: 1.0, progressMessage: 'Syllabus ready' })
  },
})
```

### update-syllabus

Runs when a new document is added to a workspace that already has an active syllabus.

```typescript
export const updateSyllabus = task({
  id: 'update-syllabus',
  retry: { maxAttempts: 2 },

  run: async ({ workspaceId, userId, newDocumentId, syllabusId, jobId }) => {
    await updateJob(jobId, { status: 'running', progressMessage: 'Classifying new document...' })

    const newDoc = await db.query.documents.findFirst({ where: eq(documents.id, newDocumentId) })
    const { role, confidence } = await classifyDocumentRole(newDoc)
    await db.update(documents).set({ role, roleConfidence: confidence }).where(eq(documents.id, newDocumentId))

    if (role === 'reference') {
      // Reference docs are RAG-only — no syllabus update needed
      await updateJob(jobId, { status: 'completed', progress: 1.0, progressMessage: 'Reference document — no syllabus update needed' })
      return
    }

    if (role === 'supplementary') {
      // Map this doc to existing topics, flag affected lessons as source_updated
      await updateJob(jobId, { progress: 0.4, progressMessage: 'Mapping to existing syllabus topics...' })
      await mapSupplementaryDocToSyllabus(newDocumentId, syllabusId)
      // Flag affected lessons
      const affectedLessons = await getAffectedLessons(syllabusId, newDocumentId)
      await db.update(lessons)
        .set({ sourceUpdated: true })
        .where(inArray(lessons.id, affectedLessons.map(l => l.id)))
      await updateJob(jobId, { status: 'completed', progress: 1.0 })
      return
    }

    // role === 'primary' → full incremental merge
    await updateJob(jobId, { progress: 0.2, progressMessage: 'Extracting new document outline...' })

    const newOutline = await extractSyllabusOutline([newDoc])
    const newTopicTexts = newOutline.units.flatMap(u => u.topics.map(t => `${u.title}: ${t.title} — ${t.description}`))
    const newEmbeddings = await generateEmbeddings(newTopicTexts)

    // Fetch existing syllabus topic embeddings for comparison
    const existingTopics = await db.query.syllabusTopics.findMany({
      where: eq(syllabusTopics.syllabusId, syllabusId),
    })

    await updateJob(jobId, { progress: 0.5, progressMessage: 'Merging syllabus structure...' })

    // Merge logic (LightRAG approach):
    // For each new topic embedding: if cosine similarity ≥ 0.85 to existing topic → same topic
    //   → link new doc as supplementary source for that topic, flag lesson source_updated
    // If similarity < 0.85 → genuinely new topic → add to syllabus
    const { mergedTopics, newTopics, affectedTopicIds } = await mergeTopicLists(
      existingTopics,
      newOutline,
      newEmbeddings,
    )

    await db.transaction(async (tx) => {
      // Increment syllabus version: mark old as superseded, create new
      await tx.update(syllabuses).set({ status: 'superseded' }).where(eq(syllabuses.id, syllabusId))
      const [newSyllabus] = await tx.insert(syllabuses).values({
        workspaceId,
        version: sql`(SELECT MAX(version) FROM syllabuses WHERE workspace_id = ${workspaceId}) + 1`,
        status: 'active',
        generatedBy: 'merged',
      }).returning()

      // Clone merged topic tree into new syllabus version
      await cloneSyllabusVersion(tx, syllabusId, newSyllabus.id, mergedTopics, newTopics, newDocumentId)
    })

    // Flag affected lessons (topics that merged or were updated)
    if (affectedTopicIds.length > 0) {
      const affectedLessons = await getAffectedLessons(syllabusId, newDocumentId)
      await db.update(lessons)
        .set({ sourceUpdated: true })
        .where(inArray(lessons.id, affectedLessons.map(l => l.id)))
    }

    await updateJob(jobId, { status: 'completed', progress: 1.0, progressMessage: 'Syllabus updated' })
  },
})
```

### Batch coordination — how process-document triggers syllabus jobs

When `upload_batch_id` is set, `process-document` defers syllabus synthesis until all batch members complete:

```typescript
// Inside process-document, after concept extraction:

if (document.uploadBatchId) {
  // Check if all docs in this batch are now 'completed'
  const batchDocs = await db.query.documents.findMany({
    where: eq(documents.uploadBatchId, document.uploadBatchId),
  })
  const allComplete = batchDocs.every(d => d.status === 'completed')

  if (allComplete) {
    // Last doc in batch — trigger holistic syllabus synthesis
    const hasExistingSyllabus = await db.query.syllabuses.findFirst({
      where: and(eq(syllabuses.workspaceId, workspaceId), eq(syllabuses.status, 'active')),
    })

    if (hasExistingSyllabus) {
      await updateSyllabus.trigger({
        workspaceId, userId,
        newDocumentIds: batchDocs.map(d => d.id),
        syllabusId: hasExistingSyllabus.id,
      })
    } else {
      await generateSyllabus.trigger({
        workspaceId, userId,
        documentIds: batchDocs.map(d => d.id),
        batchId: document.uploadBatchId,
      })
    }
  }
  // else: not last doc — do nothing, the last one will trigger synthesis
} else {
  // Single-doc upload (no batch)
  const hasExistingSyllabus = ...
  if (hasExistingSyllabus) {
    await updateSyllabus.trigger({ workspaceId, userId, newDocumentId: documentId, syllabusId: ... })
  } else {
    await generateSyllabus.trigger({ workspaceId, userId, documentIds: [documentId] })
  }
}
```

---

## Trigger.dev Configuration

```typescript
// trigger/trigger.config.ts
import { defineConfig } from '@trigger.dev/sdk/v3'

export default defineConfig({
  project: 'proj_learn_x',
  runtime: 'node',
  logLevel: 'log',
  retries: {
    enabledInDev: false,
    default: { maxAttempts: 3, minTimeoutInMs: 1000, factor: 2 },
  },
  dirs: ['./src/jobs'],
})
```

```typescript
// trigger/src/client.ts
import { TriggerClient } from '@trigger.dev/sdk'

export const client = new TriggerClient({
  id: 'learn-x',
  apiKey: process.env.TRIGGER_SECRET_KEY!,
})
```

---

## Supabase Webhook → Trigger.dev

Document upload triggers the pipeline automatically:

```sql
-- Supabase webhook fires on storage object creation in the 'documents' bucket
-- Trigger.dev listens via: trigger.dev dashboard → Webhooks → add Supabase webhook

-- Alternatively, use a Supabase database webhook on documents table:
-- Event: INSERT on documents where status = 'pending'
-- This calls a Supabase Edge Function that triggers the Trigger.dev task
```

For reliability, prefer triggering from the `document.confirmUpload` tRPC mutation (explicit) over a webhook (implicit). Webhooks are a fallback if the mutation call fails.

---

## Error Handling Principles

1. **Always update the job record on failure** — the user deserves to know something went wrong
2. **Always update the source entity status on failure** — e.g., `documents.status = 'failed'` with `processingError` filled in
3. **Never swallow errors** — `throw error` after cleanup so Trigger.dev can retry
4. **After max retries, notify** — fire a `JOB_FAILED` learning event so the dashboard can surface the failure

---

## Local Development

```bash
# Start Trigger.dev local dev CLI (watches trigger/src/)
pnpm --filter trigger dev

# The CLI creates a local tunnel to your Next.js dev server
# Trigger.dev dashboard shows all task runs
```
