import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { generateText } from 'ai'

import { anthropic, MODEL_ROUTES } from '../lib/ai'
import { chunkText } from '../lib/chunker'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const REDUCTO_API_KEY = process.env.REDUCTO_API_KEY
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
    promptTokens: number
    completionTokens: number
    costUsd: number
    latencyMs: number
    taskName: string
  },
) {
  await supabase.from('ai_requests').insert({
    workspace_id: fields.workspaceId,
    model: fields.model,
    provider: fields.provider,
    prompt_tokens: fields.promptTokens,
    completion_tokens: fields.completionTokens,
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
      let rawText: string
      if (REDUCTO_API_KEY && doc.file_type === 'pdf') {
        rawText = await parseWithReducto(fileBlob, doc.title as string)
      } else {
        rawText = await fileBlob.text()
      }

      await setProgress(supabase, jobId, 28)

      // ── Chunk ───────────────────────────────────────────────────
      const textChunks = chunkText(rawText)
      if (textChunks.length === 0) throw new Error('Document produced no chunks')

      await setProgress(supabase, jobId, 42)

      // ── Enrich (Anthropic Contextual Retrieval) ──────────────────
      // Cache full document once; Claude Haiku generates context per chunk
      const enriched = await enrichChunksWithContext(
        supabase,
        textChunks,
        rawText,
        doc,
      )

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

// ── Helpers ────────────────────────────────────────────────────────────────

async function parseWithReducto(fileBlob: Blob, title: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', fileBlob, `${title}.pdf`)
  const res = await fetch('https://v2.reductoai.com/parse', {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDUCTO_API_KEY}` },
    body: formData,
  })
  if (!res.ok) throw new Error(`Reducto parse failed: ${res.statusText}`)
  const json = (await res.json()) as { result?: { text?: string }; text?: string }
  return json.result?.text ?? json.text ?? ''
}

interface EnrichedChunk {
  content: string
  enrichedContent: string
  chunkIndex: number
  tokenCount: number
}

/**
 * Anthropic Contextual Retrieval enrichment.
 * Caches the full document text once (cache_write), then for each chunk
 * calls Claude Haiku reading from cache (cache_read) to generate a
 * 50-100 token context summary. Prepends context to enrichedContent.
 */
async function enrichChunksWithContext(
  supabase: Supabase,
  chunks: { content: string; chunkIndex: number; tokenCount: number }[],
  fullDocumentText: string,
  doc: { title: string; workspace_id: string },
): Promise<EnrichedChunk[]> {
  const MODEL = MODEL_ROUTES.CHUNK_ENRICHMENT
  const results: EnrichedChunk[] = []

  // Haiku cost: ~$0.00000008/token cached read, $0.000004/token output
  const CACHE_READ_COST_PER_TOKEN = 0.00000008
  const OUTPUT_COST_PER_TOKEN = 0.000004

  for (const chunk of chunks) {
    const start = Date.now()
    try {
      const { text, usage } = await generateText({
        model: anthropic(MODEL),
        maxTokens: 120,
        messages: [
          {
            role: 'user',
            content: [
              // Block 1: full document — cached after first chunk (ephemeral, ~5 min TTL)
              {
                type: 'text',
                text: `<document>\n${fullDocumentText}\n</document>`,
                experimental_providerMetadata: {
                  anthropic: { cacheControl: { type: 'ephemeral' } },
                },
              },
              // Block 2: the specific chunk — not cached (changes per iteration)
              {
                type: 'text',
                text: `Here is a chunk from the document above:\n<chunk>\n${chunk.content}\n</chunk>\n\nIn 1-2 sentences, describe what this chunk is about and how it fits into the broader document. Be specific. Do not summarize the chunk itself.`,
              },
            ],
          },
        ],
      })

      const promptTokens = usage.promptTokens
      const completionTokens = usage.completionTokens
      await recordAiRequest(supabase, {
        workspaceId: doc.workspace_id as string,
        model: MODEL,
        provider: 'anthropic',
        promptTokens,
        completionTokens,
        costUsd:
          promptTokens * CACHE_READ_COST_PER_TOKEN +
          completionTokens * OUTPUT_COST_PER_TOKEN,
        latencyMs: Date.now() - start,
        taskName: 'process-document:enrich',
      })

      results.push({
        ...chunk,
        // Prepend context summary — used for embedding and FTS (stored as enriched_content)
        enrichedContent: `${text.trim()}\n\n${chunk.content}`,
      })
    } catch {
      results.push({ ...chunk, enrichedContent: '' })
    }
  }

  return results
}

async function embedChunks(
  openai: OpenAI,
  supabase: Supabase,
  chunks: EnrichedChunk[],
  doc: { workspace_id: string },
): Promise<number[][]> {
  const MODEL = 'text-embedding-3-large'
  const embeddings: number[][] = []
  // Embed enrichedContent when available (includes context prefix), fallback to content
  const texts = chunks.map((c) =>
    c.enrichedContent ? c.enrichedContent : c.content,
  )

  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100)
    const start = Date.now()
    const response = await openai.embeddings.create({ model: MODEL, input: batch, dimensions: 3072 })
    await recordAiRequest(supabase, {
      workspaceId: doc.workspace_id as string,
      model: MODEL,
      provider: 'openai',
      promptTokens: response.usage.prompt_tokens,
      completionTokens: 0,
      costUsd: response.usage.prompt_tokens * 0.00000013,
      latencyMs: Date.now() - start,
      taskName: 'process-document:embed',
    })
    embeddings.push(...response.data.map((d) => d.embedding))
  }

  return embeddings
}

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

  // chunk_embeddings: chunk_id is PK, no workspace_id, include model_version
  const embeddingRows = inserted.map((c, i) => ({
    chunk_id: c.id,
    embedding: `[${(embeddings[i] ?? []).join(',')}]`,
    model_version: 'text-embedding-3-large',
  }))

  const { error: embError } = await supabase.from('chunk_embeddings').insert(embeddingRows)
  if (embError) throw new Error('Failed to store embeddings')
}
