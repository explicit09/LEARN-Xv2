import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { generateText } from 'ai'

import { openaiProvider, MODEL_ROUTES } from '../lib/ai'
import { chunkText } from '../lib/chunker'
import { classifyDocumentRole } from '../lib/classify-document-role'
import { detectSubject } from '../lib/subject-detection'
import { extractText } from '../lib/text-extraction'
import { extractFromUrl } from '../lib/url-extraction'

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

interface AiRequestFields {
  workspaceId: string
  model: string
  provider: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  latencyMs: number
  taskName: string
}

async function recordAiRequest(supabase: Supabase, f: AiRequestFields) {
  await supabase.from('ai_requests').insert({
    workspace_id: f.workspaceId,
    model: f.model,
    provider: f.provider,
    prompt_tokens: f.inputTokens,
    completion_tokens: f.outputTokens,
    cost_usd: f.costUsd,
    latency_ms: f.latencyMs,
    task_name: f.taskName,
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

      const metadata = (doc.metadata ?? {}) as { source_url?: string; is_youtube?: boolean }
      const isUrlSource = Boolean(metadata.source_url)
      const isYouTube = Boolean(metadata.is_youtube)
      let rawText: string

      if (isUrlSource) {
        // ── URL-sourced document ──────────────────────────────────
        await setProgress(supabase, jobId, 14)
        rawText = await extractFromUrl(metadata.source_url!, isYouTube)
        // Update title from page content if it was generic
        if (doc.title === 'YouTube Video' || doc.title === new URL(metadata.source_url!).hostname) {
          const titleMatch = rawText.slice(0, 500).match(/^#\s+(.+)$/m)
          if (titleMatch?.[1]) {
            await supabase
              .from('documents')
              .update({ title: titleMatch[1].slice(0, 200) })
              .eq('id', documentId)
          }
        }
      } else {
        // ── File-based document ───────────────────────────────────
        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from('documents')
          .download(doc.file_url as string)
        if (downloadError || !fileBlob) throw new Error('Failed to download document from storage')
        await setProgress(supabase, jobId, 14)
        rawText = await extractText(fileBlob, doc.file_type as string)
      }

      // ── Classify document role ──────────────────────────────────
      const roleResult = await classifyDocumentRole(rawText, doc.title as string, null)
      await supabase
        .from('documents')
        .update({ role: roleResult.role, role_confidence: roleResult.confidence })
        .eq('id', documentId)
      logger.info('Document role classified', {
        documentId,
        role: roleResult.role,
        confidence: roleResult.confidence,
      })

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

      // ── Trigger downstream pipeline ────────────────────────────
      const batchId = doc.upload_batch_id as string | null
      let shouldTriggerPipeline = true

      // Batch coordination: defer until all batch members are done
      if (batchId) {
        const { count } = await supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('upload_batch_id', batchId)
          .in('status', ['uploading', 'processing'])
        shouldTriggerPipeline = (count ?? 0) === 0
        if (!shouldTriggerPipeline) {
          logger.info('Batch not complete, deferring pipeline', { batchId, remaining: count })
        }
      }

      if (shouldTriggerPipeline) {
        try {
          const { extractConcepts } = await import('./extract-concepts')
          await extractConcepts.trigger({ workspaceId: doc.workspace_id as string })
        } catch {
          // No TRIGGER_SECRET_KEY in dev, skip
        }

        // If workspace already has a syllabus, trigger incremental update
        if (roleResult.role !== 'reference') {
          try {
            const { data: existingSyllabus } = await supabase
              .from('syllabuses')
              .select('id')
              .eq('workspace_id', doc.workspace_id)
              .eq('status', 'active')
              .limit(1)
              .maybeSingle()
            if (existingSyllabus) {
              const { updateSyllabus } = await import('./update-syllabus')
              await updateSyllabus.trigger({ workspaceId: doc.workspace_id as string, documentId })
            }
          } catch {
            // best-effort
          }
        }
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

interface EnrichedChunk {
  content: string
  enrichedContent: string
  chunkIndex: number
  tokenCount: number
}

const ENRICHMENT_CONCURRENCY = 10

// Contextual Retrieval enrichment — parallelized (GPT-5.4 nano, cheap + fast).
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

// Store chunks + embeddings atomically via RPC (falls back to sequential inserts).
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

  const embeddingVectors = embeddings.map((e) => `[${e.join(',')}]`)

  // Try atomic RPC first
  const { error: rpcError } = await supabase.rpc('insert_chunks_and_embeddings', {
    p_chunks: chunkRows,
    p_embeddings: embeddingVectors,
    p_model_version: 'text-embedding-3-large',
  })

  if (!rpcError) return

  // Fallback: sequential inserts (e.g. RPC not deployed yet)
  logger.warn('Atomic RPC unavailable, falling back to sequential inserts', {
    error: rpcError.message,
  })

  const { data: inserted, error: chunkError } = await supabase
    .from('chunks')
    .insert(chunkRows)
    .select('id')
  if (chunkError || !inserted) throw new Error('Failed to store chunks')

  const embeddingRows = inserted.map((c, i) => ({
    chunk_id: c.id,
    embedding: embeddingVectors[i],
    model_version: 'text-embedding-3-large',
  }))

  const { error: embError } = await supabase.from('chunk_embeddings').insert(embeddingRows)
  if (embError) throw new Error('Failed to store embeddings')
}
