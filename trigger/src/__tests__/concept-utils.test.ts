import { describe, expect, it } from 'vitest'

import { deduplicateConcepts, normalizeConceptName } from '../lib/concept-utils'

describe('normalizeConceptName', () => {
  it('lowercases the name', () => {
    expect(normalizeConceptName('Gradient Descent')).toBe('gradient descent')
  })

  it('trims leading and trailing whitespace', () => {
    expect(normalizeConceptName('  neural network  ')).toBe('neural network')
  })

  it('collapses multiple internal spaces', () => {
    expect(normalizeConceptName('  neural  network  ')).toBe('neural network')
  })

  it('handles already normalized input', () => {
    expect(normalizeConceptName('backpropagation')).toBe('backpropagation')
  })
})

describe('deduplicateConcepts', () => {
  it('merges concepts with the same normalized name', () => {
    const concepts = [
      { name: 'A', description: 'short', tags: ['tag1'] },
      { name: 'a', description: 'a longer description', tags: ['tag2'] },
    ]
    const result = deduplicateConcepts(concepts)
    expect(result).toHaveLength(1)
  })

  it('keeps the longer description when merging', () => {
    const concepts = [
      { name: 'Backprop', description: 'short', tags: [] },
      { name: 'backprop', description: 'a much longer description of backpropagation', tags: [] },
    ]
    const result = deduplicateConcepts(concepts)
    expect(result[0]!.description).toBe('a much longer description of backpropagation')
  })

  it('merges tags from all duplicates', () => {
    const concepts = [
      { name: 'NN', description: 'desc', tags: ['tag1', 'tag2'] },
      { name: 'nn', description: 'desc', tags: ['tag2', 'tag3'] },
    ]
    const result = deduplicateConcepts(concepts)
    expect(result[0]!.tags).toContain('tag1')
    expect(result[0]!.tags).toContain('tag2')
    expect(result[0]!.tags).toContain('tag3')
    expect(result[0]!.tags).toHaveLength(3) // no duplicates
  })

  it('preserves distinct concepts', () => {
    const concepts = [
      { name: 'A', description: 'desc a', tags: [] },
      { name: 'B', description: 'desc b', tags: [] },
    ]
    const result = deduplicateConcepts(concepts)
    expect(result).toHaveLength(2)
  })

  it('returns empty array for empty input', () => {
    expect(deduplicateConcepts([])).toEqual([])
  })
})
