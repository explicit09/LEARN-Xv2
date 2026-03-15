import { describe, it, expect } from 'vitest'
import {
  tagConceptSchema,
  getGraphSchema,
  graphNodeSchema,
  graphEdgeSchema,
} from '../knowledgeGraph'

describe('tagConceptSchema', () => {
  it('accepts valid tag with domain', () => {
    const result = tagConceptSchema.safeParse({
      conceptId: '00000000-0000-0000-0000-000000000001',
      tag: 'gradient-descent',
      domain: 'ml',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty tag', () => {
    const result = tagConceptSchema.safeParse({
      conceptId: '00000000-0000-0000-0000-000000000001',
      tag: '',
      domain: 'ml',
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-uuid conceptId', () => {
    const result = tagConceptSchema.safeParse({
      conceptId: 'not-a-uuid',
      tag: 'gradient-descent',
      domain: 'ml',
    })
    expect(result.success).toBe(false)
  })

  it('domain is optional', () => {
    const result = tagConceptSchema.safeParse({
      conceptId: '00000000-0000-0000-0000-000000000001',
      tag: 'gradient-descent',
    })
    expect(result.success).toBe(true)
  })
})

describe('getGraphSchema', () => {
  it('accepts workspaceId only', () => {
    const result = getGraphSchema.safeParse({
      workspaceId: '00000000-0000-0000-0000-000000000001',
    })
    expect(result.success).toBe(true)
  })

  it('accepts workspaceId with depth', () => {
    const result = getGraphSchema.safeParse({
      workspaceId: '00000000-0000-0000-0000-000000000001',
      depth: 2,
    })
    expect(result.success).toBe(true)
  })

  it('rejects depth below 1', () => {
    const result = getGraphSchema.safeParse({
      workspaceId: '00000000-0000-0000-0000-000000000001',
      depth: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects depth above 5', () => {
    const result = getGraphSchema.safeParse({
      workspaceId: '00000000-0000-0000-0000-000000000001',
      depth: 6,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing workspaceId', () => {
    const result = getGraphSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('graphNodeSchema', () => {
  it('accepts valid node', () => {
    const result = graphNodeSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Gradient Descent',
      masteryLevel: 0.75,
      tag: 'gradient-descent',
      domain: 'ml',
    })
    expect(result.success).toBe(true)
  })

  it('masteryLevel is optional', () => {
    const result = graphNodeSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Gradient Descent',
    })
    expect(result.success).toBe(true)
  })
})

describe('graphEdgeSchema', () => {
  it('accepts valid edge', () => {
    const result = graphEdgeSchema.safeParse({
      source: '00000000-0000-0000-0000-000000000001',
      target: '00000000-0000-0000-0000-000000000002',
      relationType: 'prerequisite',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid relation type', () => {
    const result = graphEdgeSchema.safeParse({
      source: '00000000-0000-0000-0000-000000000001',
      target: '00000000-0000-0000-0000-000000000002',
      relationType: 'unknown_type',
    })
    expect(result.success).toBe(false)
  })
})
