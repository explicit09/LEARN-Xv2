import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  completeAttemptSchema,
  getQuizSchema,
  startAttemptSchema,
  submitResponseSchema,
} from '@learn-x/validators'

import { createTRPCRouter, protectedProcedure } from '../trpc'

async function resolveUserId(supabase: SupabaseClient, authId: string): Promise<string> {
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single()
  if (error || !user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
  return user.id
}

async function resolveWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<string> {
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .single()
  if (!workspace) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })
  return workspace.id
}

export const quizRouter = createTRPCRouter({
  generate: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      try {
        const { tasks } = await import('@trigger.dev/sdk/v3')
        await tasks.trigger('generate-quiz', { workspaceId: input.workspaceId })
      } catch {
        // Trigger.dev not available in all environments — best effort
      }

      return { started: true }
    }),

  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      const { data } = await ctx.supabase
        .from('quizzes')
        .select('id, workspace_id, lesson_id, quiz_type, title, created_at, updated_at')
        .eq('workspace_id', input.workspaceId)
        .order('created_at', { ascending: false })

      return data ?? []
    }),

  get: protectedProcedure.input(getQuizSchema).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    const { data: quiz } = await ctx.supabase
      .from('quizzes')
      .select('id, workspace_id, lesson_id, quiz_type, title, created_at')
      .eq('id', input.id)
      .eq('workspace_id', input.workspaceId)
      .single()
    if (!quiz) throw new TRPCError({ code: 'NOT_FOUND', message: 'Quiz not found' })

    const { data: questions } = await ctx.supabase
      .from('quiz_questions')
      .select(
        'id, question, question_type, options, correct_answer, bloom_level, concept_id, order_index',
      )
      .eq('quiz_id', input.id)
      .order('order_index', { ascending: true })

    return { ...quiz, questions: questions ?? [] }
  }),

  startAttempt: protectedProcedure.input(startAttemptSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    const { data: quiz } = await ctx.supabase
      .from('quizzes')
      .select('id')
      .eq('id', input.quizId)
      .eq('workspace_id', input.workspaceId)
      .single()
    if (!quiz) throw new TRPCError({ code: 'NOT_FOUND', message: 'Quiz not found' })

    const { data: attempt, error } = await ctx.supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: input.quizId,
        user_id: userId,
        workspace_id: input.workspaceId,
      })
      .select('id, quiz_id, workspace_id, created_at')
      .single()

    if (error || !attempt)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message })

    return attempt
  }),

  submitResponse: protectedProcedure
    .input(submitResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)

      // Verify attempt belongs to this user
      const { data: attempt } = await ctx.supabase
        .from('quiz_attempts')
        .select('id, quiz_id')
        .eq('id', input.attemptId)
        .eq('user_id', userId)
        .single()
      if (!attempt) throw new TRPCError({ code: 'NOT_FOUND', message: 'Attempt not found' })

      const { data: question } = await ctx.supabase
        .from('quiz_questions')
        .select('id, correct_answer, question_type')
        .eq('id', input.questionId)
        .single()
      if (!question) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })

      const isCorrect =
        question.question_type === 'multiple_choice' || question.question_type === 'true_false'
          ? input.userAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()
          : null

      const { data: response, error } = await ctx.supabase
        .from('quiz_responses')
        .insert({
          attempt_id: input.attemptId,
          question_id: input.questionId,
          user_answer: input.userAnswer,
          is_correct: isCorrect,
        })
        .select('id, is_correct')
        .single()

      if (error || !response)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message })

      return response
    }),

  completeAttempt: protectedProcedure
    .input(completeAttemptSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)

      const { data: attempt } = await ctx.supabase
        .from('quiz_attempts')
        .select('id, quiz_id, workspace_id')
        .eq('id', input.attemptId)
        .eq('user_id', userId)
        .single()
      if (!attempt) throw new TRPCError({ code: 'NOT_FOUND', message: 'Attempt not found' })

      const { data: responses } = await ctx.supabase
        .from('quiz_responses')
        .select('is_correct')
        .eq('attempt_id', input.attemptId)

      const total = responses?.length ?? 0
      const correct = responses?.filter((r) => r.is_correct).length ?? 0
      const score = total > 0 ? correct / total : 0

      const { data: updated, error } = await ctx.supabase
        .from('quiz_attempts')
        .update({
          score,
          completed_at: new Date().toISOString(),
          ...(input.timeSpentSeconds != null ? { time_spent_seconds: input.timeSpentSeconds } : {}),
        })
        .eq('id', input.attemptId)
        .select('id, score, completed_at')
        .single()

      if (error || !updated)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message })

      return updated
    }),
})
