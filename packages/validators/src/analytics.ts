import { z } from 'zod'

export const getDashboardSchema = z.object({}).optional()

export const getStudyHeatmapSchema = z.object({
  year: z.number().int().min(2024).max(2030).optional(),
})
