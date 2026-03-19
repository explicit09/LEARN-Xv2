import { z } from 'zod'

/**
 * Flat lesson section schema for LLM tool calls.
 *
 * All fields required (LLM fills relevant ones per type, uses "" / [] for the rest).
 * This flat shape works reliably across all LLM providers — discriminated unions
 * cause schema-following failures on some models.
 *
 * Extracted from trigger/src/jobs/generate-lessons.ts to share with lesson-chat.
 */
export const lessonSectionZ = z.object({
  type: z.string(),
  content: z.string(),
  term: z.string(),
  definition: z.string(),
  analogy: z.string(),
  title: z.string(),
  question: z.string(),
  explanation: z.string(),
  concept: z.string(),
  from_concept: z.string(),
  to_concept: z.string(),
  relation: z.string(),
  language: z.string(),
  code: z.string(),
  quote: z.string(),
  attribution: z.string(),
  description: z.string(),
  html: z.string(),
  points: z.array(z.string()),
  columns: z.array(z.string()),
  steps: z.array(z.object({ label: z.string(), description: z.string() })),
  rows: z.array(z.object({ label: z.string(), values: z.array(z.string()) })),
  mapping: z.array(z.object({ abstract: z.string(), familiar: z.string() })),
  options: z.array(
    z.object({
      label: z.string(),
      text: z.string(),
      is_correct: z.boolean(),
    }),
  ),
  annotations: z.array(z.object({ line: z.number(), note: z.string() })),
  events: z.array(
    z.object({
      date: z.string(),
      label: z.string(),
      description: z.string(),
    }),
  ),
})

export type FlatLessonSection = z.infer<typeof lessonSectionZ>
