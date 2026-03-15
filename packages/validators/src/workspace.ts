import { z } from 'zod'

export const workspaceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['active', 'archived', 'processing']).default('active'),
  settings: z.record(z.unknown()).default({}),
  totalTokenCount: z.number().int().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['active', 'archived', 'processing']).default('active'),
  settings: z.record(z.unknown()).default({}),
  totalTokenCount: z.number().int().default(0),
})

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'archived', 'processing']).optional(),
})
