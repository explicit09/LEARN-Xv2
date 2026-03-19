import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import { generateText, Output } from 'ai'
import { z } from 'zod'

import { anthropic, MODEL_ROUTES } from '../lib/ai'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const REMEDIATION_PROMPT_VERSION = 'remediation-lesson.v1'

function makeSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface GenerateRemediationPayload {
  workspaceId: string
  conceptId: string
  userId: string
}

const remediationSchema = z.object({
  title: z.string(),
  content: z.string().min(200),
  summary: z.string(),
  keyTakeaways: z.array(z.string()).min(2).max(5),
  practiceQuestions: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
        type: z.enum(['mcq', 'short_answer', 'true_false']),
        options: z.array(z.string()).optional(),
      }),
    )
    .min(3)
    .max(3),
})

export const generateRemediation = task({
  id: 'generate-remediation',
  run: async (payload: GenerateRemediationPayload) => {
    const supabase = makeSupabase()
    const { workspaceId, conceptId, userId } = payload

    // Fetch concept details
    const { data: concept } = await supabase
      .from('concepts')
      .select('id, name, description')
      .eq('id', conceptId)
      .single()

    if (!concept) {
      logger.warn('Concept not found', { conceptId })
      return { skipped: true }
    }

    // Fetch weakness data
    const { data: mastery } = await supabase
      .from('mastery_records')
      .select('mastery_level, stability, lapse_count')
      .eq('concept_id', conceptId)
      .eq('workspace_id', workspaceId)
      .single()

    // Fetch related chunks via direct text search (hybrid_search not callable from trigger)
    const { data: chunks } = await supabase
      .from('chunks')
      .select('content, enriched_content')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!chunks?.length) {
      logger.info('No chunks for remediation', { workspaceId, conceptId })
      return { skipped: true }
    }

    const weaknessContext = mastery
      ? `Current mastery level: ${Math.round((mastery.mastery_level as number) * 100)}%. Lapses: ${mastery.lapse_count ?? 0}.`
      : 'No prior mastery data — treating as new concept.'

    const chunkTexts = chunks
      .map((c) => c.enriched_content ?? c.content)
      .slice(0, 6)
      .join('\n\n---\n\n')

    const prompt = `You are a remediation tutor. A student is struggling with the concept "${concept.name}".

${concept.description ? `Concept: ${concept.description}\n\n` : ''}
${weaknessContext}

Source material:
${chunkTexts}

Create a targeted remediation lesson (500-800 words) that:
1. Identifies and addresses common misconceptions
2. Explains the concept step by step with clear examples
3. Uses analogies to make abstract ideas concrete
4. Ends with 3 practice questions (must include at least one MCQ)

Return valid JSON matching the schema.`

    const startMs = Date.now()
    const { output, usage } = await generateText({
      model: anthropic(MODEL_ROUTES.LESSON_GENERATION),
      output: Output.object({ schema: remediationSchema }),
      prompt,
    })

    const latencyMs = Date.now() - startMs

    // Rule 6: Every LLM call is tracked
    await supabase.from('ai_requests').insert({
      workspace_id: workspaceId,
      user_id: userId,
      model: MODEL_ROUTES.LESSON_GENERATION,
      prompt_tokens: usage.inputTokens ?? 0,
      completion_tokens: usage.outputTokens ?? 0,
      cost_usd: (usage.inputTokens ?? 0) * 0.000003 + (usage.outputTokens ?? 0) * 0.000015,
      latency_ms: latencyMs,
      task_name: REMEDIATION_PROMPT_VERSION,
    })

    // Insert remediation lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        title: output.title,
        content_markdown: output.content,
        structured_sections: [],
        summary: output.summary,
        key_takeaways: output.keyTakeaways,
        prompt_version: REMEDIATION_PROMPT_VERSION,
        model_used: MODEL_ROUTES.LESSON_GENERATION,
        is_completed: false,
        order_index: 9999, // append at end
      })
      .select('id')
      .single()

    if (lessonError || !lesson) {
      throw new Error(`Failed to insert remediation lesson: ${lessonError?.message}`)
    }

    // Link lesson to concept
    await supabase.from('lesson_concepts').insert({
      lesson_id: lesson.id,
      concept_id: conceptId,
      is_primary: true,
    })

    logger.info('Remediation lesson generated', {
      lessonId: lesson.id,
      conceptId,
      questionCount: output.practiceQuestions.length,
    })

    return { lessonId: lesson.id, conceptId }
  },
})
