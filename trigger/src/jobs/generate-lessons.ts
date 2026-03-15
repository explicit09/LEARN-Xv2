import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import { generateObject } from 'ai'
import { z } from 'zod'

import { anthropic, MODEL_ROUTES } from '../lib/ai'
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

// Lesson section schema for generateObject — mirrors lessonSectionSchema in validators
// but inlined here to avoid cross-package import in trigger
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

export const generateLessons = task({
  id: 'generate-lessons',
  maxDuration: 600, // 10 minutes — multiple LLM calls

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
      logger.info('No concepts found, skipping lesson generation', { workspaceId })
      return { lessons: 0, reason: 'no_concepts' }
    }

    // 2. Fetch prerequisite relations to order concepts
    const { data: relations, error: relationsError } = await supabase
      .from('concept_relations')
      .select('source_concept_id, target_concept_id, relation_type')
      .in(
        'source_concept_id',
        concepts.map((c) => c.id),
      )

    if (relationsError) throw relationsError

    const orderedConcepts = orderConceptsByPrerequisites(
      concepts,
      (relations ?? []).map((r) => ({
        sourceConceptId: r.source_concept_id as string,
        targetConceptId: r.target_concept_id as string,
        relationType: r.relation_type as string,
      })),
    )

    // 3. Fetch user persona for personalization
    const { data: persona } = await supabase
      .from('personas')
      .select('interests, explanation_preferences')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    const expPrefs = (persona?.explanation_preferences as Record<string, string> | null) ?? {}
    const personaContext =
      persona != null
        ? ({
            ...(persona.interests ? { interests: persona.interests as string[] } : {}),
            ...(expPrefs['explanationStyle']
              ? { explanationStyle: expPrefs['explanationStyle'] }
              : {}),
            ...(expPrefs['depthPreference']
              ? { depthPreference: expPrefs['depthPreference'] }
              : {}),
            ...(expPrefs['tonePreference'] ? { tonePreference: expPrefs['tonePreference'] } : {}),
          } as Parameters<typeof buildLessonPrompt>[0]['persona'])
        : undefined

    // 4. Fetch active syllabus topics for grouping (optional — we generate one lesson per concept if no syllabus)
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

    const topicMap = new Map(syllabusTopics?.map((t) => [t.title.toLowerCase(), t.id]) ?? [])

    // 5. Generate one lesson per ordered concept
    const generatedLessons: string[] = []

    for (let i = 0; i < orderedConcepts.length; i++) {
      const concept = orderedConcepts[i]
      if (!concept) continue

      const prerequisites = orderedConcepts
        .slice(0, i)
        .filter((prereq, idx) =>
          (relations ?? []).some(
            (r) =>
              r.source_concept_id === orderedConcepts[idx]?.id &&
              r.target_concept_id === concept.id &&
              r.relation_type === 'prerequisite',
          ),
        )
        .map((c) => c.name)

      // Retrieve relevant chunks via RPC
      let retrievedChunks: string[] = []
      try {
        // Embed concept name for retrieval — use concept description as query
        const query = concept.description ? `${concept.name}: ${concept.description}` : concept.name

        const { data: chunks } = await supabase.rpc('hybrid_search', {
          p_workspace_id: workspaceId,
          p_query_embedding: JSON.stringify(new Array(3072).fill(0)), // placeholder — real embedding needed
          p_query_text: query,
          p_match_count: 8,
          p_vector_weight: 0.3, // weight towards FTS since we have no real embedding here
        })

        retrievedChunks = (chunks ?? []).map((c: { content: string }) => c.content)
      } catch {
        logger.warn('hybrid_search failed for concept, proceeding without chunks', {
          conceptId: concept.id,
        })
      }

      const prompt = buildLessonPrompt({
        conceptName: String(concept.name),
        prerequisites,
        retrievedChunks,
        ...(personaContext ? { persona: personaContext } : {}),
      })

      const start = Date.now()
      let lessonObject: z.infer<typeof lessonOutputSchema>

      try {
        const { object, usage } = await generateObject({
          model: anthropic(MODEL),
          schema: lessonOutputSchema,
          prompt,
        })
        lessonObject = object

        // Record AI request (Rule 6 — every LLM call)
        await supabase.from('ai_requests').insert({
          workspace_id: workspaceId,
          user_id: userId,
          model: MODEL,
          provider: 'anthropic',
          prompt_tokens: usage.promptTokens,
          completion_tokens: usage.completionTokens,
          latency_ms: Date.now() - start,
          task_name: 'generate-lessons',
          prompt_version: PROMPT_VERSION,
          was_cached: false,
          validation_passed: true,
        })
      } catch (err) {
        logger.error('generateObject failed for concept', { conceptId: concept.id, err })
        // Record failed request
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
        continue // skip this concept, continue with others
      }

      // Find matching syllabus topic
      const syllabusTopicId = topicMap.get(concept.name.toLowerCase()) ?? null

      // Insert lesson
      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          title: lessonObject.title,
          order_index: i,
          content_markdown: '', // populated from sections for export
          structured_sections: lessonObject.sections,
          summary: lessonObject.summary ?? null,
          key_takeaways: lessonObject.key_takeaways,
          prompt_version: PROMPT_VERSION,
          model_used: MODEL,
          syllabus_topic_id: syllabusTopicId,
        })
        .select('id')
        .single()

      if (lessonError) {
        logger.error('Failed to insert lesson', { conceptId: concept.id, lessonError })
        continue
      }

      // Link lesson to concept (primary)
      await supabase.from('lesson_concepts').insert({
        lesson_id: lesson.id,
        concept_id: concept.id,
        is_primary: true,
      })

      generatedLessons.push(lesson.id)
      logger.info(`Generated lesson ${i + 1}/${orderedConcepts.length}`, {
        conceptName: concept.name,
        lessonId: lesson.id,
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
