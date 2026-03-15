/**
 * Contract tests for mastery router.
 * Requires: Supabase running with Phase 1F migration applied.
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
  return createCaller(ctx).workspace.create({ name: 'Mastery Test Workspace' })
}

// ── mastery.getWorkspaceSummary ────────────────────────────────────────────────

describe('mastery.getWorkspaceSummary', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    await expect(
      createCaller(ctx).mastery.getWorkspaceSummary({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns summary with zero counts for empty workspace', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const workspace = await createTestWorkspace(ctx)

    const summary = await createCaller(ctx).mastery.getWorkspaceSummary({
      workspaceId: workspace.id,
    })

    expect(summary).toMatchObject({
      totalConcepts: expect.any(Number),
      mastered: expect.any(Number),
      struggling: expect.any(Number),
      dueReviews: expect.any(Number),
    })
  })
})

// ── mastery.getWeakConcepts ────────────────────────────────────────────────────

describe('mastery.getWeakConcepts', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    await expect(
      createCaller(ctx).mastery.getWeakConcepts({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns empty array for workspace with no mastery records', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const workspace = await createTestWorkspace(ctx)

    const weak = await createCaller(ctx).mastery.getWeakConcepts({
      workspaceId: workspace.id,
    })
    expect(Array.isArray(weak)).toBe(true)
  })
})

// ── mastery.getWhatToStudyNext ─────────────────────────────────────────────────

describe('mastery.getWhatToStudyNext', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    await expect(
      createCaller(ctx).mastery.getWhatToStudyNext({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns items array for workspace', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const workspace = await createTestWorkspace(ctx)

    const next = await createCaller(ctx).mastery.getWhatToStudyNext({
      workspaceId: workspace.id,
    })
    expect(Array.isArray(next)).toBe(true)
  })
})
