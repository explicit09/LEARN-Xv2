import { z } from 'zod'

export const tagConceptSchema = z.object({
  conceptId: z.string().uuid(),
  tag: z.string().min(1),
  domain: z.string().min(1).optional(),
})

export const getGraphSchema = z.object({
  workspaceId: z.string().uuid(),
  depth: z.number().int().min(1).max(5).optional(),
})

export const graphNodeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  masteryLevel: z.number().min(0).max(1).optional(),
  tag: z.string().optional(),
  domain: z.string().optional(),
})

const relationTypeEnum = z.enum(['prerequisite', 'related', 'extends', 'part_of'])

export const graphEdgeSchema = z.object({
  source: z.string().uuid(),
  target: z.string().uuid(),
  relationType: relationTypeEnum,
})

export type TagConceptInput = z.infer<typeof tagConceptSchema>
export type GetGraphInput = z.infer<typeof getGraphSchema>
export type GraphNode = z.infer<typeof graphNodeSchema>
export type GraphEdge = z.infer<typeof graphEdgeSchema>
