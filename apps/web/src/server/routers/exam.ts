import { randomBytes } from 'crypto'
import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'

function generateJoinToken(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

import {
  completeExamSchema,
  generateExamSchema,
  getExamSchema,
  joinExamSchema,
  listExamsSchema,
  shareExamSchema,
  startExamSchema,
  submitExamResponseSchema,
} from '@learn-x/validators'

import { createTRPCRouter, protectedProcedure } from '../trpc'

async function resolveUserId(supabase: SupabaseClient, authId: string): Promise<string> {
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single()
  if (error || !user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
  return user.id as string
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
  return workspace.id as string
}

export const examRouter = createTRPCRouter({
  /**
   * List all exams in a workspace.
   */
  list: protectedProcedure.input(listExamsSchema).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    const { data } = await ctx.supabase
      .from('exams')
      .select('id, title, description, time_limit_minutes, status, join_token, created_at')
      .eq('workspace_id', input.workspaceId)
      .order('created_at', { ascending: false })

    return data ?? []
  }),

  /**
   * Get exam + questions (answers hidden until attempt complete).
   */
  get: protectedProcedure.input(getExamSchema).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    const { data: exam } = await ctx.supabase
      .from('exams')
      .select('id, title, description, time_limit_minutes, status, created_at')
      .eq('id', input.examId)
      .eq('workspace_id', input.workspaceId)
      .single()

    if (!exam) throw new TRPCError({ code: 'NOT_FOUND', message: 'Exam not found' })

    const { data: questions } = await ctx.supabase
      .from('exam_questions')
      .select('id, question, question_type, options, bloom_level, order_index')
      .eq('exam_id', input.examId)
      .order('order_index', { ascending: true })

    return { ...exam, questions: questions ?? [] }
  }),

  /**
   * Trigger exam generation job, returns jobId.
   */
  generate: protectedProcedure.input(generateExamSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    const { data: job, error: jobError } = await ctx.supabase
      .from('jobs')
      .insert({
        workspace_id: input.workspaceId,
        user_id: userId,
        type: 'generate_exam',
        status: 'pending',
        progress: 0,
      })
      .select('id')
      .single()

    if (jobError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

    try {
      const { generateExam } = await import('@/../../../trigger/src/jobs/generate-exam')
      const triggerPayload: { workspaceId: string; userId: string; lessonId?: string } = {
        workspaceId: input.workspaceId,
        userId,
      }
      if (input.lessonId) triggerPayload.lessonId = input.lessonId
      await generateExam.trigger(triggerPayload)
    } catch {
      // TRIGGER_SECRET_KEY not set in dev/test — job row still created
    }

    return { jobId: job!.id as string, status: 'queued' as const }
  }),

  /**
   * Start exam attempt — creates attempt row, returns attempt + questions.
   */
  start: protectedProcedure.input(startExamSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)

    const { data: exam } = await ctx.supabase
      .from('exams')
      .select('id, workspace_id, time_limit_minutes, status')
      .eq('id', input.examId)
      .eq('workspace_id', input.workspaceId)
      .single()

    if (!exam) throw new TRPCError({ code: 'NOT_FOUND', message: 'Exam not found' })

    const { data: questions, error: questionsError } = await ctx.supabase
      .from('exam_questions')
      .select('id, question, question_type, options, bloom_level, order_index')
      .eq('exam_id', input.examId)
      .order('order_index', { ascending: true })

    if (questionsError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: questionsError.message })
    }
    if (!questions?.length) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Exam has no questions' })
    }

    const { data: attempt, error } = await ctx.supabase
      .from('exam_attempts')
      .insert({
        exam_id: input.examId,
        user_id: userId,
        workspace_id: input.workspaceId,
        started_at: new Date().toISOString(),
      })
      .select('id, exam_id, started_at')
      .single()

    if (error || !attempt)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message })

    return {
      attempt,
      questions: questions ?? [],
      timeLimitMinutes: exam.time_limit_minutes,
    }
  }),

  /**
   * Submit a response for one question in an attempt.
   */
  submitResponse: protectedProcedure
    .input(submitExamResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)

      const { data: attempt } = await ctx.supabase
        .from('exam_attempts')
        .select('id, exam_id, completed_at')
        .eq('id', input.attemptId)
        .eq('user_id', userId)
        .single()
      if (!attempt) throw new TRPCError({ code: 'NOT_FOUND', message: 'Attempt not found' })
      if (attempt.completed_at) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Exam attempt already completed' })
      }

      const { data: question } = await ctx.supabase
        .from('exam_questions')
        .select('id, exam_id')
        .eq('id', input.questionId)
        .single()
      if (!question || question.exam_id !== attempt.exam_id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      }

      // Upsert response (allow overwrite before completion)
      const { data: existing } = await ctx.supabase
        .from('exam_responses')
        .select('id')
        .eq('attempt_id', input.attemptId)
        .eq('question_id', input.questionId)
        .single()

      if (existing) {
        await ctx.supabase
          .from('exam_responses')
          .update({ user_answer: input.userAnswer })
          .eq('id', existing.id)
        return { id: existing.id, saved: true }
      }

      const { data: response, error } = await ctx.supabase
        .from('exam_responses')
        .insert({
          attempt_id: input.attemptId,
          question_id: input.questionId,
          user_answer: input.userAnswer,
        })
        .select('id')
        .single()

      if (error || !response)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message })

      return { id: response.id as string, saved: true }
    }),

  /**
   * Complete exam — auto-score, update mastery, return score + per-question review.
   */
  complete: protectedProcedure.input(completeExamSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)

    const { data: attempt } = await ctx.supabase
      .from('exam_attempts')
      .select('id, exam_id, completed_at')
      .eq('id', input.attemptId)
      .eq('user_id', userId)
      .single()
    if (!attempt) throw new TRPCError({ code: 'NOT_FOUND', message: 'Attempt not found' })
    if (attempt.completed_at) return { alreadyCompleted: true, score: null }

    // Fetch all questions with correct answers
    const { data: questions } = await ctx.supabase
      .from('exam_questions')
      .select('id, question_type, correct_answer, explanation, concept_id')
      .eq('exam_id', attempt.exam_id)

    // Fetch all responses
    const { data: responses } = await ctx.supabase
      .from('exam_responses')
      .select('id, question_id, user_answer')
      .eq('attempt_id', input.attemptId)

    const questionsMap = new Map((questions ?? []).map((q) => [q.id, q]))

    let correct = 0
    const total = questions?.length ?? 0
    const reviewed = []

    for (const response of responses ?? []) {
      const question = questionsMap.get(response.question_id)
      if (!question) continue

      const autoGradable =
        question.question_type === 'mcq' || question.question_type === 'true_false'
      const isCorrect = autoGradable
        ? response.user_answer?.trim().toLowerCase() ===
          question.correct_answer?.trim().toLowerCase()
        : null

      if (isCorrect) correct++

      await ctx.supabase
        .from('exam_responses')
        .update({
          is_correct: isCorrect,
          feedback: question.explanation ?? null,
          points_earned: isCorrect ? 1 : 0,
        })
        .eq('id', response.id)

      reviewed.push({
        questionId: response.question_id,
        userAnswer: response.user_answer,
        correctAnswer: question.correct_answer,
        isCorrect,
        feedback: question.explanation,
      })
    }

    const score = total > 0 ? correct / total : 0

    const startedAtRow = await ctx.supabase
      .from('exam_attempts')
      .select('started_at')
      .eq('id', input.attemptId)
      .single()
    const startedAt = startedAtRow.data?.started_at
      ? new Date(startedAtRow.data.started_at as string)
      : new Date()
    const timeSpentSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000)

    await ctx.supabase
      .from('exam_attempts')
      .update({
        score,
        completed_at: new Date().toISOString(),
        time_spent_seconds: timeSpentSeconds,
      })
      .eq('id', input.attemptId)

    // Upsert mastery records for exam concepts
    const conceptIds = [
      ...new Set((questions ?? []).map((q) => q.concept_id as string).filter(Boolean)),
    ]
    if (conceptIds.length > 0) {
      const { data: exam } = await ctx.supabase
        .from('exams')
        .select('workspace_id')
        .eq('id', attempt.exam_id)
        .single()
      if (exam) {
        const masteryLevel = Math.min(0.3 + score * 0.5, 1.0)
        const masteryRows = conceptIds.map((conceptId) => ({
          user_id: userId,
          concept_id: conceptId,
          workspace_id: exam.workspace_id,
          mastery_level: masteryLevel,
          source: 'exam',
        }))
        await ctx.supabase
          .from('mastery_records')
          .upsert(masteryRows, { onConflict: 'user_id,concept_id', ignoreDuplicates: false })
      }
    }

    return { score, total, correct, timeSpentSeconds, reviewed }
  }),

  /**
   * Generate a join token for sharing an exam.
   */
  share: protectedProcedure.input(shareExamSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    // Generate a URL-safe 8-char token
    const joinToken = generateJoinToken()

    const { data: exam, error } = await ctx.supabase
      .from('exams')
      .update({ join_token: joinToken })
      .eq('id', input.examId)
      .eq('workspace_id', input.workspaceId)
      .eq('user_id', userId)
      .select('id, join_token')
      .single()

    if (error || !exam) throw new TRPCError({ code: 'NOT_FOUND', message: 'Exam not found' })

    return { joinToken: exam.join_token as string, examId: exam.id as string }
  }),

  /**
   * Find exam by join token, return examId for redirect.
   */
  joinByToken: protectedProcedure.input(joinExamSchema).query(async ({ ctx, input }) => {
    // Ensure user is authenticated (resolveUserId validates)
    await resolveUserId(ctx.supabase, ctx.user.id)

    const { data: exam } = await ctx.supabase
      .from('exams')
      .select('id, workspace_id, title')
      .eq('join_token', input.joinToken)
      .single()

    if (!exam) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid join token' })

    return { examId: exam.id as string, workspaceId: exam.workspace_id as string }
  }),
})
