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
        const { generateQuiz } = await import('@/../../../trigger/src/jobs/generate-quiz')
        await generateQuiz.trigger({ workspaceId: input.workspaceId })
      } catch (err) {
        console.error('[quiz.generate] Trigger failed:', err)
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
      .select('id, question, question_type, options, bloom_level, concept_id, order_index')
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

    const { count: questionCount, error: countError } = await ctx.supabase
      .from('quiz_questions')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', input.quizId)
    if (countError)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: countError.message })
    if (!questionCount) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Quiz has no questions' })
    }

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
        .select('id, quiz_id, correct_answer, question_type')
        .eq('id', input.questionId)
        .single()
      if (!question) throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      if (question.quiz_id !== attempt.quiz_id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      }

      const userNorm = input.userAnswer.trim().toLowerCase()
      const correctNorm = question.correct_answer.trim().toLowerCase()

      let isCorrect: boolean | null = null
      if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
        isCorrect = userNorm === correctNorm
      } else if (
        question.question_type === 'short_answer' ||
        question.question_type === 'fill_blank'
      ) {
        // Basic fuzzy match: exact match or contained-in for short answers
        isCorrect =
          userNorm === correctNorm ||
          correctNorm.includes(userNorm) ||
          userNorm.includes(correctNorm)
      }

      // Generate feedback based on correctness
      const feedback =
        isCorrect === true
          ? `Correct! The answer is "${question.correct_answer}".`
          : isCorrect === false
            ? `Incorrect. The correct answer is "${question.correct_answer}".`
            : null

      const { data: existing } = await ctx.supabase
        .from('quiz_responses')
        .select('id')
        .eq('attempt_id', input.attemptId)
        .eq('question_id', input.questionId)
        .maybeSingle()

      if (existing) {
        const { data: updated, error } = await ctx.supabase
          .from('quiz_responses')
          .update({
            user_answer: input.userAnswer,
            is_correct: isCorrect,
          })
          .eq('id', existing.id)
          .select('id, is_correct')
          .single()

        if (error || !updated) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message })
        }

        return { ...updated, feedback, correct_answer: question.correct_answer }
      }

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

      return { ...response, feedback, correct_answer: question.correct_answer }
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

      // Only count questions that were actually graded (is_correct !== null)
      const graded = (responses ?? []).filter((r) => r.is_correct !== null)
      const total = graded.length
      const correct = graded.filter((r) => r.is_correct).length
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

      // Upsert mastery records for quiz concepts
      const { data: questions } = await ctx.supabase
        .from('quiz_questions')
        .select('concept_id')
        .eq('quiz_id', attempt.quiz_id)
        .not('concept_id', 'is', null)

      const conceptIds = [...new Set((questions ?? []).map((q) => q.concept_id as string))]
      if (conceptIds.length > 0) {
        const masteryLevel = Math.min(0.3 + score * 0.5, 1.0) // 0.3 base + up to 0.5 from score
        const masteryRows = conceptIds.map((conceptId) => ({
          user_id: userId,
          concept_id: conceptId,
          workspace_id: attempt.workspace_id,
          mastery_level: masteryLevel,
          source: 'quiz',
        }))
        await ctx.supabase
          .from('mastery_records')
          .upsert(masteryRows, { onConflict: 'user_id,concept_id', ignoreDuplicates: false })
      }

      // Log QUIZ_COMPLETED event
      await ctx.supabase.from('ai_requests').insert({
        workspace_id: attempt.workspace_id,
        user_id: userId,
        model: 'n/a',
        provider: 'system',
        prompt_tokens: 0,
        completion_tokens: 0,
        cost_usd: 0,
        latency_ms: 0,
        task_name: 'QUIZ_COMPLETED',
      })

      return updated
    }),
})
