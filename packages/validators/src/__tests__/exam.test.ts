import { describe, expect, it } from 'vitest'
import {
  bloomLevelEnum,
  completeExamSchema,
  createExamSchema,
  examStatusEnum,
  joinExamSchema,
  questionTypeEnum,
  startExamSchema,
  submitExamResponseSchema,
} from '../exam'

describe('examStatusEnum', () => {
  it('accepts draft', () => {
    expect(examStatusEnum.safeParse('draft').success).toBe(true)
  })
  it('accepts active', () => {
    expect(examStatusEnum.safeParse('active').success).toBe(true)
  })
  it('accepts closed', () => {
    expect(examStatusEnum.safeParse('closed').success).toBe(true)
  })
  it('rejects invalid status', () => {
    expect(examStatusEnum.safeParse('published').success).toBe(false)
  })
})

describe('questionTypeEnum', () => {
  it('accepts all valid types', () => {
    for (const qt of ['mcq', 'short_answer', 'true_false', 'fill_blank'] as const) {
      expect(questionTypeEnum.safeParse(qt).success).toBe(true)
    }
  })
  it('rejects invalid type', () => {
    expect(questionTypeEnum.safeParse('essay').success).toBe(false)
  })
})

describe('bloomLevelEnum', () => {
  it('accepts all six levels', () => {
    for (const level of [
      'remember',
      'understand',
      'apply',
      'analyze',
      'evaluate',
      'create',
    ] as const) {
      expect(bloomLevelEnum.safeParse(level).success).toBe(true)
    }
  })
  it('rejects invalid level', () => {
    expect(bloomLevelEnum.safeParse('synthesis').success).toBe(false)
  })
})

describe('createExamSchema', () => {
  it('accepts valid workspaceId and title', () => {
    const result = createExamSchema.safeParse({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Midterm Exam',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional timeLimitMinutes', () => {
    const result = createExamSchema.safeParse({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Final',
      timeLimitMinutes: 90,
    })
    expect(result.success).toBe(true)
  })

  it('rejects timeLimitMinutes less than 1', () => {
    const result = createExamSchema.safeParse({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Final',
      timeLimitMinutes: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer timeLimitMinutes', () => {
    const result = createExamSchema.safeParse({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Final',
      timeLimitMinutes: 1.5,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty title', () => {
    const result = createExamSchema.safeParse({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      title: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid workspaceId', () => {
    const result = createExamSchema.safeParse({
      workspaceId: 'not-a-uuid',
      title: 'Exam',
    })
    expect(result.success).toBe(false)
  })
})

describe('startExamSchema', () => {
  it('accepts valid examId and workspaceId', () => {
    const result = startExamSchema.safeParse({
      examId: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing examId', () => {
    const result = startExamSchema.safeParse({
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(false)
  })
})

describe('submitExamResponseSchema', () => {
  it('accepts valid fields', () => {
    const result = submitExamResponseSchema.safeParse({
      attemptId: '550e8400-e29b-41d4-a716-446655440000',
      questionId: '550e8400-e29b-41d4-a716-446655440001',
      userAnswer: 'B',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty userAnswer', () => {
    const result = submitExamResponseSchema.safeParse({
      attemptId: '550e8400-e29b-41d4-a716-446655440000',
      questionId: '550e8400-e29b-41d4-a716-446655440001',
      userAnswer: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('completeExamSchema', () => {
  it('accepts valid attemptId and workspaceId', () => {
    const result = completeExamSchema.safeParse({
      attemptId: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(true)
  })
})

describe('joinExamSchema', () => {
  it('accepts a valid join token (min 6 chars)', () => {
    const result = joinExamSchema.safeParse({ joinToken: 'ABC123' })
    expect(result.success).toBe(true)
  })

  it('rejects token shorter than 6 chars', () => {
    const result = joinExamSchema.safeParse({ joinToken: 'AB1' })
    expect(result.success).toBe(false)
  })
})
