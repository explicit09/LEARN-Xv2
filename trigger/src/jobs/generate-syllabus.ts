import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import { generateText, Output } from 'ai'
import { z } from 'zod'

import { getProvider, getProviderName, MODEL_ROUTES, calculateCost } from '../lib/ai'
import { buildGenerateSyllabusPrompt, PROMPT_VERSION } from '../lib/prompts/generate-syllabus.v2'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface GenerateSyllabusPayload {
  workspaceId: string
}

function makeSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const syllabusSchema = z.object({
  totalLessons: z.number(),
  learningPathRationale: z.string(),
  units: z.array(
    z.object({
      title: z.string(),
      topics: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          conceptNames: z.array(z.string()),
          documentTitles: z.array(z.string()),
          learningObjectives: z.array(z.string()),
          prerequisiteTopicIndices: z.array(z.number()),
          continuityNotes: z.string(),
          estimatedDurationMinutes: z.number(),
        }),
      ),
    }),
  ),
})

export const generateSyllabus = task({
  id: 'generate-syllabus',
  maxDuration: 900,
  retry: { maxAttempts: 2 },

  run: async (payload: GenerateSyllabusPayload) => {
    const { workspaceId } = payload
    const supabase = makeSupabase()

    // ── 1. Fetch concepts with descriptions + tags ──────────
    const { data: concepts } = await supabase
      .from('concepts')
      .select('id, name, description, tags')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true })

    const { data: documents } = await supabase
      .from('documents')
      .select('title')
      .eq('workspace_id', workspaceId)
      .eq('status', 'ready')

    const conceptList = (concepts ?? []).map((c) => ({
      name: c.name as string,
      description: (c.description as string) ?? undefined,
      tags: (c.tags as string[]) ?? undefined,
    }))
    const docTitles = (documents ?? []).map((d) => d.title as string)

    // ── 2. Guard: need at least 2 concepts ──────────────────
    if (conceptList.length < 2) {
      logger.info('Not enough concepts to generate syllabus', {
        workspaceId,
        count: conceptList.length,
      })
      return { units: 0 }
    }

    // ── 2b. Fetch concept relations ─────────────────────────
    const conceptIds = (concepts ?? []).map((c) => c.id as string)
    const { data: relationsData } = await supabase
      .from('concept_relations')
      .select('source_concept_id, target_concept_id, relation_type')
      .in('source_concept_id', conceptIds)

    const conceptIdToName = new Map((concepts ?? []).map((c) => [c.id as string, c.name as string]))
    const relations = (relationsData ?? [])
      .map((r) => ({
        source: conceptIdToName.get(r.source_concept_id as string) ?? '',
        target: conceptIdToName.get(r.target_concept_id as string) ?? '',
        type: r.relation_type as string,
      }))
      .filter((r) => r.source && r.target)

    // ── 2c. Fetch workspace domain metadata ─────────────────
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('settings')
      .eq('id', workspaceId)
      .single()
    const wsSettings = (workspace?.settings as Record<string, unknown>) ?? {}

    // ── 3. Supersede existing active syllabuses ─────────────
    const { data: existing } = await supabase
      .from('syllabuses')
      .select('id, version')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('syllabuses')
        .update({ status: 'superseded' })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
    }

    const nextVersion = existing ? (existing.version as number) + 1 : 1

    // ── 4. Call LLM via Vercel AI SDK ───────────────────────
    const MODEL = MODEL_ROUTES.SYLLABUS_PLANNING
    const provider = getProvider(MODEL)
    const prompt = buildGenerateSyllabusPrompt({
      concepts: conceptList,
      relations,
      docTitles,
      domain: wsSettings.primaryDomain as string | undefined,
      subfield: wsSettings.subfield as string | undefined,
      scaffoldingDirection: wsSettings.scaffoldingDirection as string | undefined,
    })
    const start = Date.now()

    let syllabusResult: z.infer<typeof syllabusSchema>
    let usage = { inputTokens: 0, outputTokens: 0 }
    try {
      const result = await generateText({
        model: provider(MODEL),
        output: Output.object({ schema: syllabusSchema }),
        prompt,
      })
      syllabusResult = result.output
      usage = {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
      }
    } catch (err) {
      logger.error('LLM call failed', { error: String(err) })
      return { units: 0 }
    }

    // ── 5. Record AI request ────────────────────────────────
    await supabase.from('ai_requests').insert({
      workspace_id: workspaceId,
      model: MODEL,
      provider: getProviderName(MODEL),
      prompt_tokens: usage.inputTokens,
      completion_tokens: usage.outputTokens,
      cost_usd: calculateCost(MODEL, usage.inputTokens, usage.outputTokens),
      latency_ms: Date.now() - start,
      task_name: 'generate-syllabus',
      prompt_version: PROMPT_VERSION,
    })

    const units = syllabusResult.units
    if (units.length === 0) {
      logger.info('No units in LLM response', { workspaceId })
      return { units: 0 }
    }

    // ── 6. Insert syllabus ──────────────────────────────────
    const { data: syllabus, error: syllabusError } = await supabase
      .from('syllabuses')
      .insert({ workspace_id: workspaceId, version: nextVersion, status: 'active' })
      .select()
      .single()
    if (syllabusError || !syllabus) {
      logger.error('Failed to insert syllabus', { error: syllabusError?.message })
      return { units: 0 }
    }

    // Build lookup maps for concepts and documents
    const conceptMap = new Map<string, string>()
    const { data: allConcepts } = await supabase
      .from('concepts')
      .select('id, name')
      .eq('workspace_id', workspaceId)
    for (const c of allConcepts ?? []) {
      conceptMap.set((c.name as string).toLowerCase(), c.id as string)
    }

    const docMap = new Map<string, string>()
    const { data: allDocs } = await supabase
      .from('documents')
      .select('id, title')
      .eq('workspace_id', workspaceId)
    for (const d of allDocs ?? []) {
      docMap.set((d.title as string).toLowerCase(), d.id as string)
    }

    // ── 7. Insert units + topics with enriched fields ───────
    let totalUnits = 0
    // Track all topic DB IDs for prerequisite resolution
    const topicDbIds: string[] = []

    for (let uIdx = 0; uIdx < units.length; uIdx++) {
      const unit = units[uIdx]!
      const { data: unitRow, error: unitError } = await supabase
        .from('syllabus_units')
        .insert({ syllabus_id: syllabus.id, title: unit.title, order_index: uIdx })
        .select()
        .single()
      if (unitError || !unitRow) continue
      totalUnits++

      for (let tIdx = 0; tIdx < unit.topics.length; tIdx++) {
        const topic = unit.topics[tIdx]!
        const { data: topicRow, error: topicError } = await supabase
          .from('syllabus_topics')
          .insert({
            unit_id: unitRow.id,
            syllabus_id: syllabus.id,
            title: topic.title,
            description: topic.description || null,
            order_index: tIdx,
            learning_objectives: topic.learningObjectives ?? [],
            continuity_notes: topic.continuityNotes || null,
            estimated_duration_minutes: topic.estimatedDurationMinutes ?? 30,
          })
          .select()
          .single()
        if (topicError || !topicRow) {
          topicDbIds.push('')
          continue
        }
        topicDbIds.push(topicRow.id as string)

        // Link topic → concepts
        const topicConceptRows = (topic.conceptNames ?? [])
          .map((name) => conceptMap.get(name.toLowerCase()))
          .filter((id): id is string => Boolean(id))
          .map((conceptId) => ({ topic_id: topicRow.id, concept_id: conceptId }))
        if (topicConceptRows.length > 0) {
          await supabase.from('syllabus_topic_concepts').insert(topicConceptRows)
        }

        // Link topic → documents
        const topicDocRows = (topic.documentTitles ?? [])
          .map((title) => docMap.get(title.toLowerCase()))
          .filter((id): id is string => Boolean(id))
          .map((documentId) => ({ topic_id: topicRow.id, document_id: documentId }))
        if (topicDocRows.length > 0) {
          await supabase.from('syllabus_topic_documents').insert(topicDocRows)
        }
      }
    }

    // ── 8. Resolve prerequisite_topic_ids ────────────────────
    // Flatten topics to get global indices, then map prerequisiteTopicIndices to DB IDs
    let globalIdx = 0
    for (const unit of units) {
      for (const topic of unit.topics) {
        const dbId = topicDbIds[globalIdx]
        if (dbId) {
          const prereqIds = (topic.prerequisiteTopicIndices ?? [])
            .map((i) => topicDbIds[i])
            .filter((id): id is string => Boolean(id))
          if (prereqIds.length > 0) {
            await supabase
              .from('syllabus_topics')
              .update({ prerequisite_topic_ids: prereqIds })
              .eq('id', dbId)
          }
        }
        globalIdx++
      }
    }

    logger.info('Syllabus generated', {
      workspaceId,
      units: totalUnits,
      version: nextVersion,
      totalTopics: topicDbIds.filter(Boolean).length,
      rationale: syllabusResult.learningPathRationale,
    })

    // ── Trigger lesson generation ────────────────────────────
    // Use triggerAndWait so the lesson job starts immediately as a child
    // task instead of going through the queue (eliminates ~90s scheduling gap).
    try {
      const { data: ws } = await supabase
        .from('workspaces')
        .select('user_id')
        .eq('id', workspaceId)
        .single()
      if (ws?.user_id) {
        const { generateLessons } = await import('./generate-lessons')
        await generateLessons.triggerAndWait({ workspaceId, userId: ws.user_id as string })
        logger.info('generate-lessons completed', { workspaceId })
      }
    } catch (err) {
      // Don't fail syllabus job if lesson generation fails
      logger.error('generate-lessons failed', { error: String(err) })
    }

    return { units: totalUnits }
  },
})
