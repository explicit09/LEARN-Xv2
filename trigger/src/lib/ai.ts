import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY ?? '',
})

export const MODEL_ROUTES = {
  CONCEPT_EXTRACTION: process.env.CONCEPT_MODEL ?? 'claude-sonnet-4-6',
  CHUNK_ENRICHMENT: process.env.ENRICHMENT_MODEL ?? 'gpt-5.4-nano',
  LESSON_GENERATION: process.env.LESSON_MODEL ?? 'claude-sonnet-4-6',
  SYLLABUS_PLANNING: process.env.SYLLABUS_MODEL ?? 'gpt-5.4-mini',
  QUIZ_GENERATION: process.env.QUIZ_MODEL ?? 'gemini-2.5-flash',
  FLASHCARD_GENERATION: process.env.FLASHCARD_MODEL ?? 'gemini-2.5-flash',
  FAST_GENERATION: process.env.FAST_MODEL ?? 'gemini-2.5-flash',
} as const

// Cost per token in USD (input, output)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3e-6, output: 15e-6 },
  'claude-haiku-4-5': { input: 0.8e-6, output: 4e-6 },
  'gpt-5.4-mini': { input: 0.4e-6, output: 1.6e-6 },
  'gpt-5.4-nano': { input: 0.1e-6, output: 0.4e-6 },
  'gemini-2.5-flash': { input: 0.075e-6, output: 0.3e-6 },
}

const DEFAULT_COST = { input: 3e-6, output: 15e-6 }

/** Route a model string to the correct AI SDK provider. */
export function getProvider(model: string) {
  if (model.startsWith('claude')) return anthropic
  if (model.startsWith('gpt')) return openaiProvider
  if (model.startsWith('gemini')) return google
  return openaiProvider
}

/** Infer provider name from model string. */
export function getProviderName(model: string): string {
  if (model.startsWith('claude')) return 'anthropic'
  if (model.startsWith('gpt')) return 'openai'
  if (model.startsWith('gemini')) return 'google'
  return 'openai'
}

/** Calculate cost in USD for a given model and token counts. */
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] ?? DEFAULT_COST
  return inputTokens * costs.input + outputTokens * costs.output
}
