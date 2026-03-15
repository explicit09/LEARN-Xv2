/**
 * Contract tests for studyPlan router.
 * Requires: Supabase running with Phase 2C migration applied.
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
  return caller.workspace.create({ name: 'Study Plan Test Workspace' })
}

// ── studyPlan.getToday ─────────────────────────────────────────────────────────

describe('studyPlan.getToday', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(caller.studyPlan.getToday({})).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns a plan (possibly empty items) for authenticated user', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    const plan = await caller.studyPlan.getToday({})
    expect(plan).toHaveProperty('items')
    expect(Array.isArray(plan.items)).toBe(true)

    await ctx._cleanup?.()
  })

  it('returns plan scoped to workspace when workspaceId given', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const plan = await caller.studyPlan.getToday({ workspaceId: workspace.id })
    expect(plan).toHaveProperty('items')
    expect(Array.isArray(plan.items)).toBe(true)

    await ctx._cleanup?.()
  })
})

// ── studyPlan.setExamDate ──────────────────────────────────────────────────────

describe('studyPlan.setExamDate', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(caller.studyPlan.setExamDate({ examDate: '2026-04-01' })).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('sets exam date and returns updated plan', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    const result = await caller.studyPlan.setExamDate({ examDate: '2026-04-15' })
    expect(result).toHaveProperty('examDate')
    expect(result.examDate).toBe('2026-04-15')

    await ctx._cleanup?.()
  })
})

// ── studyPlan.getReadinessScore ────────────────────────────────────────────────

describe('studyPlan.getReadinessScore', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.studyPlan.getReadinessScore({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns readiness score between 0 and 1', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const result = await caller.studyPlan.getReadinessScore({ workspaceId: workspace.id })
    expect(result).toHaveProperty('readinessScore')
    expect(result.readinessScore).toBeGreaterThanOrEqual(0)
    expect(result.readinessScore).toBeLessThanOrEqual(1)

    await ctx._cleanup?.()
  })
})

// ── studyPlan.markItemComplete ─────────────────────────────────────────────────

describe('studyPlan.markItemComplete', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.studyPlan.markItemComplete({
        planId: '550e8400-e29b-41d4-a716-446655440000',
        itemIndex: 0,
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })
})
