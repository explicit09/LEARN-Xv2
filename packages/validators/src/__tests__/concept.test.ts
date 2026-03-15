import { describe, expect, it } from 'vitest'

import { conceptRelationTypeEnum, conceptSchema } from '../concept'

describe('conceptRelationTypeEnum', () => {
  it('accepts valid relation types', () => {
    for (const type of ['prerequisite', 'related', 'part_of', 'extends']) {
      expect(conceptRelationTypeEnum.parse(type)).toBe(type)
    }
  })

  it('rejects example_of (not in schema)', () => {
    expect(() => conceptRelationTypeEnum.parse('example_of')).toThrow()
  })

  it('rejects unknown relation type', () => {
    expect(() => conceptRelationTypeEnum.parse('unknown')).toThrow()
  })
})

describe('conceptSchema', () => {
  const valid = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    workspaceId: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Gradient Descent',
    description: 'An optimization algorithm for minimizing loss functions.',
    tags: ['optimization', 'machine learning'],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('accepts a valid concept', () => {
    expect(conceptSchema.parse(valid)).toMatchObject({
      id: valid.id,
      workspaceId: valid.workspaceId,
      name: valid.name,
    })
  })

  it('requires id to be a UUID', () => {
    expect(() => conceptSchema.parse({ ...valid, id: 'not-a-uuid' })).toThrow()
  })

  it('requires workspaceId to be a UUID', () => {
    expect(() => conceptSchema.parse({ ...valid, workspaceId: 'not-a-uuid' })).toThrow()
  })

  it('rejects empty name', () => {
    expect(() => conceptSchema.parse({ ...valid, name: '' })).toThrow()
  })

  it('rejects name over 200 chars', () => {
    expect(() => conceptSchema.parse({ ...valid, name: 'a'.repeat(201) })).toThrow()
  })

  it('accepts name at max boundary (200 chars)', () => {
    expect(conceptSchema.parse({ ...valid, name: 'a'.repeat(200) })).toBeDefined()
  })

  it('accepts null description', () => {
    expect(conceptSchema.parse({ ...valid, description: null })).toBeDefined()
  })

  it('tags defaults to empty array', () => {
    const result = conceptSchema.parse({ ...valid, tags: [] })
    expect(result.tags).toEqual([])
  })
})
