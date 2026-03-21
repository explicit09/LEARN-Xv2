import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { randomBytes } from 'crypto'

import { getProvider, MODEL_ROUTES } from '../lib/ai'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const EXAM_GENERATION_PROMPT_VERSION = 'exam-generation.v1'

function makeSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface GenerateExamPayload {
  workspaceId: string
  userId: string
  lessonId?: string
}

const examQuestionSchema = z.object({
  question: z.string(),
  question_type: z.enum(['mcq', 'short_answer', 'true_false', 'fill_blank']),
  options: z.array(z.string()).optional(),
  correct_answer: z.string(),
  explanation: z.string().optional(),
  bloom_level: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']),
})

const examOutputSchema = z.object({
  questions: z.array(examQuestionSchema),
})

/**
 * Bloom's distribution: 30% remember/understand, 40% apply/analyze, 30% evaluate/create
 * Per concept: 2-3 questions. Minimum 10 questions total.
 */
function buildExamPrompt(params: {
  conceptName: string
  conceptDescription: string | null
  chunks: string[]
  questionCount: number
  bloomDistribution: string
}): string {
  const { conceptName, conceptDescription, chunks, questionCount, bloomDistribution } = params
  const context = chunks.slice(0, 6).join('\n\n---\n\n')

  return `You are an expert exam writer. Generate exactly ${questionCount} exam questions about the concept "${conceptName}".

${conceptDescription ? `Concept description: ${conceptDescription}\n\n` : ''}Source material:
${context}

Bloom's taxonomy distribution to follow:
${bloomDistribution}

Requirements:
- Use all 4 question types: mcq, short_answer, true_false, fill_blank
- MCQ questions must have exactly 4 options
- true_false questions must have correct_answer of "true" or "false"
- Each question must test understanding, not just memorization
- Provide a concise explanation for each question
- Assign appropriate bloom_level to each question

Return valid JSON with a "questions" array.`
}

const BLOOM_DISTRIBUTION = `
- 30% remember/understand: basic recall and comprehension
- 40% apply/analyze: applying knowledge and breaking down concepts
- 30% evaluate/create: making judgments and generating new ideas`

export const generateExam = task({
  id: 'generate-exam',
  run: async (payload: GenerateExamPayload) => {
    const supabase = makeSupabase()
    const { workspaceId, userId, lessonId: _lessonId } = payload

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

    // Fetch concepts (up to 5)
    const { data: concepts } = await supabase
      .from('concepts')
      .select('id, name, description')
      .eq('workspace_id', workspaceId)
      .limit(5)

    if (!concepts?.length) {
      logger.info('No concepts, creating basic exam structure', { workspaceId })
    }

    // Fetch chunks for context
    const { data: chunks } = await supabase
      .from('chunks')
      .select('content, enriched_content')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!chunks?.length) {
      logger.info('No chunks found, skipping exam generation', { workspaceId })
      return { skipped: true }
    }

    const chunkTexts = chunks.map((c) => c.enriched_content ?? c.content)

    // Create exam row
    const joinToken = randomBytes(4).toString('hex').toUpperCase()
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        title: `Exam — ${workspace.name}`,
        status: 'draft',
        join_token: joinToken,
      })
      .select('id')
      .single()

    if (examError || !exam) {
      throw new Error(`Failed to create exam: ${examError?.message}`)
    }

    const allQuestions: Array<{
      examId: string
      workspaceId: string
      question: string
      questionType: string
      options: string[] | null
      correctAnswer: string
      explanation: string | null
      bloomLevel: string | null
      conceptId: string | null
      orderIndex: number
    }> = []

    const targetConcepts = concepts?.length
      ? concepts
      : [{ id: null, name: workspace.name, description: null }]
    const conceptsToProcess = targetConcepts.slice(0, 5)
    const questionsPerConcept = Math.max(2, Math.ceil(10 / conceptsToProcess.length))

    for (const concept of conceptsToProcess) {
      const startMs = Date.now()

      const prompt = buildExamPrompt({
        conceptName: concept.name,
        conceptDescription: concept.description,
        chunks: chunkTexts.slice(0, 6),
        questionCount: questionsPerConcept,
        bloomDistribution: BLOOM_DISTRIBUTION,
      })

      const { output, usage } = await generateText({
        model: getProvider(MODEL_ROUTES.QUIZ_GENERATION)(MODEL_ROUTES.QUIZ_GENERATION),
        output: Output.object({ schema: examOutputSchema }),
        prompt,
      })

      const latencyMs = Date.now() - startMs

      // Rule 6: Every LLM call is tracked
      await supabase.from('ai_requests').insert({
        workspace_id: workspaceId,
        user_id: userId,
        model: MODEL_ROUTES.QUIZ_GENERATION,
        prompt_tokens: usage.inputTokens ?? 0,
        completion_tokens: usage.outputTokens ?? 0,
        cost_usd: (usage.inputTokens ?? 0) * 0.00000015 + (usage.outputTokens ?? 0) * 0.0000006,
        latency_ms: latencyMs,
        task_name: EXAM_GENERATION_PROMPT_VERSION,
      })

      for (const q of output.questions) {
        allQuestions.push({
          examId: exam.id,
          workspaceId,
          question: q.question,
          questionType: q.question_type,
          options: q.options ?? null,
          correctAnswer: q.correct_answer,
          explanation: q.explanation ?? null,
          bloomLevel: q.bloom_level,
          conceptId: concept.id,
          orderIndex: allQuestions.length,
        })
      }
    }

    // Ensure minimum 10 questions
    if (allQuestions.length < 10 && conceptsToProcess.length > 0) {
      const firstConcept = conceptsToProcess[0]!
      const remaining = 10 - allQuestions.length
      const startMs = Date.now()

      const prompt = buildExamPrompt({
        conceptName: firstConcept.name,
        conceptDescription: firstConcept.description,
        chunks: chunkTexts.slice(6, 12),
        questionCount: remaining,
        bloomDistribution: BLOOM_DISTRIBUTION,
      })

      const { output, usage } = await generateText({
        model: getProvider(MODEL_ROUTES.QUIZ_GENERATION)(MODEL_ROUTES.QUIZ_GENERATION),
        output: Output.object({ schema: examOutputSchema }),
        prompt,
      })

      await supabase.from('ai_requests').insert({
        workspace_id: workspaceId,
        user_id: userId,
        model: MODEL_ROUTES.QUIZ_GENERATION,
        prompt_tokens: usage.inputTokens ?? 0,
        completion_tokens: usage.outputTokens ?? 0,
        cost_usd: (usage.inputTokens ?? 0) * 0.00000015 + (usage.outputTokens ?? 0) * 0.0000006,
        latency_ms: Date.now() - startMs,
        task_name: EXAM_GENERATION_PROMPT_VERSION,
      })

      for (const q of output.questions) {
        allQuestions.push({
          examId: exam.id,
          workspaceId,
          question: q.question,
          questionType: q.question_type,
          options: q.options ?? null,
          correctAnswer: q.correct_answer,
          explanation: q.explanation ?? null,
          bloomLevel: q.bloom_level,
          conceptId: firstConcept.id,
          orderIndex: allQuestions.length,
        })
      }
    }

    // Insert all questions
    if (allQuestions.length > 0) {
      const { error: insertError } = await supabase.from('exam_questions').insert(
        allQuestions.map((q) => ({
          exam_id: q.examId,
          workspace_id: q.workspaceId,
          question: q.question,
          question_type: q.questionType,
          options: q.options,
          correct_answer: q.correctAnswer,
          explanation: q.explanation,
          bloom_level: q.bloomLevel,
          concept_id: q.conceptId,
          order_index: q.orderIndex,
        })),
      )
      if (insertError) {
        throw new Error(`Failed to insert exam questions: ${insertError.message}`)
      }
    }

    // Update exam status to active
    await supabase.from('exams').update({ status: 'active' }).eq('id', exam.id)

    logger.info('Exam generated', { examId: exam.id, questionCount: allQuestions.length })
    return { examId: exam.id, questionCount: allQuestions.length }
  },
})
