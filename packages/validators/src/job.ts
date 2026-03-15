import { z } from 'zod'

export const jobStatusEnum = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled'])

export const jobSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  type: z.string(),
  status: jobStatusEnum,
  progress: z.number().int().min(0).max(100).default(0),
  message: z.string().optional(),
  inputData: z.record(z.unknown()).default({}),
  outputData: z.record(z.unknown()).default({}),
  error: z.string().optional(),
  triggerId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
})
