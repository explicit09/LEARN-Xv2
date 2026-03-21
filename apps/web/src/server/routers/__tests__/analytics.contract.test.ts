/**
 * Contract tests for analytics router.
 * Requires: Supabase running with the current analytics schema applied.
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
  return createCaller(ctx).workspace.create({ name: 'Analytics Test Workspace' })
}

describe('analytics.getStudyHeatmap', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)

    await expect(caller.analytics.getStudyHeatmap({})).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns an array for an authenticated user', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    try {
      const result = await caller.analytics.getStudyHeatmap({})
      expect(Array.isArray(result)).toBe(true)
    } finally {
      await ctx._cleanup?.()
    }
  })

  it('includes flashcard review activity in the returned dates', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    try {
      const workspace = await createTestWorkspace(ctx)
      const { data: userRow } = await ctx.supabase
        .from('users')
        .select('id')
        .eq('auth_id', ctx.user!.id)
        .single()

      const { data: set } = await ctx.supabase
        .from('flashcard_sets')
        .insert({
          workspace_id: workspace.id,
          title: 'Heatmap Set',
          source_type: 'manual',
        })
        .select('id')
        .single()

      const { data: card } = await ctx.supabase
        .from('flashcards')
        .insert({
          set_id: set!.id,
          front: 'Q',
          back: 'A',
        })
        .select('id')
        .single()

      await ctx.supabase.from('flashcard_reviews').insert({
        flashcard_id: card!.id,
        user_id: userRow!.id,
        rating: 3,
        elapsed_days: 0,
        scheduled_days: 1,
      })

      const result = await caller.analytics.getStudyHeatmap({})
      const today = new Date().toISOString().split('T')[0]

      expect(result.some((entry) => entry.date === today)).toBe(true)
    } finally {
      await ctx._cleanup?.()
    }
  })
})
