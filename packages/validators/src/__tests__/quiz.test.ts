import { describe, expect, it } from 'vitest'
import {
  completeAttemptSchema,
  createQuizSchema,
  getQuizSchema,
  startAttemptSchema,
  submitResponseSchema,
  triggerGenerateQuizSchema,
} from '../quiz'

describe('createQuizSchema', () => {
  it('accepts valid workspaceId + quizType', () => {
    const result = createQuizSchema.safeParse({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      quizType: 'practice',
    })
    expect(result.success).toBe(true)
  })

  it('accepts all valid quizType values', () => {
    for (const qt of ['practice', 'review', 'exam_prep', 'diagnostic'] as const) {
      expect(
        createQuizSchema.safeParse({
          workspaceId: '550e8400-e29b-41d4-a716-446655440000',
          quizType: qt,
        }).success,
      ).toBe(true)
    }
  })

  it('rejects invalid quizType', () => {
    const result = createQuizSchema.safeParse({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      quizType: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional lessonId', () => {
    const result = createQuizSchema.safeParse({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      quizType: 'practice',
      lessonId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid workspaceId', () => {
    expect(createQuizSchema.safeParse({ workspaceId: 'bad', quizType: 'practice' }).success).toBe(
      false,
    )
  })
})

describe('startAttemptSchema', () => {
  it('accepts valid quizId + workspaceId', () => {
    const result = startAttemptSchema.safeParse({
      quizId: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(true)
  })
})

describe('submitResponseSchema', () => {
  it('accepts valid fields', () => {
    const result = submitResponseSchema.safeParse({
      attemptId: '550e8400-e29b-41d4-a716-446655440000',
      questionId: '550e8400-e29b-41d4-a716-446655440001',
      userAnswer: 'A',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty userAnswer', () => {
    const result = submitResponseSchema.safeParse({
      attemptId: '550e8400-e29b-41d4-a716-446655440000',
      questionId: '550e8400-e29b-41d4-a716-446655440001',
      userAnswer: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('completeAttemptSchema', () => {
  it('accepts valid attemptId + workspaceId', () => {
    const result = completeAttemptSchema.safeParse({
      attemptId: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(true)
  })
})

describe('getQuizSchema', () => {
  it('accepts valid id + workspaceId', () => {
    expect(
      getQuizSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      }).success,
    ).toBe(true)
  })
})

describe('triggerGenerateQuizSchema', () => {
  it('accepts workspaceId', () => {
    expect(
      triggerGenerateQuizSchema.safeParse({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(true)
  })
})
