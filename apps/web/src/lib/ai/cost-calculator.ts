// Token cost per model in USD per million tokens (MTok).
// Source: official pricing pages as of 2026-03.

interface ModelPricing {
  inputPerMTok: number
  outputPerMTok: number
}

export const MODEL_COSTS: Record<string, ModelPricing> = {
  // Anthropic
  'claude-opus-4-6': { inputPerMTok: 15, outputPerMTok: 75 },
  'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-haiku-4-5-20251001': { inputPerMTok: 0.8, outputPerMTok: 4 },
  // OpenAI
  'gpt-4o': { inputPerMTok: 2.5, outputPerMTok: 10 },
  'gpt-4o-mini': { inputPerMTok: 0.15, outputPerMTok: 0.6 },
  // Embeddings
  'text-embedding-3-large': { inputPerMTok: 0.13, outputPerMTok: 0 },
  'text-embedding-3-small': { inputPerMTok: 0.02, outputPerMTok: 0 },
}

// Default to Sonnet pricing as a safe overestimate for unknown models
const DEFAULT_PRICING: ModelPricing = { inputPerMTok: 3, outputPerMTok: 15 }

/**
 * Calculate the cost of an LLM call in USD.
 */
export function calculateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = MODEL_COSTS[model] ?? DEFAULT_PRICING
  const inputCost = (promptTokens / 1_000_000) * pricing.inputPerMTok
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPerMTok
  return inputCost + outputCost
}
