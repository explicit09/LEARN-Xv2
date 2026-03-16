import { describe, expect, it } from 'vitest'
import {
  createFlashcardSetSchema,
  getDueFlashcardsSchema,
  getFlashcardSetSchema,
  submitReviewSchema,
  triggerGenerateFlashcardsSchema,
} from '../flashcard'

describe('createFlashcardSetSchema', () => {
  it('accepts valid fields', () => {
    const result = createFlashcardSetSchema.safeParse({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'My Set',
      sourceType: 'lesson',
    })
    expect(result.success).toBe(true)
  })

  it('accepts all valid sourceType values', () => {
    for (const st of ['lesson', 'workspace', 'manual'] as const) {
      expect(
        createFlashcardSetSchema.safeParse({
          workspaceId: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Set',
          sourceType: st,
        }).success,
      ).toBe(true)
    }
  })

  it('rejects invalid sourceType', () => {
    expect(
      createFlashcardSetSchema.safeParse({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Set',
        sourceType: 'invalid',
      }).success,
    ).toBe(false)
  })

  it('rejects empty title', () => {
    expect(
      createFlashcardSetSchema.safeParse({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        title: '',
        sourceType: 'manual',
      }).success,
    ).toBe(false)
  })
})

describe('submitReviewSchema', () => {
  it('accepts rating 1 through 4', () => {
    for (const r of [1, 2, 3, 4]) {
      expect(
        submitReviewSchema.safeParse({
          cardId: '550e8400-e29b-41d4-a716-446655440000',
          rating: r,
        }).success,
      ).toBe(true)
    }
  })

  it('rejects rating 0', () => {
    expect(
      submitReviewSchema.safeParse({
        cardId: '550e8400-e29b-41d4-a716-446655440000',
        rating: 0,
      }).success,
    ).toBe(false)
  })

  it('rejects rating 5', () => {
    expect(
      submitReviewSchema.safeParse({
        cardId: '550e8400-e29b-41d4-a716-446655440000',
        rating: 5,
      }).success,
    ).toBe(false)
  })
})

describe('getDueFlashcardsSchema', () => {
  it('accepts workspaceId', () => {
    expect(
      getDueFlashcardsSchema.safeParse({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(true)
  })
})

describe('getFlashcardSetSchema', () => {
  it('accepts valid id + workspaceId', () => {
    expect(
      getFlashcardSetSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      }).success,
    ).toBe(true)
  })
})

describe('triggerGenerateFlashcardsSchema', () => {
  it('accepts workspaceId', () => {
    expect(
      triggerGenerateFlashcardsSchema.safeParse({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(true)
  })
})
