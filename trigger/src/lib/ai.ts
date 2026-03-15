import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export const MODEL_ROUTES = {
  CONCEPT_EXTRACTION: process.env.CONCEPT_MODEL ?? 'claude-sonnet-4-6',
  CHUNK_ENRICHMENT: process.env.ENRICHMENT_MODEL ?? 'claude-haiku-4-5-20251001',
  LESSON_GENERATION: process.env.LESSON_MODEL ?? 'claude-sonnet-4-6',
} as const
