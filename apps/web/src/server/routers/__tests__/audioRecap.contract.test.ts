/**
 * Contract tests for audioRecap router.
 * Requires: Supabase running with Phase 2B migration applied.
 *
 * Run: pnpm --filter web test:contract
 */
import { TRPCError } from '@trpc/server'
import { describe, expect, it } from 'vitest'

import { createCallerFactory } from '../../trpc'
import { appRouter } from '../_app'
import { createTestContext } from './_test-helpers'

const createCaller = createCallerFactory(appRouter)

async function createTestWorkspace(ctx: Awaited<ReturnType<typeof createTestContext>>) {
  const caller = createCaller(ctx)
  return caller.workspace.create({ name: 'Audio Recap Test Workspace' })
}

// ── audioRecap.list ───────────────────────────────────────────────────────────

describe('audioRecap.list', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.audioRecap.list({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns empty array for workspace with no recaps', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const recaps = await caller.audioRecap.list({ workspaceId: workspace.id })
    expect(Array.isArray(recaps)).toBe(true)
    expect(recaps.length).toBe(0)

    await ctx._cleanup?.()
  })
})

// ── audioRecap.get ────────────────────────────────────────────────────────────

describe('audioRecap.get', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.audioRecap.get({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        lessonId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns null when no recap exists for lesson', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const recap = await caller.audioRecap.get({
      workspaceId: workspace.id,
      lessonId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(recap).toBeNull()

    await ctx._cleanup?.()
  })
})

// ── audioRecap.generate ───────────────────────────────────────────────────────

describe('audioRecap.generate', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.audioRecap.generate({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        lessonId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns jobId when triggered', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)
    const { data: userRow } = await ctx.supabase
      .from('users')
      .select('id')
      .eq('auth_id', ctx.user!.id)
      .single()
    const { data: lesson } = await ctx.supabase
      .from('lessons')
      .insert({
        workspace_id: workspace.id,
        user_id: userRow!.id,
        title: 'Audio lesson',
        content_markdown: 'content',
        structured_sections: [],
      })
      .select('id')
      .single()

    const result = await caller.audioRecap.generate({
      workspaceId: workspace.id,
      lessonId: lesson!.id as string,
    })
    expect(result).toHaveProperty('jobId')
    expect(typeof result.jobId).toBe('string')

    await ctx._cleanup?.()
  })

  it('rejects a lesson that does not belong to the requested workspace', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    try {
      const workspaceA = await createTestWorkspace(ctx)
      const workspaceB = await caller.workspace.create({ name: 'Other Audio WS' })
      const { data: userRow } = await ctx.supabase
        .from('users')
        .select('id')
        .eq('auth_id', ctx.user!.id)
        .single()

      const { data: lesson } = await ctx.supabase
        .from('lessons')
        .insert({
          workspace_id: workspaceB.id,
          user_id: userRow!.id,
          title: 'Foreign lesson',
          content_markdown: 'content',
          structured_sections: [],
        })
        .select('id')
        .single()

      await expect(
        caller.audioRecap.generate({
          workspaceId: workspaceA.id,
          lessonId: lesson!.id as string,
        }),
      ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))
    } finally {
      await ctx._cleanup?.()
    }
  })
})
