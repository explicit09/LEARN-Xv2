/**
 * Contract tests for concept + syllabus routers.
 * Requires: Supabase running with Phase 1C migration applied.
 *
 * Run: pnpm --filter web test:contract
 */
import { TRPCError } from '@trpc/server'
import { afterEach, describe, expect, it } from 'vitest'

import { createCallerFactory } from '../../trpc'
import { appRouter } from '../_app'
import { createTestContext } from './_test-helpers'

const createCaller = createCallerFactory(appRouter)

async function createTestWorkspace(ctx: Awaited<ReturnType<typeof createTestContext>>) {
  const caller = createCaller(ctx)
  return caller.workspace.create({ name: 'Test Workspace' })
}

// ── concept.list ──────────────────────────────────────────────────────────────

describe('concept.list', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.concept.list({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>))
  })

  it('returns empty array for workspace with no concepts', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const result = await caller.concept.list({ workspaceId: workspace.id })
    expect(result).toEqual([])

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('returns concepts after seeding via service client', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    // Seed directly via service client (bypasses RLS)
    const serviceClient = ctx.supabase
    await serviceClient.from('concepts').insert([
      { workspace_id: workspace.id, name: 'Gradient Descent', description: 'Optimization algo', tags: ['ml'] },
      { workspace_id: workspace.id, name: 'Backpropagation', description: 'Training algorithm', tags: ['dl'] },
    ])

    const result = await caller.concept.list({ workspaceId: workspace.id })
    expect(result.length).toBe(2)
    // ordered by name ASC
    expect(result[0]!.name).toBe('Backpropagation')
    expect(result[1]!.name).toBe('Gradient Descent')

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('throws NOT_FOUND for workspace user does not own', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    await expect(
      caller.concept.list({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

// ── syllabus.get ─────────────────────────────────────────────────────────────

describe('syllabus.get', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.syllabus.get({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>))
  })

  it('returns null when no active syllabus exists', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const result = await caller.syllabus.get({ workspaceId: workspace.id })
    expect(result).toBeNull()

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('returns syllabus with units and topics after seeding', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const serviceClient = ctx.supabase

    // Seed syllabus
    const { data: syllabus } = await serviceClient
      .from('syllabuses')
      .insert({ workspace_id: workspace.id, version: 1, status: 'active' })
      .select()
      .single()

    // Seed unit
    const { data: unit } = await serviceClient
      .from('syllabus_units')
      .insert({ syllabus_id: syllabus!.id, title: 'Introduction', order_index: 0 })
      .select()
      .single()

    // Seed topic
    await serviceClient
      .from('syllabus_topics')
      .insert({ unit_id: unit!.id, title: 'What is ML?', description: 'Overview', order_index: 0 })

    const result = await caller.syllabus.get({ workspaceId: workspace.id })
    expect(result).not.toBeNull()
    expect(result!.version).toBe(1)
    expect(result!.units).toHaveLength(1)
    expect(result!.units[0]!.title).toBe('Introduction')
    expect(result!.units[0]!.topics).toHaveLength(1)
    expect(result!.units[0]!.topics[0]!.title).toBe('What is ML?')

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})
