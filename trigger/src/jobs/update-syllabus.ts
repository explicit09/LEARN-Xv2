import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import OpenAI from 'openai'
import { anthropic, MODEL_ROUTES } from '../lib/ai'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface UpdateSyllabusPayload {
  workspaceId: string
  documentId: string
}

type Supabase = ReturnType<typeof makeSupabase>
function makeSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface TopicRow {
  id: unknown
  title: unknown
  description: unknown
  embedding: unknown
  unit_id: unknown
}
interface HandlerOpts {
  workspaceId: string
  documentId: string
  docTitle: string
  topics: TopicRow[]
  syllabusId: string
  model: string
}

// ── Schemas ────────────────────────────────────────────────
const topicMappingSchema = z.object({ matchedTopicTitles: z.array(z.string()) })
const newTopicsSchema = z.object({
  topics: z.array(z.object({ title: z.string(), description: z.string() })),
})

// ── Cosine similarity ─────────────────────────────────────
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    magA = 0,
    magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    magA += a[i]! * a[i]!
    magB += b[i]! * b[i]!
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}
const SIMILARITY_THRESHOLD = 0.85

// ── Helpers ───────────────────────────────────────────────
async function recordAiRequest(
  supabase: Supabase,
  opts: {
    workspaceId: string
    model: string
    provider: string
    inputTokens: number
    outputTokens: number
    latencyMs: number
    costUsd: number
  },
) {
  await supabase.from('ai_requests').insert({
    workspace_id: opts.workspaceId,
    model: opts.model,
    provider: opts.provider,
    prompt_tokens: opts.inputTokens,
    completion_tokens: opts.outputTokens,
    cost_usd: opts.costUsd,
    latency_ms: opts.latencyMs,
    task_name: 'update-syllabus',
    prompt_version: 'v1',
  })
}

async function embedTexts(supabase: Supabase, workspaceId: string, texts: string[]) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  const start = Date.now()
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: texts,
    dimensions: 3072,
  })
  await recordAiRequest(supabase, {
    workspaceId,
    model: 'text-embedding-3-large',
    provider: 'openai',
    inputTokens: response.usage.prompt_tokens,
    outputTokens: 0,
    costUsd: response.usage.prompt_tokens * 0.00000013,
    latencyMs: Date.now() - start,
  })
  return response.data.map((d) => d.embedding)
}

async function fetchChunkSummaries(supabase: Supabase, documentId: string) {
  const { data: chunks } = await supabase
    .from('chunks')
    .select('section_heading, content')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true })
  return (chunks ?? [])
    .map((c) => (c.section_heading as string) || (c.content as string).slice(0, 200))
    .join('\n- ')
}

// ── Main task ─────────────────────────────────────────────
export const updateSyllabus = task({
  id: 'update-syllabus',
  retry: { maxAttempts: 2 },

  run: async (payload: UpdateSyllabusPayload) => {
    const { workspaceId, documentId } = payload
    const supabase = makeSupabase()
    const MODEL = MODEL_ROUTES.CONCEPT_EXTRACTION

    // 1. Fetch document role
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, title, role')
      .eq('id', documentId)
      .single()
    if (docError || !doc) {
      logger.error('Document not found', { documentId, error: docError?.message })
      return { error: 'document_not_found' }
    }
    const role = (doc.role as string) ?? 'primary'

    // 2. Reference docs skip syllabus
    if (role === 'reference') {
      logger.info('Reference doc — skipping syllabus update', { documentId })
      return { skipped: true, reason: 'reference_document' }
    }

    // 3. Fetch active syllabus + topics
    const { data: syllabus } = await supabase
      .from('syllabuses')
      .select('id, version')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!syllabus) {
      logger.info('No active syllabus — triggering full generation', { workspaceId })
      const { generateSyllabus } = await import('./generate-syllabus')
      await generateSyllabus.trigger({ workspaceId })
      return { delegated: 'generate-syllabus' }
    }

    const { data: existingTopics } = await supabase
      .from('syllabus_topics')
      .select('id, title, description, embedding, unit_id')
      .eq('syllabus_id', syllabus.id)

    const handlerOpts: HandlerOpts = {
      workspaceId,
      documentId,
      docTitle: doc.title as string,
      topics: existingTopics ?? [],
      syllabusId: syllabus.id as string,
      model: MODEL,
    }

    if (role === 'supplementary') return handleSupplementary(supabase, handlerOpts)
    return handlePrimary(supabase, handlerOpts)
  },
})

// ── Supplementary: map doc to existing topics ─────────────
async function handleSupplementary(supabase: Supabase, opts: HandlerOpts) {
  const { workspaceId, documentId, docTitle, topics, model } = opts
  const chunkSummaries = await fetchChunkSummaries(supabase, documentId)
  const topicList = topics.map((t) => t.title as string)

  const prompt = `You are mapping a supplementary document to existing syllabus topics.

Document title: "${docTitle}"
Document sections:
- ${chunkSummaries}

Existing syllabus topics:
${topicList.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Which existing topics does this document relate to? Return ONLY titles that strongly match. If none match, return an empty array.
Return JSON: { "matchedTopicTitles": string[] }`

  const start = Date.now()
  let mappingResult: z.infer<typeof topicMappingSchema>
  let usage = { inputTokens: 0, outputTokens: 0 }
  try {
    const result = await generateText({
      model: anthropic(model),
      output: Output.object({ schema: topicMappingSchema }),
      prompt,
    })
    mappingResult = result.output
    usage = {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    }
  } catch (err) {
    logger.error('LLM mapping call failed', { error: String(err) })
    return { mapped: false, error: 'llm_failed' }
  }

  await recordAiRequest(supabase, {
    workspaceId,
    model,
    provider: 'anthropic',
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd: usage.inputTokens * 0.000003 + usage.outputTokens * 0.000015,
    latencyMs: Date.now() - start,
  })

  const topicByTitle = new Map<string, TopicRow>()
  for (const t of topics) topicByTitle.set((t.title as string).toLowerCase(), t)

  const matchedIds: string[] = []
  const linkRows: Array<{ topic_id: string; document_id: string }> = []
  for (const title of mappingResult.matchedTopicTitles) {
    const topic = topicByTitle.get(title.toLowerCase())
    if (!topic) continue
    matchedIds.push(topic.id as string)
    linkRows.push({ topic_id: topic.id as string, document_id: documentId })
  }

  if (linkRows.length > 0) {
    await supabase.from('syllabus_topic_documents').upsert(linkRows, {
      onConflict: 'topic_id,document_id',
      ignoreDuplicates: true,
    })
    await supabase.rpc('flag_stale_lessons', {
      p_workspace_id: workspaceId,
      p_topic_ids: matchedIds,
    })
  }

  logger.info('Supplementary doc mapped', {
    workspaceId,
    documentId,
    topicCount: matchedIds.length,
  })
  return { mapped: true, topicCount: matchedIds.length }
}

// ── Primary: generate new topics + merge/create ───────────
async function handlePrimary(supabase: Supabase, opts: HandlerOpts) {
  const { workspaceId, documentId, docTitle, topics, syllabusId, model } = opts
  const chunkSummaries = await fetchChunkSummaries(supabase, documentId)
  const existingTitles = topics.map((t) => t.title as string)

  const prompt = `You are analyzing a primary course document to extract syllabus topics.

Document title: "${docTitle}"
Document sections:
- ${chunkSummaries}

Existing syllabus topics (avoid exact duplicates):
${existingTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Extract key learning topics from this document. Each topic should be a distinct teachable concept. Only include meaningfully new topics.
Return JSON: { "topics": [{ "title": string, "description": string }] }`

  const start = Date.now()
  let topicsResult: z.infer<typeof newTopicsSchema>
  let usage = { inputTokens: 0, outputTokens: 0 }
  try {
    const result = await generateText({
      model: anthropic(model),
      output: Output.object({ schema: newTopicsSchema }),
      prompt,
    })
    topicsResult = result.output
    usage = {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    }
  } catch (err) {
    logger.error('LLM topic generation failed', { error: String(err) })
    return { newTopics: 0, mergedTopics: 0, error: 'llm_failed' }
  }

  await recordAiRequest(supabase, {
    workspaceId,
    model,
    provider: 'anthropic',
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd: usage.inputTokens * 0.000003 + usage.outputTokens * 0.000015,
    latencyMs: Date.now() - start,
  })

  if (topicsResult.topics.length === 0) {
    logger.info('No new topics from primary doc', { workspaceId, documentId })
    return { newTopics: 0, mergedTopics: 0 }
  }

  // Generate embeddings for candidate titles
  const candidateEmbeddings = await embedTexts(
    supabase,
    workspaceId,
    topicsResult.topics.map((t) => t.title),
  )

  const topicsWithEmb = topics
    .filter((t) => t.embedding != null)
    .map((t) => ({
      id: t.id as string,
      title: t.title as string,
      embedding: t.embedding as number[],
    }))

  const unitIds = [...new Set(topics.map((t) => t.unit_id as string))]
  const targetUnitId = unitIds[unitIds.length - 1]
  let maxOrder = topics.length
  let newCount = 0,
    mergedCount = 0
  const affectedIds: string[] = []

  for (let ci = 0; ci < topicsResult.topics.length; ci++) {
    const candidate = topicsResult.topics[ci]!
    const candidateEmb = candidateEmbeddings[ci]!
    let merged = false

    for (const existing of topicsWithEmb) {
      if (cosineSimilarity(candidateEmb, existing.embedding) >= SIMILARITY_THRESHOLD) {
        await supabase
          .from('syllabus_topic_documents')
          .upsert(
            { topic_id: existing.id, document_id: documentId },
            { onConflict: 'topic_id,document_id', ignoreDuplicates: true },
          )
        affectedIds.push(existing.id)
        mergedCount++
        merged = true
        logger.info('Merged topic', { candidate: candidate.title, existing: existing.title })
        break
      }
    }
    if (merged || !targetUnitId) continue

    const { data: newTopic } = await supabase
      .from('syllabus_topics')
      .insert({
        unit_id: targetUnitId,
        syllabus_id: syllabusId,
        title: candidate.title,
        description: candidate.description,
        order_index: maxOrder++,
        embedding: `[${candidateEmb.join(',')}]`,
      })
      .select('id')
      .single()

    if (newTopic) {
      await supabase.from('syllabus_topic_documents').insert({
        topic_id: newTopic.id,
        document_id: documentId,
      })
      affectedIds.push(newTopic.id as string)
      newCount++
    }
  }

  if (affectedIds.length > 0) {
    await supabase.rpc('flag_stale_lessons', {
      p_workspace_id: workspaceId,
      p_topic_ids: affectedIds,
    })
  }

  logger.info('Primary doc processed', {
    workspaceId,
    documentId,
    newTopics: newCount,
    mergedTopics: mergedCount,
  })
  return { newTopics: newCount, mergedTopics: mergedCount }
}
