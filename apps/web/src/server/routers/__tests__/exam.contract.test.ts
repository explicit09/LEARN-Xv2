/**
 * Contract tests for exam router.
 * Requires: Supabase running with Phase 2A migration applied.
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
  return caller.workspace.create({ name: 'Exam Test Workspace' })
}

// ── exam.list ─────────────────────────────────────────────────────────────────

describe('exam.list', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.exam.list({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns empty array for workspace with no exams', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const exams = await caller.exam.list({ workspaceId: workspace.id })
    expect(Array.isArray(exams)).toBe(true)
    expect(exams.length).toBe(0)

    await ctx._cleanup?.()
  })
})

// ── exam.get ──────────────────────────────────────────────────────────────────

describe('exam.get', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.exam.get({
        examId: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('throws NOT_FOUND for non-existent exam', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    await expect(
      caller.exam.get({
        examId: '550e8400-e29b-41d4-a716-446655440099',
        workspaceId: workspace.id,
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))

    await ctx._cleanup?.()
  })
})

// ── exam.generate ─────────────────────────────────────────────────────────────

describe('exam.generate', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.exam.generate({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns jobId when triggered', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const result = await caller.exam.generate({ workspaceId: workspace.id })
    expect(result).toHaveProperty('jobId')
    expect(typeof result.jobId).toBe('string')

    await ctx._cleanup?.()
  })
})

// ── exam.start ────────────────────────────────────────────────────────────────

describe('exam.start', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.exam.start({
        examId: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('throws NOT_FOUND for non-existent exam', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    await expect(
      caller.exam.start({
        examId: '550e8400-e29b-41d4-a716-446655440099',
        workspaceId: workspace.id,
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))

    await ctx._cleanup?.()
  })

  it('rejects starting an exam with no questions', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    try {
      const { data: userRow } = await ctx.supabase
        .from('users')
        .select('id')
        .eq('auth_id', ctx.user!.id)
        .single()

      const { data: exam } = await ctx.supabase
        .from('exams')
        .insert({
          workspace_id: workspace.id,
          user_id: userRow!.id,
          title: 'Empty exam',
          status: 'active',
        })
        .select('id')
        .single()

      await expect(
        caller.exam.start({
          examId: exam!.id as string,
          workspaceId: workspace.id,
        }),
      ).rejects.toThrow(
        expect.objectContaining({ code: 'BAD_REQUEST' } satisfies Partial<TRPCError>),
      )
    } finally {
      await ctx._cleanup?.()
    }
  })
})

// ── exam.complete ─────────────────────────────────────────────────────────────

describe('exam.complete', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.exam.complete({
        attemptId: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('prevents submitting more responses after an attempt is completed', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    try {
      const { data: userRow } = await ctx.supabase
        .from('users')
        .select('id')
        .eq('auth_id', ctx.user!.id)
        .single()

      const { data: exam } = await ctx.supabase
        .from('exams')
        .insert({
          workspace_id: workspace.id,
          user_id: userRow!.id,
          title: 'Final Exam',
          status: 'active',
        })
        .select('id')
        .single()

      const { data: question } = await ctx.supabase
        .from('exam_questions')
        .insert({
          exam_id: exam!.id,
          workspace_id: workspace.id,
          question: 'The earth is round.',
          question_type: 'true_false',
          correct_answer: 'true',
          order_index: 0,
        })
        .select('id')
        .single()

      const started = await caller.exam.start({
        examId: exam!.id as string,
        workspaceId: workspace.id,
      })

      await caller.exam.submitResponse({
        attemptId: started.attempt.id as string,
        questionId: question!.id as string,
        userAnswer: 'true',
      })

      const completed = await caller.exam.complete({
        attemptId: started.attempt.id as string,
        workspaceId: workspace.id,
      })

      expect(completed).toHaveProperty('score')

      await expect(
        caller.exam.submitResponse({
          attemptId: started.attempt.id as string,
          questionId: question!.id as string,
          userAnswer: 'false',
        }),
      ).rejects.toThrow(expect.objectContaining({ code: 'FORBIDDEN' } satisfies Partial<TRPCError>))
    } finally {
      await ctx._cleanup?.()
    }
  })
})

// ── exam.share ────────────────────────────────────────────────────────────────

describe('exam.share', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.exam.share({
        examId: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })
})

// ── exam.joinByToken ──────────────────────────────────────────────────────────

describe('exam.joinByToken', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(caller.exam.joinByToken({ joinToken: 'ABC123' })).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('throws NOT_FOUND for invalid token', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    await expect(caller.exam.joinByToken({ joinToken: 'INVALID' })).rejects.toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>),
    )

    await ctx._cleanup?.()
  })
})
