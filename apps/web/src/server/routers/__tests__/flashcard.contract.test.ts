/**
 * Contract tests for flashcard router.
 * Requires: Supabase running with Phase 1F migration applied.
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
  return caller.workspace.create({ name: 'Flashcard Test Workspace' })
}

// ── flashcard.listSets ────────────────────────────────────────────────────────

describe('flashcard.listSets', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.flashcard.listSets({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns empty array for workspace with no flashcard sets', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const sets = await caller.flashcard.listSets({ workspaceId: workspace.id })
    expect(Array.isArray(sets)).toBe(true)
    expect(sets.length).toBe(0)
  })
})

// ── flashcard.getDue ──────────────────────────────────────────────────────────

describe('flashcard.getDue', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.flashcard.getDue({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns empty array when no cards are due', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const due = await caller.flashcard.getDue({ workspaceId: workspace.id })
    expect(Array.isArray(due)).toBe(true)
    expect(due.length).toBe(0)
  })
})

// ── flashcard.submitReview ────────────────────────────────────────────────────

describe('flashcard.submitReview', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.flashcard.submitReview({
        cardId: '550e8400-e29b-41d4-a716-446655440000',
        rating: 3,
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('throws NOT_FOUND for non-existent card', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    await expect(
      caller.flashcard.submitReview({
        cardId: '550e8400-e29b-41d4-a716-446655440099',
        rating: 3,
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))
  })
})
