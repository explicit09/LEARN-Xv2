import { logger } from '@trigger.dev/sdk/v3'
import { generateText, Output } from 'ai'
import { z } from 'zod'

import { anthropic } from './ai'

// Flat section schema — LLM fills relevant fields per type
export const lessonSectionZ = z.object({
  type: z.string(),
  content: z.string(),
  term: z.string(),
  definition: z.string(),
  analogy: z.string(),
  title: z.string(),
  question: z.string(),
  explanation: z.string(),
  concept: z.string(),
  from_concept: z.string(),
  to_concept: z.string(),
  relation: z.string(),
  language: z.string(),
  code: z.string(),
  quote: z.string(),
  attribution: z.string(),
  description: z.string(),
  html: z.string(),
  points: z.array(z.string()),
  columns: z.array(z.string()),
  steps: z.array(z.object({ label: z.string(), description: z.string() })),
  rows: z.array(z.object({ label: z.string(), values: z.array(z.string()) })),
  mapping: z.array(z.object({ abstract: z.string(), familiar: z.string() })),
  options: z.array(z.object({ label: z.string(), text: z.string(), is_correct: z.boolean() })),
  annotations: z.array(z.object({ line: z.number(), note: z.string() })),
  events: z.array(z.object({ date: z.string(), label: z.string(), description: z.string() })),
})

export const lessonOutputSchema = z.object({
  title: z.string(),
  summary: z.string(),
  key_takeaways: z.array(z.string()),
  sections: z.array(lessonSectionZ),
})

export const EMBEDDING_DIMENSIONS = 3072

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY
  if (!key || texts.length === 0) return texts.map(() => [])
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  })
  if (!res.ok) {
    logger.warn('Embedding failed', { status: res.status })
    return texts.map(() => [])
  }
  const json = (await res.json()) as {
    data: { embedding: number[]; index: number }[]
  }
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}

const MAX_ATTEMPTS = 2

export interface GenerateResult {
  object: z.infer<typeof lessonOutputSchema>
  inputTokens: number
  outputTokens: number
}

export async function generateLessonWithRetry(
  model: string,
  prompt: string,
): Promise<GenerateResult> {
  let lastErr: unknown
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const { output: object, usage } = await generateText({
        model: anthropic(model),
        output: Output.object({ schema: lessonOutputSchema }),
        prompt,
      })
      return {
        object,
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
      }
    } catch (err) {
      lastErr = err
      logger.warn(`generateObject attempt ${attempt + 1} failed, retrying`, {
        err: String(err),
      })
    }
  }
  throw lastErr
}

/** Deterministic interest rotation — hash(userId, topicId, index) mod interests */
export function selectAnalogyDomain(
  interests: string[],
  userId: string,
  topicId: string,
  orderIndex: number,
): string | undefined {
  if (!interests || interests.length === 0) return undefined
  // Simple hash: sum char codes of userId + topicId + orderIndex
  let hash = orderIndex
  for (const ch of userId + topicId) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  }
  return interests[hash % interests.length]
}

export interface RawChunk {
  chunk_id: string
  content: string
  enriched_content?: string
  document_id: string
  chunk_index: number
  page_number: number
}

export interface TopicWithContext {
  topicId: string
  topicTitle: string
  unitTitle: string
  orderIndex: number
  globalIndex: number
  description: string | null
  learningObjectives: string[]
  continuityNotes: string | null
  conceptIds: string[]
  conceptNames: string[]
  conceptDescriptions: string[]
}

// Process all topics concurrently — API rate limits are the real throttle
export const BATCH_SIZE = 10

export function buildConceptQuery(topic: TopicWithContext): string {
  return topic.conceptNames
    .map((name, i) => {
      const desc = topic.conceptDescriptions[i]
      return desc ? `${name}: ${desc}` : name
    })
    .join('; ')
}

export function buildSourceMapping(rawChunks: RawChunk[], docTitleMap: Map<string, string>) {
  return rawChunks.map((c, i) => ({
    citationId: i + 1,
    chunkId: c.chunk_id,
    documentId: c.document_id,
    documentTitle: docTitleMap.get(c.document_id) ?? 'Document',
    pageNumber: c.page_number ?? null,
    chunkIndex: c.chunk_index ?? null,
    preview: c.content.slice(0, 120),
  }))
}
