import { describe, expect, it } from 'vitest'

import { createWorkspaceSchema, updateWorkspaceSchema, workspaceSchema } from '../workspace'

const validWorkspace = {
  id: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000002',
  name: 'My Workspace',
  status: 'active' as const,
  settings: {},
  totalTokenCount: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('workspaceSchema', () => {
  it('parses a valid workspace', () => {
    expect(workspaceSchema.safeParse(validWorkspace).success).toBe(true)
  })

  it('accepts optional description', () => {
    const result = workspaceSchema.safeParse({ ...validWorkspace, description: 'A test workspace' })
    expect(result.success).toBe(true)
  })

  it('rejects name shorter than 1 char', () => {
    expect(workspaceSchema.safeParse({ ...validWorkspace, name: '' }).success).toBe(false)
  })

  it('rejects name longer than 200 chars', () => {
    expect(workspaceSchema.safeParse({ ...validWorkspace, name: 'a'.repeat(201) }).success).toBe(
      false,
    )
  })

  it('accepts name at exactly 200 chars', () => {
    expect(workspaceSchema.safeParse({ ...validWorkspace, name: 'a'.repeat(200) }).success).toBe(
      true,
    )
  })

  it('rejects status outside enum', () => {
    expect(workspaceSchema.safeParse({ ...validWorkspace, status: 'deleted' }).success).toBe(false)
  })

  it('accepts all valid status values', () => {
    for (const s of ['active', 'archived', 'processing']) {
      expect(workspaceSchema.safeParse({ ...validWorkspace, status: s }).success).toBe(true)
    }
  })

  it('rejects non-uuid id', () => {
    expect(workspaceSchema.safeParse({ ...validWorkspace, id: 'not-a-uuid' }).success).toBe(false)
  })

  it('rejects non-integer totalTokenCount', () => {
    expect(
      workspaceSchema.safeParse({ ...validWorkspace, totalTokenCount: 1.5 }).success,
    ).toBe(false)
  })
})

describe('createWorkspaceSchema', () => {
  it('only requires name', () => {
    expect(createWorkspaceSchema.safeParse({ name: 'My Workspace' }).success).toBe(true)
  })

  it('defaults status to active', () => {
    const result = createWorkspaceSchema.safeParse({ name: 'My Workspace' })
    if (!result.success) throw new Error('parse failed')
    expect(result.data.status).toBe('active')
  })

  it('defaults totalTokenCount to 0', () => {
    const result = createWorkspaceSchema.safeParse({ name: 'My Workspace' })
    if (!result.success) throw new Error('parse failed')
    expect(result.data.totalTokenCount).toBe(0)
  })

  it('rejects empty name', () => {
    expect(createWorkspaceSchema.safeParse({ name: '' }).success).toBe(false)
  })
})

describe('updateWorkspaceSchema', () => {
  it('accepts empty object (no-op update)', () => {
    expect(updateWorkspaceSchema.safeParse({}).success).toBe(true)
  })

  it('accepts partial name update', () => {
    expect(updateWorkspaceSchema.safeParse({ name: 'New Name' }).success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(updateWorkspaceSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('rejects name over 200 chars', () => {
    expect(updateWorkspaceSchema.safeParse({ name: 'a'.repeat(201) }).success).toBe(false)
  })

  it('accepts valid status values', () => {
    for (const s of ['active', 'archived', 'processing']) {
      expect(updateWorkspaceSchema.safeParse({ status: s }).success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    expect(updateWorkspaceSchema.safeParse({ status: 'deleted' }).success).toBe(false)
  })

  it('accepts description update', () => {
    expect(updateWorkspaceSchema.safeParse({ description: 'Updated description' }).success).toBe(true)
  })
})
