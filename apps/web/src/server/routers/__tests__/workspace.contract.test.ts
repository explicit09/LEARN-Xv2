/**
 * Contract tests for workspace router.
 * Requires: supabase start (local Supabase running on port 54321)
 *
 * Run: pnpm --filter web test:contract
 */
import { TRPCError } from '@trpc/server'
import { describe, expect, it } from 'vitest'

import { createCallerFactory } from '../../trpc'
import { appRouter } from '../_app'
import { createTestContext } from './_test-helpers'

const createCaller = createCallerFactory(appRouter)

describe('workspace.create', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(caller.workspace.create({ name: 'Test Workspace' })).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('creates a workspace for the authenticated user', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await caller.workspace.create({ name: 'My Course' })
    expect(workspace).toMatchObject({ name: 'My Course', status: 'active' })
    expect(workspace.id).toBeDefined()
  })
})

describe('workspace.list', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(caller.workspace.list()).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns workspaces for the authenticated user', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    await caller.workspace.create({ name: 'WS 1' })
    await caller.workspace.create({ name: 'WS 2' })
    const list = await caller.workspace.list()
    expect(list.length).toBeGreaterThanOrEqual(2)
  })
})

describe('workspace.get', () => {
  it('returns a workspace owned by the user', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const created = await caller.workspace.create({ name: 'My WS' })
    const fetched = await caller.workspace.get({ id: created.id })
    expect(fetched.id).toBe(created.id)
  })

  it('throws NOT_FOUND for workspace belonging to another user', async () => {
    const ctx1 = await createTestContext({ authenticated: true })
    const ctx2 = await createTestContext({ authenticated: true })
    const caller1 = createCaller(ctx1)
    const caller2 = createCaller(ctx2)
    const ws = await caller1.workspace.create({ name: 'Private WS' })
    await expect(caller2.workspace.get({ id: ws.id })).rejects.toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>),
    )
  })
})

describe('workspace.update', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.workspace.update({ id: '00000000-0000-0000-0000-000000000001', data: { name: 'X' } }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('updates workspace name', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const ws = await caller.workspace.create({ name: 'Original' })
    const updated = await caller.workspace.update({ id: ws.id, data: { name: 'Updated' } })
    expect(updated.name).toBe('Updated')
  })
})

describe('workspace.delete', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.workspace.delete({ id: '00000000-0000-0000-0000-000000000001' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('deletes a workspace', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const ws = await caller.workspace.create({ name: 'To Delete' })
    const result = await caller.workspace.delete({ id: ws.id })
    expect(result.success).toBe(true)
    await expect(caller.workspace.get({ id: ws.id })).rejects.toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>),
    )
  })
})
