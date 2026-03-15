import { z } from 'zod'

export const quizTypeEnum = z.enum(['practice', 'review', 'exam_prep', 'diagnostic'])

export const createQuizSchema = z.object({
  workspaceId: z.string().uuid(),
  lessonId: z.string().uuid().optional(),
  quizType: quizTypeEnum.default('practice'),
  title: z.string().min(1).optional(),
})

export const getQuizSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
})

export const startAttemptSchema = z.object({
  quizId: z.string().uuid(),
  workspaceId: z.string().uuid(),
})

export const submitResponseSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  userAnswer: z.string().min(1),
})

export const completeAttemptSchema = z.object({
  attemptId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  timeSpentSeconds: z.number().int().nonnegative().optional(),
})

export const triggerGenerateQuizSchema = z.object({
  workspaceId: z.string().uuid(),
  lessonId: z.string().uuid().optional(),
})
