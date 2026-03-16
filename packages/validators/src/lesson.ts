import { z } from 'zod'

// ---------------------------------------------------------------------------
// Lesson section discriminated union — mirrors docs/10-generative-ui.md
// Phase 1D: no interactive_widget (added in 1D+)
// ---------------------------------------------------------------------------

export const textSectionSchema = z.object({
  type: z.literal('text'),
  content: z.string().min(1),
})

export const conceptDefinitionSectionSchema = z.object({
  type: z.literal('concept_definition'),
  term: z.string().min(1),
  definition: z.string().min(1),
  analogy: z.string().optional(),
  etymology: z.string().optional(),
})

export const processFlowSectionSchema = z.object({
  type: z.literal('process_flow'),
  title: z.string().min(1),
  steps: z.array(
    z.object({
      label: z.string().min(1),
      description: z.string().min(1),
    }),
  ),
})

export const comparisonTableSectionSchema = z.object({
  type: z.literal('comparison_table'),
  title: z.string().min(1),
  columns: z.array(z.string()),
  rows: z.array(
    z.object({
      label: z.string(),
      values: z.array(z.string()),
    }),
  ),
})

export const analogyCardSectionSchema = z.object({
  type: z.literal('analogy_card'),
  concept: z.string().min(1),
  analogy: z.string().min(1),
  mapping: z.array(
    z.object({
      abstract: z.string(),
      familiar: z.string(),
    }),
  ),
})

export const keyTakeawaySectionSchema = z.object({
  type: z.literal('key_takeaway'),
  points: z.array(z.string().min(1)),
})

export const miniQuizSectionSchema = z.object({
  type: z.literal('mini_quiz'),
  question: z.string().min(1),
  options: z.array(
    z.object({
      label: z.string(),
      text: z.string(),
      is_correct: z.boolean(),
    }),
  ),
  explanation: z.string().min(1),
})

export const quoteBlockSectionSchema = z.object({
  type: z.literal('quote_block'),
  quote: z.string().min(1),
  attribution: z.string().min(1),
})

export const timelineSectionSchema = z.object({
  type: z.literal('timeline'),
  title: z.string().min(1),
  events: z.array(
    z.object({
      date: z.string(),
      label: z.string(),
      description: z.string(),
    }),
  ),
})

export const conceptBridgeSectionSchema = z.object({
  type: z.literal('concept_bridge'),
  from: z.string().min(1),
  to: z.string().min(1),
  relation: z.enum(['prerequisite', 'extends', 'related']),
  explanation: z.string().min(1),
})

export const codeExplainerSectionSchema = z.object({
  type: z.literal('code_explainer'),
  language: z.string().min(1),
  code: z.string().min(1),
  annotations: z.array(
    z.object({
      line: z.number().int().positive(),
      note: z.string(),
    }),
  ),
})

export const interactiveWidgetSectionSchema = z.object({
  type: z.literal('interactive_widget'),
  title: z.string().min(1),
  description: z.string(),
  html: z.string().min(1),
})

export const lessonSectionSchema = z.discriminatedUnion('type', [
  textSectionSchema,
  conceptDefinitionSectionSchema,
  processFlowSectionSchema,
  comparisonTableSectionSchema,
  analogyCardSectionSchema,
  keyTakeawaySectionSchema,
  miniQuizSectionSchema,
  quoteBlockSectionSchema,
  timelineSectionSchema,
  conceptBridgeSectionSchema,
  codeExplainerSectionSchema,
  interactiveWidgetSectionSchema,
])

export type LessonSection = z.infer<typeof lessonSectionSchema>

// ---------------------------------------------------------------------------
// tRPC input schemas
// ---------------------------------------------------------------------------

export const listLessonsSchema = z.object({
  workspaceId: z.string().uuid(),
})

export const getLessonSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
})

export const markCompleteSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
})

export const triggerGenerateLessonsSchema = z.object({
  workspaceId: z.string().uuid(),
})
