import { z } from 'zod'

export const examStatusEnum = z.enum(['draft', 'active', 'closed'])

export const questionTypeEnum = z.enum(['mcq', 'short_answer', 'true_false', 'fill_blank'])

export const bloomLevelEnum = z.enum([
  'remember',
  'understand',
  'apply',
  'analyze',
  'evaluate',
  'create',
])

export const createExamSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  timeLimitMinutes: z.number().int().min(1).optional(),
})

export const startExamSchema = z.object({
  examId: z.string().uuid(),
  workspaceId: z.string().uuid(),
})

export const submitExamResponseSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  userAnswer: z.string().min(1),
})

export const completeExamSchema = z.object({
  attemptId: z.string().uuid(),
  workspaceId: z.string().uuid(),
})

export const joinExamSchema = z.object({
  joinToken: z.string().min(6),
})

export const getExamSchema = z.object({
  examId: z.string().uuid(),
  workspaceId: z.string().uuid(),
})

export const listExamsSchema = z.object({
  workspaceId: z.string().uuid(),
})

export const generateExamSchema = z.object({
  workspaceId: z.string().uuid(),
  lessonId: z.string().uuid().optional(),
})

export const shareExamSchema = z.object({
  examId: z.string().uuid(),
  workspaceId: z.string().uuid(),
})
