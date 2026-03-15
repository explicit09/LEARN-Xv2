import { z } from 'zod'

export const conceptRelationTypeEnum = z.enum([
  'prerequisite',
  'related',
  'part_of',
  'extends',
])
export type ConceptRelationType = z.infer<typeof conceptRelationTypeEnum>

export const conceptSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Concept = z.infer<typeof conceptSchema>
