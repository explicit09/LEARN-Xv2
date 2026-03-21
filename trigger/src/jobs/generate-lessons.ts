import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'

import { MODEL_ROUTES, calculateCost } from '../lib/ai'
import { PROMPT_VERSION, buildLessonPrompt } from '../lib/prompts/lesson-generation.v3'
import { getDomainConfig } from '../lib/prompts/domains'
import {
  embedTexts,
  generateLessonWithRetry,
  selectAnalogyDomain,
  buildConceptQuery,
  buildSourceMapping,
  BATCH_SIZE,
  EMBEDDING_DIMENSIONS,
  type RawChunk,
  type TopicWithContext,
} from '../lib/lesson-generation-helpers'

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

export const generateLessons = task({
  id: 'generate-lessons',
  maxDuration: 900,
  retry: { maxAttempts: 2 },

  run: async (payload: GenerateLessonsPayload) => {
    const { workspaceId, userId } = payload
    const supabase = makeSupabase()
    const MODEL = MODEL_ROUTES.LESSON_GENERATION

    logger.info('generate-lessons started', { workspaceId, userId })

    // ── 0. Fetch workspace domain settings ──────────────────
    const { data: wsData } = await supabase
      .from('workspaces')
      .select('settings')
      .eq('id', workspaceId)
      .single()
    const wsSettings = (wsData?.settings as Record<string, unknown>) ?? {}
    const domainConfig = getDomainConfig(wsSettings.primaryDomain as string | undefined)

    // ── 0b. Build document title lookup for citations ───────
    const { data: allDocs } = await supabase
      .from('documents')
      .select('id, title')
      .eq('workspace_id', workspaceId)
    const docTitleMap = new Map((allDocs ?? []).map((d) => [d.id as string, d.title as string]))

    // ── 1. Fetch active syllabus ────────────────────────────
    const { data: syllabus } = await supabase
      .from('syllabuses')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (!syllabus) {
      logger.info('No active syllabus found', { workspaceId })
      return { lessons: 0, reason: 'no_syllabus' }
    }

    // ── 2. Fetch units + topics (ordered) ───────────────────
    const { data: units } = await supabase
      .from('syllabus_units')
      .select('id, title, order_index')
      .eq('syllabus_id', syllabus.id)
      .order('order_index', { ascending: true })

    if (!units || units.length === 0) {
      logger.info('No units in syllabus', { workspaceId })
      return { lessons: 0, reason: 'no_units' }
    }

    const { data: allTopics } = await supabase
      .from('syllabus_topics')
      .select('id, unit_id, title, description, order_index, learning_objectives, continuity_notes')
      .eq('syllabus_id', syllabus.id)
      .order('order_index', { ascending: true })

    if (!allTopics || allTopics.length === 0) {
      logger.info('No topics in syllabus', { workspaceId })
      return { lessons: 0, reason: 'no_topics' }
    }

    // ── 3. Fetch topic→concept mappings ─────────────────────
    const topicIds = allTopics.map((t) => t.id as string)
    const { data: topicConceptLinks } = await supabase
      .from('syllabus_topic_concepts')
      .select('topic_id, concept_id')
      .in('topic_id', topicIds)

    const { data: allConcepts } = await supabase
      .from('concepts')
      .select('id, name, description')
      .eq('workspace_id', workspaceId)

    const conceptMap = new Map(
      (allConcepts ?? []).map((c) => [
        c.id as string,
        {
          name: c.name as string,
          description: (c.description as string) ?? '',
        },
      ]),
    )

    // Build topic→concepts mapping
    const topicConceptMap = new Map<string, string[]>()
    for (const link of topicConceptLinks ?? []) {
      const tid = link.topic_id as string
      const cid = link.concept_id as string
      const arr = topicConceptMap.get(tid) ?? []
      arr.push(cid)
      topicConceptMap.set(tid, arr)
    }

    // ── 4. Build ordered topic list with context ────────────
    const unitMap = new Map(units.map((u) => [u.id as string, u.title as string]))

    // Sort topics by unit order_index, then topic order_index
    const unitOrderMap = new Map(units.map((u) => [u.id as string, u.order_index as number]))
    const sortedTopics = [...allTopics].sort((a, b) => {
      const uA = unitOrderMap.get(a.unit_id as string) ?? 0
      const uB = unitOrderMap.get(b.unit_id as string) ?? 0
      if (uA !== uB) return uA - uB
      return (a.order_index as number) - (b.order_index as number)
    })

    const topicsWithContext: TopicWithContext[] = sortedTopics.map((t, globalIdx) => {
      const cIds = topicConceptMap.get(t.id as string) ?? []
      return {
        topicId: t.id as string,
        topicTitle: t.title as string,
        unitTitle: unitMap.get(t.unit_id as string) ?? '',
        orderIndex: t.order_index as number,
        globalIndex: globalIdx,
        description: (t.description as string) ?? null,
        learningObjectives: (t.learning_objectives as string[]) ?? [],
        continuityNotes: (t.continuity_notes as string) ?? null,
        conceptIds: cIds,
        conceptNames: cIds.map((id) => conceptMap.get(id)?.name ?? ''),
        conceptDescriptions: cIds.map((id) => conceptMap.get(id)?.description ?? ''),
      }
    })

    const totalTopics = topicsWithContext.length

    // ── 5. Skip topics that already have lessons ────────────
    const { data: existingLessons } = await supabase
      .from('lessons')
      .select('syllabus_topic_id')
      .eq('workspace_id', workspaceId)
      .not('syllabus_topic_id', 'is', null)

    const coveredTopicIds = new Set(
      (existingLessons ?? []).map((l) => l.syllabus_topic_id as string),
    )
    const newTopics = topicsWithContext.filter((t) => !coveredTopicIds.has(t.topicId))

    if (newTopics.length === 0) {
      logger.info('All topics already have lessons', { workspaceId, total: totalTopics })
      return { lessons: 0, reason: 'all_covered' }
    }

    // Prevent concurrent duplicate runs
    const { count: recentLessonCount } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString())
    if ((recentLessonCount ?? 0) > 0) {
      logger.info('Skipping — recent lessons detected', { recentLessonCount })
      return { lessons: 0, reason: 'concurrent_run' }
    }

    logger.info('Topics to generate', { total: totalTopics, toGenerate: newTopics.length })

    // Batch-embed all topic queries
    const topicQueries = newTopics.map((t) =>
      [t.topicTitle, ...t.conceptDescriptions.filter(Boolean)].join(': '),
    )
    const embeddings = await embedTexts(topicQueries)

    // Fetch user persona
    const { data: persona } = await supabase
      .from('personas')
      .select(
        'interests, explanation_preferences, motivational_style, tone_preference, difficulty_preference',
      )
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    const expPrefs = (persona?.explanation_preferences as Record<string, string> | null) ?? {}
    const personaBase =
      persona != null
        ? {
            interests: (persona.interests as string[]) ?? [],
            explanationStyle: expPrefs['explanationStyle'] ?? undefined,
            depthPreference: expPrefs['depthPreference'] ?? undefined,
            tonePreference:
              (persona.tone_preference as string) ?? expPrefs['tonePreference'] ?? undefined,
            motivationalStyle: (persona.motivational_style as string) ?? undefined,
            difficultyPreference: (persona.difficulty_preference as string) ?? undefined,
            framingStrength: 'moderate' as const,
          }
        : null

    // Fetch existing lesson takeaways for spaced retrieval
    const { data: existingLessonTakeaways } = await supabase
      .from('lessons')
      .select('syllabus_topic_id, key_takeaways')
      .eq('workspace_id', workspaceId)
      .not('key_takeaways', 'is', null)

    const takeawaysByTopicId = new Map<string, string[]>()
    for (const l of existingLessonTakeaways ?? []) {
      if (l.syllabus_topic_id && l.key_takeaways) {
        takeawaysByTopicId.set(l.syllabus_topic_id as string, l.key_takeaways as string[])
      }
    }

    // ── 9. Generate lessons per topic in batches ────────────
    const generatedLessons: string[] = []

    async function processOneTopic(topicIdx: number) {
      const topic = newTopics[topicIdx]
      if (!topic) return

      const embedding = embeddings[topicIdx]

      const queryText = buildConceptQuery(topic)

      let retrievedChunks: string[] = []
      let rawChunks: RawChunk[] = []
      const matchCount = Math.min(8 + topic.conceptIds.length * 2, 12)
      try {
        const hasReal = embedding && embedding.length === EMBEDDING_DIMENSIONS
        const { data: chunks } = await supabase.rpc('hybrid_search', {
          workspace_id_filter: workspaceId,
          query_embedding: hasReal
            ? JSON.stringify(embedding)
            : JSON.stringify(new Array(EMBEDDING_DIMENSIONS).fill(0)),
          query_text: queryText,
          match_count: matchCount,
          rrf_k: 60,
        })
        rawChunks = (chunks ?? []) as RawChunk[]
        retrievedChunks = rawChunks.map((c) => c.enriched_content ?? c.content)
      } catch {
        logger.warn('hybrid_search failed', { topicId: topic.topicId })
      }

      const sourceMapping = buildSourceMapping(rawChunks, docTitleMap)
      const priorConceptNames = topicsWithContext
        .filter((t) => t.globalIndex < topic.globalIndex)
        .flatMap((t) => t.conceptNames)

      // Deterministic interest rotation for analogies
      const analogyDomain = personaBase?.interests
        ? selectAnalogyDomain(personaBase.interests, userId, topic.topicId, topic.globalIndex)
        : undefined
      const personaContext = personaBase
        ? { ...personaBase, analogyDomain: analogyDomain ?? null }
        : undefined

      // Phase 4c: spaced retrieval from 2-3 positions back
      let spacedRetrievalItems: string[] | undefined
      if (topic.globalIndex >= 3) {
        const lookbackTopics = topicsWithContext.filter(
          (t) => t.globalIndex >= topic.globalIndex - 3 && t.globalIndex <= topic.globalIndex - 2,
        )
        spacedRetrievalItems = lookbackTopics.flatMap((t) => {
          const takeaways = takeawaysByTopicId.get(t.topicId)
          return takeaways ? takeaways.slice(0, 2) : []
        })
      }

      // Next/previous topic titles for continuity
      const prevTopic = topicsWithContext.find((t) => t.globalIndex === topic.globalIndex - 1)
      const nextTopic = topicsWithContext.find((t) => t.globalIndex === topic.globalIndex + 1)

      const prompt = buildLessonPrompt({
        topicTitle: topic.topicTitle,
        conceptNames: topic.conceptNames,
        learningObjectives: topic.learningObjectives,
        continuityNotes: topic.continuityNotes ?? undefined,
        positionCurrent: topic.globalIndex + 1,
        positionTotal: totalTopics,
        nextTopicTitle: nextTopic?.topicTitle,
        previousTopicTitle: prevTopic?.topicTitle,
        prerequisites: priorConceptNames,
        retrievedChunks,
        domainInstructions: domainConfig.instructions,
        ...(personaContext ? { persona: personaContext } : {}),
        spacedRetrievalItems,
      })

      const start = Date.now()
      try {
        const result = await generateLessonWithRetry(MODEL, prompt)

        await supabase.from('ai_requests').insert({
          workspace_id: workspaceId,
          user_id: userId,
          model: MODEL,
          provider: 'anthropic',
          prompt_tokens: result.inputTokens,
          completion_tokens: result.outputTokens,
          cost_usd: calculateCost(MODEL, result.inputTokens, result.outputTokens),
          latency_ms: Date.now() - start,
          task_name: 'generate-lessons',
          prompt_version: PROMPT_VERSION,
          was_cached: false,
          validation_passed: true,
        })

        const { data: lesson, error: lessonError } = await supabase
          .from('lessons')
          .insert({
            workspace_id: workspaceId,
            user_id: userId,
            title: result.object.title,
            order_index: topic.globalIndex,
            content_markdown: '',
            structured_sections: result.object.sections,
            summary: result.object.summary ?? null,
            key_takeaways: result.object.key_takeaways,
            prompt_version: PROMPT_VERSION,
            model_used: MODEL,
            syllabus_topic_id: topic.topicId,
            source_mapping: sourceMapping,
          })
          .select('id')
          .single()

        if (lessonError) {
          logger.error('Insert failed', { topicId: topic.topicId, msg: lessonError.message })
          return
        }

        const conceptRows = topic.conceptIds.map((cid, idx) => ({
          lesson_id: lesson.id,
          concept_id: cid,
          is_primary: idx === 0,
        }))
        if (conceptRows.length > 0) await supabase.from('lesson_concepts').insert(conceptRows)
        if (result.object.key_takeaways?.length > 0)
          takeawaysByTopicId.set(topic.topicId, result.object.key_takeaways)

        generatedLessons.push(lesson.id)
        logger.info(`Lesson ${topic.globalIndex + 1}/${totalTopics}`, {
          topicTitle: topic.topicTitle,
          lessonId: lesson.id,
        })
      } catch (err) {
        logger.error('Failed after retries', { topicId: topic.topicId, err: String(err) })
        await supabase.from('ai_requests').insert({
          workspace_id: workspaceId,
          user_id: userId,
          model: MODEL,
          provider: 'anthropic',
          prompt_tokens: 0,
          completion_tokens: 0,
          cost_usd: 0,
          latency_ms: Date.now() - start,
          task_name: 'generate-lessons',
          prompt_version: PROMPT_VERSION,
          was_cached: false,
          validation_passed: false,
        })
      }
    }

    for (let b = 0; b < newTopics.length; b += BATCH_SIZE) {
      await Promise.all(
        newTopics.slice(b, b + BATCH_SIZE).map((_, idx) => processOneTopic(b + idx)),
      )
      logger.info('Batch done', { from: b, to: Math.min(b + BATCH_SIZE, newTopics.length) })
    }

    logger.info('generate-lessons complete', { generated: generatedLessons.length })
    return { lessons: generatedLessons.length }
  },
})
