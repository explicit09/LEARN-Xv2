import { z } from 'zod'

export const flashcardSourceTypeEnum = z.enum(['lesson', 'workspace', 'manual'])

export const createFlashcardSetSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().min(1),
  sourceType: flashcardSourceTypeEnum,
  sourceId: z.string().uuid().optional(),
})

export const getFlashcardSetSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
})

export const getDueFlashcardsSchema = z.object({
  workspaceId: z.string().uuid(),
  limit: z.number().int().positive().optional(),
})

export const submitReviewSchema = z.object({
  cardId: z.string().uuid(),
  rating: z.number().int().min(1).max(4),
})

export const triggerGenerateFlashcardsSchema = z.object({
  workspaceId: z.string().uuid(),
  lessonId: z.string().uuid().optional(),
})
