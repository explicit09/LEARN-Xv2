import { describe, it, expect } from 'vitest'
import { orderConceptsByPrerequisites } from '../lib/concept-ordering'

type Concept = { id: string; name: string }
type Relation = { sourceConceptId: string; targetConceptId: string; relationType: string }

describe('orderConceptsByPrerequisites', () => {
  it('returns single concept unchanged', () => {
    const concepts: Concept[] = [{ id: 'a', name: 'A' }]
    const result = orderConceptsByPrerequisites(concepts, [])
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('a')
  })

  it('returns concepts with no relations in original order', () => {
    const concepts: Concept[] = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ]
    const result = orderConceptsByPrerequisites(concepts, [])
    expect(result).toHaveLength(3)
    expect(result.map((c) => c.id)).toEqual(['a', 'b', 'c'])
  })

  it('puts prerequisite before its dependent', () => {
    const concepts: Concept[] = [
      { id: 'b', name: 'B' }, // depends on a
      { id: 'a', name: 'A' }, // no deps
    ]
    const relations: Relation[] = [
      { sourceConceptId: 'a', targetConceptId: 'b', relationType: 'prerequisite' },
    ]
    const result = orderConceptsByPrerequisites(concepts, relations)
    const ids = result.map((c) => c.id)
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'))
  })

  it('handles chain: a → b → c (a first, c last)', () => {
    const concepts: Concept[] = [
      { id: 'c', name: 'C' },
      { id: 'b', name: 'B' },
      { id: 'a', name: 'A' },
    ]
    const relations: Relation[] = [
      { sourceConceptId: 'a', targetConceptId: 'b', relationType: 'prerequisite' },
      { sourceConceptId: 'b', targetConceptId: 'c', relationType: 'prerequisite' },
    ]
    const result = orderConceptsByPrerequisites(concepts, relations)
    const ids = result.map((c) => c.id)
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'))
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('c'))
  })

  it('ignores non-prerequisite relations (related, part_of, extends)', () => {
    const concepts: Concept[] = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]
    const relations: Relation[] = [
      { sourceConceptId: 'b', targetConceptId: 'a', relationType: 'related' },
    ]
    // 'related' should not impose ordering — a stays before b
    const result = orderConceptsByPrerequisites(concepts, relations)
    expect(result).toHaveLength(2)
    const ids = result.map((c) => c.id)
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'))
  })

  it('handles diamond dependency without duplicates: a → b, a → c, b + c → d', () => {
    const concepts: Concept[] = [
      { id: 'd', name: 'D' },
      { id: 'c', name: 'C' },
      { id: 'b', name: 'B' },
      { id: 'a', name: 'A' },
    ]
    const relations: Relation[] = [
      { sourceConceptId: 'a', targetConceptId: 'b', relationType: 'prerequisite' },
      { sourceConceptId: 'a', targetConceptId: 'c', relationType: 'prerequisite' },
      { sourceConceptId: 'b', targetConceptId: 'd', relationType: 'prerequisite' },
      { sourceConceptId: 'c', targetConceptId: 'd', relationType: 'prerequisite' },
    ]
    const result = orderConceptsByPrerequisites(concepts, relations)
    expect(result).toHaveLength(4) // no duplicates
    const ids = result.map((c) => c.id)
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'))
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('c'))
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('d'))
    expect(ids.indexOf('c')).toBeLessThan(ids.indexOf('d'))
  })

  it('handles cycle gracefully (returns all concepts without throwing)', () => {
    const concepts: Concept[] = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]
    const relations: Relation[] = [
      { sourceConceptId: 'a', targetConceptId: 'b', relationType: 'prerequisite' },
      { sourceConceptId: 'b', targetConceptId: 'a', relationType: 'prerequisite' },
    ]
    // Should not throw — returns all concepts even with cycle
    expect(() => orderConceptsByPrerequisites(concepts, relations)).not.toThrow()
    const result = orderConceptsByPrerequisites(concepts, relations)
    expect(result).toHaveLength(2)
  })

  it('returns empty array for empty input', () => {
    const result = orderConceptsByPrerequisites([], [])
    expect(result).toHaveLength(0)
  })
})
