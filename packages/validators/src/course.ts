import { z } from 'zod'

export const createCourseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
})

export const joinCourseSchema = z.object({
  joinCode: z.string().length(8),
})

export const addDocumentSchema = z.object({
  courseId: z.string().uuid(),
  documentId: z.string().uuid(),
})

export const updateCourseSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
})
