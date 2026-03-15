import { describe, expect, it } from 'vitest'

import { upsertPersonaSchema } from '../persona'

const valid = {
  interests: ['basketball', 'finance'],
  motivationalStyle: 'mastery' as const,
  tonePreference: 'balanced' as const,
  difficultyPreference: 'adaptive' as const,
}

describe('upsertPersonaSchema', () => {
  it('parses a valid persona', () => {
    expect(upsertPersonaSchema.safeParse(valid).success).toBe(true)
  })

  it('requires interests array', () => {
    const { interests: _i, ...rest } = valid
    expect(upsertPersonaSchema.safeParse(rest).success).toBe(false)
  })

  it('requires motivationalStyle', () => {
    const { motivationalStyle: _m, ...rest } = valid
    expect(upsertPersonaSchema.safeParse(rest).success).toBe(false)
  })

  it('requires tonePreference', () => {
    const { tonePreference: _t, ...rest } = valid
    expect(upsertPersonaSchema.safeParse(rest).success).toBe(false)
  })

  it('requires difficultyPreference', () => {
    const { difficultyPreference: _d, ...rest } = valid
    expect(upsertPersonaSchema.safeParse(rest).success).toBe(false)
  })

  it('accepts all motivationalStyle values', () => {
    for (const s of ['challenge', 'progress', 'mastery', 'curiosity']) {
      expect(upsertPersonaSchema.safeParse({ ...valid, motivationalStyle: s }).success).toBe(true)
    }
  })

  it('rejects invalid motivationalStyle', () => {
    expect(
      upsertPersonaSchema.safeParse({ ...valid, motivationalStyle: 'greed' }).success,
    ).toBe(false)
  })

  it('accepts all tonePreference values', () => {
    for (const s of ['casual', 'balanced', 'academic', 'socratic']) {
      expect(upsertPersonaSchema.safeParse({ ...valid, tonePreference: s }).success).toBe(true)
    }
  })

  it('rejects invalid tonePreference', () => {
    expect(upsertPersonaSchema.safeParse({ ...valid, tonePreference: 'rude' }).success).toBe(false)
  })

  it('accepts all difficultyPreference values', () => {
    for (const s of ['beginner', 'intermediate', 'advanced', 'adaptive']) {
      expect(upsertPersonaSchema.safeParse({ ...valid, difficultyPreference: s }).success).toBe(true)
    }
  })

  it('rejects invalid difficultyPreference', () => {
    expect(
      upsertPersonaSchema.safeParse({ ...valid, difficultyPreference: 'expert' }).success,
    ).toBe(false)
  })

  it('accepts optional aspirationTags', () => {
    expect(
      upsertPersonaSchema.safeParse({ ...valid, aspirationTags: ['ML engineer'] }).success,
    ).toBe(true)
  })

  it('accepts optional affinityDomains', () => {
    expect(
      upsertPersonaSchema.safeParse({ ...valid, affinityDomains: ['sports'] }).success,
    ).toBe(true)
  })

  it('accepts empty interests array', () => {
    expect(upsertPersonaSchema.safeParse({ ...valid, interests: [] }).success).toBe(true)
  })
})
