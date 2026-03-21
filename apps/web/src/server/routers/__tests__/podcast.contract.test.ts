/**
 * Contract tests for podcast router.
 * Requires: Supabase running with migration 0023 applied.
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
  return caller.workspace.create({ name: 'Podcast Test Workspace' })
}

async function createTestLesson(
  ctx: Awaited<ReturnType<typeof createTestContext>>,
  workspaceId: string,
) {
  const { data: userRow } = await ctx.supabase
    .from('users')
    .select('id')
    .eq('auth_id', ctx.user!.id)
    .single()
  const { data: lesson } = await ctx.supabase
    .from('lessons')
    .insert({
      workspace_id: workspaceId,
      user_id: userRow!.id,
      title: 'Podcast test lesson',
      content_markdown: 'Test content for podcast generation',
      structured_sections: [],
    })
    .select('id')
    .single()
  return { lesson: lesson!, userId: userRow!.id as string }
}

// ── podcast.list ────────────────────────────────────────────────────────────

describe('podcast.list', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.podcast.list({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns empty array for workspace with no podcasts', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const podcasts = await caller.podcast.list({ workspaceId: workspace.id })
    expect(Array.isArray(podcasts)).toBe(true)
    expect(podcasts.length).toBe(0)

    await ctx._cleanup?.()
  })
})

// ── podcast.get ─────────────────────────────────────────────────────────────

describe('podcast.get', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.podcast.get({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        lessonId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns null when no podcast exists for lesson', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const podcast = await caller.podcast.get({
      workspaceId: workspace.id,
      lessonId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(podcast).toBeNull()

    await ctx._cleanup?.()
  })
})

// ── podcast.generate ────────────────────────────────────────────────────────

describe('podcast.generate', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.podcast.generate({
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
    const { lesson } = await createTestLesson(ctx, workspace.id)

    const result = await caller.podcast.generate({
      workspaceId: workspace.id,
      lessonId: lesson.id as string,
    })
    expect(result).toHaveProperty('jobId')
    expect(typeof result.jobId).toBe('string')

    await ctx._cleanup?.()
  })

  it('accepts format option', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)
    const { lesson } = await createTestLesson(ctx, workspace.id)

    const result = await caller.podcast.generate({
      workspaceId: workspace.id,
      lessonId: lesson.id as string,
      format: 'single_voice',
    })
    expect(result).toHaveProperty('jobId')

    await ctx._cleanup?.()
  })

  it('rejects a lesson from a different workspace', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    try {
      const workspaceA = await createTestWorkspace(ctx)
      const workspaceB = await caller.workspace.create({ name: 'Other Podcast WS' })
      const { lesson } = await createTestLesson(ctx, workspaceB.id)

      await expect(
        caller.podcast.generate({
          workspaceId: workspaceA.id,
          lessonId: lesson.id as string,
        }),
      ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))
    } finally {
      await ctx._cleanup?.()
    }
  })
})

// ── podcast.delete ──────────────────────────────────────────────────────────

describe('podcast.delete', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.podcast.delete({ podcastId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })
})

// ── podcast.listAll ─────────────────────────────────────────────────────────

describe('podcast.listAll', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(caller.podcast.listAll({})).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns empty array when user has no podcasts', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    const podcasts = await caller.podcast.listAll({})
    expect(Array.isArray(podcasts)).toBe(true)
    expect(podcasts.length).toBe(0)

    await ctx._cleanup?.()
  })
})
