import { streamText, Output } from 'ai'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL_ROUTES } from '@/lib/ai'
import { buildLessonPrompt } from '@/lib/ai/prompts/lesson-generation.v1'
import { z } from 'zod'

// Flat schema — all fields required for provider compatibility
const lessonSectionZ = z.object({
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
  options: z.array(z.object({ label: z.string(), text: z.string(), is_correct: z.boolean() })),
  annotations: z.array(z.object({ line: z.number(), note: z.string() })),
  events: z.array(z.object({ date: z.string(), label: z.string(), description: z.string() })),
})

const lessonOutputSchema = z.object({
  title: z.string(),
  summary: z.string(),
  key_takeaways: z.array(z.string()),
  sections: z.array(lessonSectionZ),
})

export async function POST(req: NextRequest) {
  try {
    const { conceptName, workspaceId, prerequisites, retrievedChunks, persona } = await req.json()

    // Auth check
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const prompt = buildLessonPrompt({
      conceptName,
      prerequisites: prerequisites ?? [],
      retrievedChunks: retrievedChunks ?? [],
      persona,
    })

    const result = streamText({
      model: anthropic(MODEL_ROUTES.LESSON_GENERATION),
      output: Output.object({ schema: lessonOutputSchema }),
      prompt,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[lesson/stream] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
