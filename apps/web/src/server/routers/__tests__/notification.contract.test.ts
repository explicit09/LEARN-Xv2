/**
 * Contract tests for notification router.
 * Requires: Supabase running.
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
  return caller.workspace.create({ name: 'Notification Test Workspace' })
}

// ── notification.getDailyDigest ───────────────────────────────────────────────

describe('notification.getDailyDigest', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(caller.notification.getDailyDigest({})).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns digest with expected shape', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    const digest = await caller.notification.getDailyDigest({})
    expect(digest).toHaveProperty('dueFlashcards')
    expect(typeof digest.dueFlashcards).toBe('number')
    expect(digest).toHaveProperty('fadingConcepts')
    expect(Array.isArray(digest.fadingConcepts)).toBe(true)
    expect(digest).toHaveProperty('studyStreakDays')
    expect(typeof digest.studyStreakDays).toBe('number')

    await ctx._cleanup?.()
  })

  it('scopes digest to workspace when workspaceId given', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const digest = await caller.notification.getDailyDigest({ workspaceId: workspace.id })
    expect(digest).toHaveProperty('dueFlashcards')

    await ctx._cleanup?.()
  })

  it('counts due flashcards for the authenticated user', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    try {
      const workspace = await createTestWorkspace(ctx)
      const { data: set } = await ctx.supabase
        .from('flashcard_sets')
        .insert({
          workspace_id: workspace.id,
          title: 'Digest Set',
          source_type: 'manual',
        })
        .select('id')
        .single()

      await ctx.supabase.from('flashcards').insert({
        set_id: set!.id,
        front: 'Due card',
        back: 'Answer',
        due_at: new Date(Date.now() - 60_000).toISOString(),
      })

      const digest = await caller.notification.getDailyDigest({})
      expect(digest.dueFlashcards).toBeGreaterThan(0)
    } finally {
      await ctx._cleanup?.()
    }
  })

  it('rejects another user workspace when workspaceId is provided', async () => {
    const ownerCtx = await createTestContext({ authenticated: true })
    const outsiderCtx = await createTestContext({ authenticated: true })

    try {
      const ownerWorkspace = await createTestWorkspace(ownerCtx)

      await expect(
        createCaller(outsiderCtx).notification.getDailyDigest({ workspaceId: ownerWorkspace.id }),
      ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))
    } finally {
      await outsiderCtx._cleanup?.()
      await ownerCtx._cleanup?.()
    }
  })
})
