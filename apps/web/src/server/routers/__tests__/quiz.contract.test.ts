/**
 * Contract tests for quiz router.
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
  return caller.workspace.create({ name: 'Quiz Test Workspace' })
}

// ── quiz.list ─────────────────────────────────────────────────────────────────

describe('quiz.list', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.quiz.list({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns empty array for workspace with no quizzes', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const quizzes = await caller.quiz.list({ workspaceId: workspace.id })
    expect(Array.isArray(quizzes)).toBe(true)
    expect(quizzes.length).toBe(0)
  })
})

// ── quiz.get ──────────────────────────────────────────────────────────────────

describe('quiz.get', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.quiz.get({
        id: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('throws NOT_FOUND for non-existent quiz', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    await expect(
      caller.quiz.get({
        id: '550e8400-e29b-41d4-a716-446655440099',
        workspaceId: workspace.id,
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))
  })
})

// ── quiz.startAttempt / submitResponse / completeAttempt ──────────────────────

describe('quiz attempt flow', () => {
  it('throws UNAUTHORIZED on startAttempt when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.quiz.startAttempt({
        quizId: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('throws NOT_FOUND when starting attempt on non-existent quiz', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    await expect(
      caller.quiz.startAttempt({
        quizId: '550e8400-e29b-41d4-a716-446655440099',
        workspaceId: workspace.id,
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))

    await ctx._cleanup?.()
  })

  it('rejects starting an attempt for a quiz with no questions', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    try {
      const { data: quiz } = await ctx.supabase
        .from('quizzes')
        .insert({
          workspace_id: workspace.id,
          title: 'Empty quiz',
          quiz_type: 'practice',
        })
        .select('id')
        .single()

      await expect(
        caller.quiz.startAttempt({
          quizId: quiz!.id as string,
          workspaceId: workspace.id,
        }),
      ).rejects.toThrow(
        expect.objectContaining({ code: 'BAD_REQUEST' } satisfies Partial<TRPCError>),
      )
    } finally {
      await ctx._cleanup?.()
    }
  })

  it('rejects submitting a question that does not belong to the attempt quiz', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    try {
      const { data: userRow } = await ctx.supabase
        .from('users')
        .select('id')
        .eq('auth_id', ctx.user!.id)
        .single()

      const { data: quizA } = await ctx.supabase
        .from('quizzes')
        .insert({
          workspace_id: workspace.id,
          title: 'Quiz A',
          quiz_type: 'practice',
        })
        .select('id')
        .single()

      const { data: quizB } = await ctx.supabase
        .from('quizzes')
        .insert({
          workspace_id: workspace.id,
          title: 'Quiz B',
          quiz_type: 'practice',
        })
        .select('id')
        .single()

      const { data: validQuestion } = await ctx.supabase
        .from('quiz_questions')
        .insert({
          quiz_id: quizA!.id,
          question: '2 + 2 = ?',
          question_type: 'multiple_choice',
          options: ['3', '4', '5'],
          correct_answer: '4',
          order_index: 0,
        })
        .select('id')
        .single()

      const { data: foreignQuestion } = await ctx.supabase
        .from('quiz_questions')
        .insert({
          quiz_id: quizB!.id,
          question: '5 + 5 = ?',
          question_type: 'multiple_choice',
          options: ['9', '10', '11'],
          correct_answer: '10',
          order_index: 0,
        })
        .select('id')
        .single()

      expect(userRow).toBeTruthy()
      expect(validQuestion).toBeTruthy()
      expect(foreignQuestion).toBeTruthy()

      const attempt = await caller.quiz.startAttempt({
        quizId: quizA!.id as string,
        workspaceId: workspace.id,
      })

      await caller.quiz.submitResponse({
        attemptId: attempt.id,
        questionId: validQuestion!.id as string,
        userAnswer: '4',
      })

      await expect(
        caller.quiz.submitResponse({
          attemptId: attempt.id,
          questionId: foreignQuestion!.id as string,
          userAnswer: '10',
        }),
      ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))
    } finally {
      await ctx._cleanup?.()
    }
  })

  it('does not create duplicate responses when the same question is submitted twice', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    try {
      const { data: quiz } = await ctx.supabase
        .from('quizzes')
        .insert({
          workspace_id: workspace.id,
          title: 'Single question quiz',
          quiz_type: 'practice',
        })
        .select('id')
        .single()

      const { data: question } = await ctx.supabase
        .from('quiz_questions')
        .insert({
          quiz_id: quiz!.id,
          question: 'Capital of France?',
          question_type: 'multiple_choice',
          options: ['A) London', 'B) Paris', 'C) Rome'],
          correct_answer: 'B',
          order_index: 0,
        })
        .select('id')
        .single()

      const attempt = await caller.quiz.startAttempt({
        quizId: quiz!.id as string,
        workspaceId: workspace.id,
      })

      await caller.quiz.submitResponse({
        attemptId: attempt.id,
        questionId: question!.id as string,
        userAnswer: 'B',
      })

      await caller.quiz.submitResponse({
        attemptId: attempt.id,
        questionId: question!.id as string,
        userAnswer: 'B',
      })

      const { count } = await ctx.supabase
        .from('quiz_responses')
        .select('id', { count: 'exact', head: true })
        .eq('attempt_id', attempt.id)
        .eq('question_id', question!.id as string)

      expect(count).toBe(1)
    } finally {
      await ctx._cleanup?.()
    }
  })
})
