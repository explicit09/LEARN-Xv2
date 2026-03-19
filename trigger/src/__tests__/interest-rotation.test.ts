import { describe, expect, it } from 'vitest'

import { selectInterestsForLesson, primaryAnalogyDomain } from '../lib/interest-rotation'

describe('selectInterestsForLesson', () => {
  const interests = ['basketball', 'cooking', 'music', 'hiking', 'photography']
  const userId = 'user-123'

  it('returns all interests when fewer than maxPick', () => {
    const result = selectInterestsForLesson(['basketball', 'cooking'], 0, userId)
    expect(result).toEqual(['basketball', 'cooking'])
  })

  it('returns maxPick interests when more are available', () => {
    const result = selectInterestsForLesson(interests, 0, userId, 3)
    expect(result).toHaveLength(3)
  })

  it('rotates interests across different lesson indices', () => {
    const lesson0 = selectInterestsForLesson(interests, 0, userId, 2)
    const lesson1 = selectInterestsForLesson(interests, 1, userId, 2)
    const lesson2 = selectInterestsForLesson(interests, 2, userId, 2)

    // Different lessons should get different primary interests
    const primaries = [lesson0[0], lesson1[0], lesson2[0]]
    const unique = new Set(primaries)
    expect(unique.size).toBeGreaterThan(1)
  })

  it('is deterministic — same inputs produce same output', () => {
    const a = selectInterestsForLesson(interests, 5, userId, 3)
    const b = selectInterestsForLesson(interests, 5, userId, 3)
    expect(a).toEqual(b)
  })

  it('varies by userId — different users get different rotations across lessons', () => {
    // Across 5 lessons, two different users should see at least one
    // different primary interest (extremely high probability)
    const primariesA = Array.from(
      { length: 5 },
      (_, i) => selectInterestsForLesson(interests, i, 'alice-uuid-111', 2)[0],
    )
    const primariesB = Array.from(
      { length: 5 },
      (_, i) => selectInterestsForLesson(interests, i, 'bob-uuid-222', 2)[0],
    )
    const anyDiff = primariesA.some((p, i) => p !== primariesB[i])
    expect(anyDiff).toBe(true)
  })

  it('returns empty for empty interests', () => {
    expect(selectInterestsForLesson([], 0, userId)).toEqual([])
  })
})

describe('primaryAnalogyDomain', () => {
  it('returns first interest', () => {
    expect(primaryAnalogyDomain(['cooking', 'music'])).toBe('cooking')
  })

  it('returns null for empty', () => {
    expect(primaryAnalogyDomain([])).toBeNull()
  })
})
