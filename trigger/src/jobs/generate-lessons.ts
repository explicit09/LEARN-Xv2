import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import { generateObject } from 'ai'
import { z } from 'zod'

import { anthropic, openaiProvider, MODEL_ROUTES } from '../lib/ai'
import { orderConceptsByPrerequisites } from '../lib/concept-ordering'
import { PROMPT_VERSION, buildLessonPrompt } from '../lib/prompts/lesson-generation.v1'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function makeSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface GenerateLessonsPayload {
  workspaceId: string
  userId: string
}

// ── Section schemas ──────────────────────────────────────────────
// Mirrors lessonSectionSchema in @learn-x/validators but inlined
// to avoid cross-package import in trigger runtime.

const lessonSectionZ = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), content: z.string() }),
  z.object({
    type: z.literal('concept_definition'),
    term: z.string(),
    definition: z.string(),
    analogy: z.string().optional(),
    etymology: z.string().optional(),
  }),
  z.object({
    type: z.literal('process_flow'),
    title: z.string(),
    steps: z.array(z.object({ label: z.string(), description: z.string() })),
  }),
  z.object({
    type: z.literal('comparison_table'),
    title: z.string(),
    columns: z.array(z.string()),
    rows: z.array(z.object({ label: z.string(), values: z.array(z.string()) })),
  }),
  z.object({
    type: z.literal('analogy_card'),
    concept: z.string(),
    analogy: z.string(),
    mapping: z.array(z.object({ abstract: z.string(), familiar: z.string() })),
  }),
  z.object({ type: z.literal('key_takeaway'), points: z.array(z.string()) }),
  z.object({
    type: z.literal('mini_quiz'),
    question: z.string(),
    options: z.array(z.object({ label: z.string(), text: z.string(), is_correct: z.boolean() })),
    explanation: z.string(),
  }),
  z.object({ type: z.literal('quote_block'), quote: z.string(), attribution: z.string() }),
  z.object({
    type: z.literal('timeline'),
    title: z.string(),
    events: z.array(z.object({ date: z.string(), label: z.string(), description: z.string() })),
  }),
  z.object({
    type: z.literal('concept_bridge'),
    from: z.string(),
    to: z.string(),
    relation: z.enum(['prerequisite', 'extends', 'related']),
    explanation: z.string(),
  }),
  z.object({
    type: z.literal('code_explainer'),
    language: z.string(),
    code: z.string(),
    annotations: z.array(z.object({ line: z.number(), note: z.string() })),
  }),
])

const lessonOutputSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  key_takeaways: z.array(z.string()),
  sections: z.array(lessonSectionZ),
})

const EMBEDDING_DIMENSIONS = 3072

async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY
  if (!key || texts.length === 0) return texts.map(() => [])
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-large', input: texts, dimensions: EMBEDDING_DIMENSIONS }),
  })
  if (!res.ok) { logger.warn('Embedding failed', { status: res.status }); return texts.map(() => []) }
  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] }
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}

const MAX_ATTEMPTS = 2
interface GenerateResult {
  object: z.infer<typeof lessonOutputSchema>; promptTokens: number; completionTokens: number
}

async function generateLessonWithRetry(
  model: string,
  prompt: string,
): Promise<GenerateResult> {
  let lastErr: unknown
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const { object, usage } = await generateObject({
        model: anthropic(model),
        schema: lessonOutputSchema,
        prompt,
      })
      return {
        object,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
      }
    } catch (err) {
      lastErr = err
      logger.warn(`generateObject attempt ${attempt + 1} failed, retrying`, {
        err: String(err),
      })
    }
  }
  throw lastErr
}

// ── Main task ────────────────────────────────────────────────────

// Process concepts in parallel batches for speed
const BATCH_SIZE = 7

export const generateLessons = task({
  id: 'generate-lessons',
  maxDuration: 900, // 15 min — 14 concepts in batches of 4
  retry: { maxAttempts: 2 },

  run: async (payload: GenerateLessonsPayload) => {
    const { workspaceId, userId } = payload
    const supabase = makeSupabase()
    const MODEL = MODEL_ROUTES.LESSON_GENERATION

    logger.info('generate-lessons started', { workspaceId, userId })

    // 1. Fetch all concepts for workspace
    const { data: concepts, error: conceptsError } = await supabase
      .from('concepts')
      .select('id, name, description')
      .eq('workspace_id', workspaceId)

    if (conceptsError) throw conceptsError
    if (!concepts || concepts.length === 0) {
      logger.info('No concepts found', { workspaceId })
      return { lessons: 0, reason: 'no_concepts' }
    }

    // 2. Order concepts by prerequisites
    const { data: relations } = await supabase
      .from('concept_relations')
      .select('source_concept_id, target_concept_id, relation_type')
      .in('source_concept_id', concepts.map((c) => c.id))

    const orderedConcepts = orderConceptsByPrerequisites(
      concepts,
      (relations ?? []).map((r) => ({
        sourceConceptId: r.source_concept_id as string,
        targetConceptId: r.target_concept_id as string,
        relationType: r.relation_type as string,
      })),
    )

    // 3. Batch-embed all concept queries upfront
    const conceptQueries = orderedConcepts.map((c) =>
      c.description ? `${c.name}: ${c.description}` : String(c.name),
    )
    logger.info('Embedding concept queries', { count: conceptQueries.length })
    const embeddings = await embedTexts(conceptQueries)

    // 4. Fetch user persona
    const { data: persona } = await supabase
      .from('personas')
      .select('interests, explanation_preferences')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    const expPrefs =
      (persona?.explanation_preferences as Record<string, string> | null) ?? {}
    const personaContext =
      persona != null
        ? ({
            ...(persona.interests
              ? { interests: persona.interests as string[] }
              : {}),
            ...(expPrefs['explanationStyle']
              ? { explanationStyle: expPrefs['explanationStyle'] }
              : {}),
            ...(expPrefs['depthPreference']
              ? { depthPreference: expPrefs['depthPreference'] }
              : {}),
            ...(expPrefs['tonePreference']
              ? { tonePreference: expPrefs['tonePreference'] }
              : {}),
          } as Parameters<typeof buildLessonPrompt>[0]['persona'])
        : undefined

    // 5. Fetch syllabus topic map
    const { data: syllabusTopics } = await supabase
      .from('syllabus_topics')
      .select('id, title, syllabus_id, unit_id')
      .in(
        'syllabus_id',
        (
          await supabase
            .from('syllabuses')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('status', 'active')
            .limit(1)
        ).data?.map((s) => s.id) ?? [],
      )

    const topicMap = new Map(
      syllabusTopics?.map((t) => [t.title.toLowerCase(), t.id]) ?? [],
    )

    // 6. Generate lessons in parallel batches
    const generatedLessons: string[] = []

    async function processOneConcept(i: number) {
      const concept = orderedConcepts[i]
      if (!concept) return

      const prerequisites = orderedConcepts
        .slice(0, i)
        .filter((_prereq, idx) =>
          (relations ?? []).some(
            (r) =>
              r.source_concept_id === orderedConcepts[idx]?.id &&
              r.target_concept_id === concept.id &&
              r.relation_type === 'prerequisite',
          ),
        )
        .map((c) => c.name)

      // Retrieve relevant chunks via hybrid search
      let retrievedChunks: string[] = []
      const embedding = embeddings[i]
      try {
        const hasReal = embedding && embedding.length === EMBEDDING_DIMENSIONS
        const { data: chunks } = await supabase.rpc('hybrid_search', {
          p_workspace_id: workspaceId,
          p_query_embedding: hasReal
            ? JSON.stringify(embedding)
            : JSON.stringify(new Array(EMBEDDING_DIMENSIONS).fill(0)),
          p_query_text: conceptQueries[i] ?? concept.name,
          p_match_count: 8,
          p_vector_weight: hasReal ? 0.7 : 0.0,
        })
        retrievedChunks = (chunks ?? []).map(
          (c: { content: string }) => c.content,
        )
      } catch {
        logger.warn('hybrid_search failed', { conceptId: concept.id })
      }

      const prompt = buildLessonPrompt({
        conceptName: String(concept.name),
        prerequisites,
        retrievedChunks,
        ...(personaContext ? { persona: personaContext } : {}),
      })

      const start = Date.now()
      try {
        const result = await generateLessonWithRetry(MODEL, prompt)

        await supabase.from('ai_requests').insert({
          workspace_id: workspaceId,
          user_id: userId,
          model: MODEL,
          provider: 'anthropic',
          prompt_tokens: result.promptTokens,
          completion_tokens: result.completionTokens,
          latency_ms: Date.now() - start,
          task_name: 'generate-lessons',
          prompt_version: PROMPT_VERSION,
          was_cached: false,
          validation_passed: true,
        })

        const syllabusTopicId =
          topicMap.get(concept.name.toLowerCase()) ?? null

        const { data: lesson, error: lessonError } = await supabase
          .from('lessons')
          .insert({
            workspace_id: workspaceId,
            user_id: userId,
            title: result.object.title,
            order_index: i,
            content_markdown: '',
            structured_sections: result.object.sections,
            summary: result.object.summary ?? null,
            key_takeaways: result.object.key_takeaways,
            prompt_version: PROMPT_VERSION,
            model_used: MODEL,
            syllabus_topic_id: syllabusTopicId,
          })
          .select('id')
          .single()

        if (lessonError) {
          logger.error('Insert failed', {
            conceptId: concept.id,
            code: lessonError.code,
            msg: lessonError.message,
          })
          return
        }

        await supabase.from('lesson_concepts').insert({
          lesson_id: lesson.id,
          concept_id: concept.id,
          is_primary: true,
        })

        generatedLessons.push(lesson.id)
        logger.info(`Lesson ${i + 1}/${orderedConcepts.length}`, {
          conceptName: concept.name,
          lessonId: lesson.id,
        })
      } catch (err) {
        logger.error('Failed after retries', {
          conceptId: concept.id,
          err: String(err),
        })
        await supabase.from('ai_requests').insert({
          workspace_id: workspaceId,
          user_id: userId,
          model: MODEL,
          provider: 'anthropic',
          prompt_tokens: 0,
          completion_tokens: 0,
          latency_ms: Date.now() - start,
          task_name: 'generate-lessons',
          prompt_version: PROMPT_VERSION,
          was_cached: false,
          validation_passed: false,
        })
      }
    }

    // Process in batches of BATCH_SIZE for parallelism
    for (let b = 0; b < orderedConcepts.length; b += BATCH_SIZE) {
      const batch = orderedConcepts
        .slice(b, b + BATCH_SIZE)
        .map((_, idx) => processOneConcept(b + idx))
      await Promise.all(batch)
      logger.info(`Batch done`, {
        from: b,
        to: Math.min(b + BATCH_SIZE, orderedConcepts.length),
        lessonsTotal: generatedLessons.length,
      })
    }

    logger.info('generate-lessons complete', {
      workspaceId,
      generated: generatedLessons.length,
      total: orderedConcepts.length,
    })

    return { lessons: generatedLessons.length }
  },
})
