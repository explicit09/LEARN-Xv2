import { describe, it, expect } from 'vitest'
import { calculateCostUsd, MODEL_COSTS } from '../cost-calculator'

describe('calculateCostUsd', () => {
  it('calculates cost for Claude Sonnet correctly', () => {
    const cost = calculateCostUsd('claude-sonnet-4-6', 1000, 500)
    // Sonnet: $3/MTok input, $15/MTok output
    expect(cost).toBeCloseTo(0.003 + 0.0075, 5)
  })

  it('calculates cost for Claude Haiku correctly', () => {
    const cost = calculateCostUsd('claude-haiku-4-5-20251001', 10000, 2000)
    // Haiku: $0.80/MTok input, $4/MTok output
    expect(cost).toBeCloseTo(0.008 + 0.008, 5)
  })

  it('calculates cost for GPT-4o correctly', () => {
    const cost = calculateCostUsd('gpt-4o', 5000, 1000)
    // GPT-4o: $2.50/MTok input, $10/MTok output
    expect(cost).toBeCloseTo(0.0125 + 0.01, 5)
  })

  it('returns 0 for zero tokens', () => {
    expect(calculateCostUsd('claude-sonnet-4-6', 0, 0)).toBe(0)
  })

  it('uses default pricing for unknown models', () => {
    const cost = calculateCostUsd('unknown-model', 1000, 1000)
    // Default: $3/MTok input, $15/MTok output (Sonnet pricing as safe default)
    expect(cost).toBeCloseTo(0.003 + 0.015, 5)
  })

  it('has pricing entries for all common models', () => {
    expect(MODEL_COSTS['claude-sonnet-4-6']).toBeDefined()
    expect(MODEL_COSTS['claude-haiku-4-5-20251001']).toBeDefined()
    expect(MODEL_COSTS['gpt-4o']).toBeDefined()
    expect(MODEL_COSTS['text-embedding-3-large']).toBeDefined()
  })
})
