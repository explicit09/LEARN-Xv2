import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'

// Direct API providers — swap to Helicone proxy once signups reopen
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
})

// Model routing — override via environment variables for A/B testing or cost control
export const MODEL_ROUTES = {
  LESSON_GENERATION: process.env.LESSON_MODEL ?? 'claude-sonnet-4-6',
  CONCEPT_EXTRACTION: process.env.CONCEPT_MODEL ?? 'claude-sonnet-4-6',
  CHAT: process.env.CHAT_MODEL ?? 'claude-sonnet-4-6',
  FAST_GENERATION: process.env.FAST_MODEL ?? 'gemini-2.0-flash-lite',
  CHUNK_ENRICHMENT: process.env.ENRICHMENT_MODEL ?? 'claude-haiku-4-5-20251001',
  FULL_CONTEXT_CHAT: process.env.FULL_CTX_MODEL ?? 'claude-opus-4-6',
  EMBEDDING: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-large',
} as const
