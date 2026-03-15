import { describe, expect, it } from 'vitest'
import { addDocumentSchema, createCourseSchema, joinCourseSchema } from '../course'

describe('createCourseSchema', () => {
  it('accepts valid title', () => {
    expect(createCourseSchema.safeParse({ title: 'Introduction to CS' }).success).toBe(true)
  })

  it('accepts optional description', () => {
    expect(
      createCourseSchema.safeParse({
        title: 'CS 101',
        description: 'Intro course',
      }).success,
    ).toBe(true)
  })

  it('rejects empty title', () => {
    expect(createCourseSchema.safeParse({ title: '' }).success).toBe(false)
  })

  it('rejects missing title', () => {
    expect(createCourseSchema.safeParse({}).success).toBe(false)
  })
})

describe('joinCourseSchema', () => {
  it('accepts 8-char code', () => {
    expect(joinCourseSchema.safeParse({ joinCode: 'ABCD1234' }).success).toBe(true)
  })

  it('rejects code shorter than 8 chars', () => {
    expect(joinCourseSchema.safeParse({ joinCode: 'SHORT' }).success).toBe(false)
  })

  it('rejects code longer than 8 chars', () => {
    expect(joinCourseSchema.safeParse({ joinCode: 'TOOLONGCODE' }).success).toBe(false)
  })

  it('rejects missing joinCode', () => {
    expect(joinCourseSchema.safeParse({}).success).toBe(false)
  })
})

describe('addDocumentSchema', () => {
  it('accepts valid courseId and documentId', () => {
    expect(
      addDocumentSchema.safeParse({
        courseId: '550e8400-e29b-41d4-a716-446655440000',
        documentId: '550e8400-e29b-41d4-a716-446655440001',
      }).success,
    ).toBe(true)
  })

  it('rejects invalid courseId', () => {
    expect(
      addDocumentSchema.safeParse({
        courseId: 'not-a-uuid',
        documentId: '550e8400-e29b-41d4-a716-446655440001',
      }).success,
    ).toBe(false)
  })

  it('rejects invalid documentId', () => {
    expect(
      addDocumentSchema.safeParse({
        courseId: '550e8400-e29b-41d4-a716-446655440000',
        documentId: 'bad',
      }).success,
    ).toBe(false)
  })
})
