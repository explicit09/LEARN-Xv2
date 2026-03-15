/**
 * Contract tests for lesson router.
 * Requires: Supabase running with Phase 1D migration applied.
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
  return caller.workspace.create({ name: 'Lesson Test Workspace' })
}

// ── lesson.list ───────────────────────────────────────────────────────────────

describe('lesson.list', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.lesson.list({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns empty array for workspace with no lessons', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const result = await caller.lesson.list({ workspaceId: workspace.id })
    expect(result).toEqual([])

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('returns lessons after seeding', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    // Seed lesson directly via service client (bypasses RLS)
    const userId = (
      await ctx.supabase.from('users').select('id').eq('auth_id', ctx.user!.id).single()
    ).data!.id

    await ctx.supabase.from('lessons').insert({
      workspace_id: workspace.id,
      user_id: userId,
      title: 'Test Lesson',
      order_index: 0,
      content_markdown: '',
      structured_sections: [],
    })

    const result = await caller.lesson.list({ workspaceId: workspace.id })
    expect(result).toHaveLength(1)
    expect(result[0]?.title).toBe('Test Lesson')

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

// ── lesson.get ────────────────────────────────────────────────────────────────

describe('lesson.get', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.lesson.get({
        id: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('throws NOT_FOUND for non-existent lesson', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    await expect(
      caller.lesson.get({
        id: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: workspace.id,
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('returns lesson with structured_sections', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const userId = (
      await ctx.supabase.from('users').select('id').eq('auth_id', ctx.user!.id).single()
    ).data!.id

    const sections = [{ type: 'text', content: 'Hello world' }]
    const { data: lesson } = await ctx.supabase
      .from('lessons')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        title: 'Section Test',
        order_index: 0,
        content_markdown: '',
        structured_sections: sections,
      })
      .select('id')
      .single()

    const result = await caller.lesson.get({
      id: lesson!.id as string,
      workspaceId: workspace.id,
    })

    expect(result.title).toBe('Section Test')
    expect(result.structuredSections).toEqual(sections)

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

// ── lesson.markComplete ───────────────────────────────────────────────────────

describe('lesson.markComplete', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.lesson.markComplete({
        id: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('marks lesson as complete and sets completedAt', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const userId = (
      await ctx.supabase.from('users').select('id').eq('auth_id', ctx.user!.id).single()
    ).data!.id

    const { data: lesson } = await ctx.supabase
      .from('lessons')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        title: 'Complete Test',
        order_index: 0,
        content_markdown: '',
        structured_sections: [],
      })
      .select('id')
      .single()

    const result = await caller.lesson.markComplete({
      id: lesson!.id as string,
      workspaceId: workspace.id,
    })

    expect(result.isCompleted).toBe(true)
    expect(result.completedAt).toBeTruthy()

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

// ── lesson.triggerGenerate ────────────────────────────────────────────────────

describe('lesson.triggerGenerate', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.lesson.triggerGenerate({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns queued status for valid workspace', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    // triggerGenerate creates a jobs row and optionally triggers Trigger.dev
    const result = await caller.lesson.triggerGenerate({ workspaceId: workspace.id })
    expect(result.status).toBe('queued')

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})
