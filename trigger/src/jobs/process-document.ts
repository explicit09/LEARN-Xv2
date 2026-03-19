import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { generateText } from 'ai'

import { openaiProvider, MODEL_ROUTES } from '../lib/ai'
import { chunkText } from '../lib/chunker'
import { detectSubject } from '../lib/subject-detection'
import { extractText } from '../lib/text-extraction'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

interface ProcessDocumentPayload {
  documentId: string
  jobId: string
}

function makeSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function makeOpenAI() {
  return new OpenAI({ apiKey: OPENAI_API_KEY })
}

type Supabase = ReturnType<typeof makeSupabase>

async function setProgress(supabase: Supabase, jobId: string, progress: number) {
  await supabase.from('jobs').update({ progress, status: 'running' }).eq('id', jobId)
}

async function recordAiRequest(
  supabase: Supabase,
  fields: {
    workspaceId: string
    model: string
    provider: string
    inputTokens: number
    outputTokens: number
    costUsd: number
    latencyMs: number
    taskName: string
  },
) {
  await supabase.from('ai_requests').insert({
    workspace_id: fields.workspaceId,
    model: fields.model,
    provider: fields.provider,
    prompt_tokens: fields.inputTokens,
    completion_tokens: fields.outputTokens,
    cost_usd: fields.costUsd,
    latency_ms: fields.latencyMs,
    task_name: fields.taskName,
  })
}

export const processDocument = task({
  id: 'process-document',
  retry: { maxAttempts: 2 },

  run: async (payload: ProcessDocumentPayload) => {
    const { documentId, jobId } = payload
    const supabase = makeSupabase()
    const openai = makeOpenAI()

    try {
      // ── Fetch document ─────────────────────────────────────────
      await supabase.from('jobs').update({ status: 'running', progress: 0 }).eq('id', jobId)

      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()
      if (docError || !doc) throw new Error(`Document ${documentId} not found`)

      logger.info('Processing document', { documentId, title: doc.title as string })

      // ── Download ────────────────────────────────────────────────
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('documents')
        .download(doc.file_url as string)
      if (downloadError || !fileBlob) throw new Error('Failed to download document from storage')

      await setProgress(supabase, jobId, 14)

      // ── Parse ───────────────────────────────────────────────────
      const rawText = await extractText(fileBlob, doc.file_type as string)

      // ── Chunk + Detect Subject (parallel) ──────────────────────
      const [textChunks, subjectMeta] = await Promise.all([
        Promise.resolve(chunkText(rawText)),
        detectSubject(rawText, doc.title as string, OPENAI_API_KEY).catch((err) => {
          logger.warn('Subject detection failed', { error: String(err).slice(0, 200) })
          return null
        }),
      ])

      if (textChunks.length === 0) {
        throw new Error(
          `Document produced no chunks (raw text length: ${rawText.length}). ` +
            `File type: ${doc.file_type}. The file may be empty, image-only, or unsupported.`,
        )
      }

      // Store detected subject on document + workspace
      if (subjectMeta) {
        const now = new Date().toISOString()
        await supabase
          .from('documents')
          .update({ metadata: subjectMeta, updated_at: now })
          .eq('id', documentId)
        await supabase
          .from('workspaces')
          .update({
            settings: {
              primaryDomain: subjectMeta.domain,
              subfield: subjectMeta.subfield,
              pedagogicalFramework: subjectMeta.pedagogical_framework,
              scaffoldingDirection: subjectMeta.scaffolding_direction,
              componentEmphasis: subjectMeta.component_emphasis,
              detectedAt: now,
            },
          })
          .eq('id', doc.workspace_id)
        logger.info('Subject detected', { documentId, domain: subjectMeta.domain })
      }

      await setProgress(supabase, jobId, 42)

      // ── Enrich (Anthropic Contextual Retrieval) ──────────────────
      const enriched = await enrichChunksWithContext(supabase, textChunks, rawText, doc)

      await setProgress(supabase, jobId, 56)

      // ── Embed (text-embedding-3-large, 3072 dims) ───────────────
      const embeddings = await embedChunks(openai, supabase, enriched, doc)

      await setProgress(supabase, jobId, 70)

      // ── Store ───────────────────────────────────────────────────
      await storeChunksAndEmbeddings(supabase, doc, enriched, embeddings)

      await setProgress(supabase, jobId, 85)

      // Update document
      const totalTokens = enriched.reduce((sum, c) => sum + c.tokenCount, 0)
      await supabase
        .from('documents')
        .update({ status: 'ready', token_count: totalTokens, updated_at: new Date().toISOString() })
        .eq('id', documentId)

      await supabase.from('jobs').update({ status: 'completed', progress: 100 }).eq('id', jobId)

      // Best-effort: trigger concept extraction for this workspace
      try {
        const { extractConcepts } = await import('./extract-concepts')
        await extractConcepts.trigger({ workspaceId: doc.workspace_id as string })
      } catch {
        // No TRIGGER_SECRET_KEY in dev, skip
      }

      logger.info('Document processed', { documentId, chunks: textChunks.length, totalTokens })
      return { documentId, chunks: textChunks.length, totalTokens }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('process-document failed', { documentId, error: message })
      await supabase.from('jobs').update({ status: 'failed', error: message }).eq('id', jobId)
      await supabase
        .from('documents')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', documentId)
      throw err
    }
  },
})

// ── Text Extraction ──────────────────────────────────────────────────────────

// Text extraction moved to ../lib/text-extraction.ts

// ── Enrichment ────────────────────────────────────────────────────────────────

interface EnrichedChunk {
  content: string
  enrichedContent: string
  chunkIndex: number
  tokenCount: number
}

const ENRICHMENT_CONCURRENCY = 10

/**
 * Contextual Retrieval enrichment — parallelized.
 * Runs ENRICHMENT_CONCURRENCY calls at once using GPT-5.4 nano (cheap, fast).
 * Each call sends a trimmed document context + chunk, gets 1-2 sentence summary.
 */
async function enrichChunksWithContext(
  supabase: Supabase,
  chunks: { content: string; chunkIndex: number; tokenCount: number }[],
  fullDocumentText: string,
  doc: { title: string; workspace_id: string },
): Promise<EnrichedChunk[]> {
  const MODEL = MODEL_ROUTES.CHUNK_ENRICHMENT
  // Trim document to ~100K chars (~25K tokens) to stay within context limits
  const docContext = fullDocumentText.slice(0, 100_000)
  const results: EnrichedChunk[] = new Array(chunks.length)

  const enrichOne = async (chunk: (typeof chunks)[number], index: number) => {
    const start = Date.now()
    try {
      const { text, usage } = await generateText({
        model: openaiProvider(MODEL),
        maxOutputTokens: 120,
        messages: [
          {
            role: 'system',
            content: `You are a document analyst. Given a full document and a specific chunk from it, describe in 1-2 sentences what the chunk covers and how it fits into the broader document. Be specific. Do not summarize the chunk itself.`,
          },
          {
            role: 'user',
            content: `<document>\n${docContext}\n</document>\n\n<chunk>\n${chunk.content}\n</chunk>`,
          },
        ],
      })

      await recordAiRequest(supabase, {
        workspaceId: doc.workspace_id as string,
        model: MODEL,
        provider: 'openai',
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        costUsd: (usage.inputTokens ?? 0) * 0.0000002 + (usage.outputTokens ?? 0) * 0.00000125,
        latencyMs: Date.now() - start,
        taskName: 'process-document:enrich',
      })

      results[index] = {
        ...chunk,
        enrichedContent: `${text.trim()}\n\n${chunk.content}`,
      }
    } catch {
      results[index] = { ...chunk, enrichedContent: '' }
    }
  }

  // Process in batches of ENRICHMENT_CONCURRENCY
  for (let i = 0; i < chunks.length; i += ENRICHMENT_CONCURRENCY) {
    const batch = chunks.slice(i, i + ENRICHMENT_CONCURRENCY)
    await Promise.all(batch.map((chunk, j) => enrichOne(chunk, i + j)))
  }

  return results
}

// ── Embedding ─────────────────────────────────────────────────────────────────

async function embedChunks(
  openai: OpenAI,
  supabase: Supabase,
  chunks: EnrichedChunk[],
  doc: { workspace_id: string },
): Promise<number[][]> {
  const MODEL = 'text-embedding-3-large'
  const embeddings: number[][] = []
  const texts = chunks.map((c) => (c.enrichedContent ? c.enrichedContent : c.content))

  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100)
    const start = Date.now()
    const response = await openai.embeddings.create({
      model: MODEL,
      input: batch,
      dimensions: 3072,
    })
    await recordAiRequest(supabase, {
      workspaceId: doc.workspace_id as string,
      model: MODEL,
      provider: 'openai',
      inputTokens: response.usage.prompt_tokens,
      outputTokens: 0,
      costUsd: response.usage.prompt_tokens * 0.00000013,
      latencyMs: Date.now() - start,
      taskName: 'process-document:embed',
    })
    embeddings.push(...response.data.map((d) => d.embedding))
  }

  return embeddings
}

// ── Storage ───────────────────────────────────────────────────────────────────

async function storeChunksAndEmbeddings(
  supabase: Supabase,
  doc: { id: string; workspace_id: string },
  chunks: EnrichedChunk[],
  embeddings: number[][],
) {
  const chunkRows = chunks.map((c) => ({
    document_id: doc.id,
    workspace_id: doc.workspace_id,
    content: c.content,
    enriched_content: c.enrichedContent || null,
    chunk_index: c.chunkIndex,
    token_count: c.tokenCount,
  }))

  const { data: inserted, error: chunkError } = await supabase
    .from('chunks')
    .insert(chunkRows)
    .select('id')
  if (chunkError || !inserted) throw new Error('Failed to store chunks')

  const embeddingRows = inserted.map((c, i) => ({
    chunk_id: c.id,
    embedding: `[${(embeddings[i] ?? []).join(',')}]`,
    model_version: 'text-embedding-3-large',
  }))

  const { error: embError } = await supabase.from('chunk_embeddings').insert(embeddingRows)
  if (embError) throw new Error('Failed to store embeddings')
}
