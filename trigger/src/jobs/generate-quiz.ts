import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import { generateText, Output } from 'ai'
import { z } from 'zod'

import { openaiProvider } from '../lib/ai'
import {
  buildQuizGenerationPrompt,
  QUIZ_GENERATION_PROMPT_VERSION,
} from '../lib/prompts/quiz-generation.v1'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function makeSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface GenerateQuizPayload {
  workspaceId: string
  lessonId?: string
  quizType?: string
  title?: string
}

const questionSchema = z.object({
  question: z.string(),
  question_type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'fill_blank']),
  options: z.array(z.string()).optional(),
  correct_answer: z.string(),
  bloom_level: z
    .enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'])
    .optional(),
})

const quizOutputSchema = z.object({
  questions: z.array(questionSchema),
})

export const generateQuiz = task({
  id: 'generate-quiz',
  run: async (payload: GenerateQuizPayload) => {
    const supabase = makeSupabase()
    const { workspaceId, lessonId, quizType = 'practice' } = payload

    // Fetch workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('id', workspaceId)
      .single()
    if (!workspace) {
      logger.warn('Workspace not found', { workspaceId })
      return { skipped: true }
    }

    // Fetch concepts for this workspace (or lesson)
    let conceptsQuery = supabase
      .from('concepts')
      .select('id, name, description')
      .eq('workspace_id', workspaceId)

    const { data: concepts } = await conceptsQuery.limit(10)
    if (!concepts?.length) {
      logger.info('No concepts found, skipping quiz generation', { workspaceId })
      return { skipped: true }
    }

    // Sample relevant chunks
    let chunksQuery = supabase
      .from('chunks')
      .select('content, enriched_content')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: chunks } = await chunksQuery
    if (!chunks?.length) {
      logger.info('No chunks found, skipping quiz generation', { workspaceId })
      return { skipped: true }
    }

    const chunkTexts = chunks.map((c) => c.enriched_content ?? c.content)

    // Create quiz row
    const quizTitle = payload.title ?? `${quizType.replace('_', ' ')} Quiz — ${workspace.name}`
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        workspace_id: workspaceId,
        ...(lessonId ? { lesson_id: lessonId } : {}),
        quiz_type: quizType,
        title: quizTitle,
      })
      .select('id')
      .single()

    if (quizError || !quiz) {
      throw new Error(`Failed to create quiz: ${quizError?.message}`)
    }

    const startMs = Date.now()

    // Generate questions for each concept (up to 3 concepts, 3 questions each)
    const selectedConcepts = concepts.slice(0, 3)
    const allQuestions: Array<{
      quizId: string
      question: string
      questionType: string
      options: string[] | null
      correctAnswer: string
      bloomLevel: string | null
      conceptId: string | null
      orderIndex: number
    }> = []

    for (const concept of selectedConcepts) {
      const prompt = buildQuizGenerationPrompt({
        conceptName: concept.name,
        conceptDescription: concept.description ?? undefined,
        chunks: chunkTexts.slice(0, 6),
        questionCount: 3,
        quizType,
      })

      const { output, usage } = await generateText({
        model: openaiProvider('gpt-4o-mini'),
        output: Output.object({ schema: quizOutputSchema }),
        prompt,
      })

      const latencyMs = Date.now() - startMs

      // Track ai_request
      await supabase.from('ai_requests').insert({
        workspace_id: workspaceId,
        model: 'gpt-4o-mini',
        prompt_tokens: usage.inputTokens ?? 0,
        completion_tokens: usage.outputTokens ?? 0,
        cost_usd: (usage.inputTokens ?? 0) * 0.00000015 + (usage.outputTokens ?? 0) * 0.0000006,
        latency_ms: latencyMs,
        task_name: QUIZ_GENERATION_PROMPT_VERSION,
      })

      for (const q of output.questions) {
        allQuestions.push({
          quizId: quiz.id,
          question: q.question,
          questionType: q.question_type,
          options: q.options ?? null,
          correctAnswer: q.correct_answer,
          bloomLevel: q.bloom_level ?? null,
          conceptId: concept.id,
          orderIndex: allQuestions.length,
        })
      }
    }

    // Insert all questions
    if (allQuestions.length > 0) {
      const { error: insertError } = await supabase.from('quiz_questions').insert(
        allQuestions.map((q) => ({
          quiz_id: q.quizId,
          question: q.question,
          question_type: q.questionType,
          options: q.options,
          correct_answer: q.correctAnswer,
          bloom_level: q.bloomLevel,
          concept_id: q.conceptId,
          order_index: q.orderIndex,
        })),
      )
      if (insertError) {
        throw new Error(`Failed to insert quiz questions: ${insertError.message}`)
      }
    }

    logger.info('Quiz generated', { quizId: quiz.id, questionCount: allQuestions.length })
    return { quizId: quiz.id, questionCount: allQuestions.length }
  },
})
