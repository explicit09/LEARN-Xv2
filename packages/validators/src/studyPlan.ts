import { z } from 'zod'

export const getTodayPlanSchema = z.object({
  workspaceId: z.string().uuid().optional(),
})

export const setExamDateSchema = z.object({
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  workspaceId: z.string().uuid().optional(),
})

export const getReadinessScoreSchema = z.object({
  workspaceId: z.string().uuid(),
})

export const markItemCompleteSchema = z.object({
  planId: z.string().uuid(),
  itemIndex: z.number().int().min(0),
})

export const planItemSchema = z.object({
  type: z.string(),
  resourceId: z.string(),
  title: z.string().optional(),
  estimatedMinutes: z.number().int().min(0),
  completed: z.boolean(),
  workspaceId: z.string().optional(),
})
