import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import { generateText, Output } from 'ai'
import { z } from 'zod'

import { anthropic, MODEL_ROUTES, calculateCost } from '../lib/ai'
import { deduplicateConcepts, normalizeConceptName } from '../lib/concept-utils'
import { selectChunksWithinBudget } from '../lib/chunk-budget'
import { buildExtractConceptsPrompt, PROMPT_VERSION } from '../lib/prompts/extract-concepts.v1'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface ExtractConceptsPayload {
  workspaceId: string
}

function makeSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const extractionSchema = z.object({
  concepts: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
    }),
  ),
  relations: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      type: z.enum(['prerequisite', 'related', 'part_of', 'extends']),
    }),
  ),
})

export const extractConcepts = task({
  id: 'extract-concepts',
  maxDuration: 900,
  retry: { maxAttempts: 2 },

  run: async (payload: ExtractConceptsPayload) => {
    const { workspaceId } = payload
    const supabase = makeSupabase()

    // ── 1. Fetch workspace name ───────────────────────────────
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('name, settings')
      .eq('id', workspaceId)
      .single()
    if (wsError || !workspace) {
      logger.error('Workspace not found', { workspaceId })
      return { concepts: 0 }
    }

    const wsSettings = (workspace.settings as Record<string, unknown>) ?? {}
    const detectedDomain = wsSettings.primaryDomain as string | undefined
    const detectedSubfield = wsSettings.subfield as string | undefined

    // ── 2. Sample up to 50 chunks (most recent) ───────────────
    const { data: chunks } = await supabase
      .from('chunks')
      .select('id, enriched_content, content')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!chunks || chunks.length === 0) {
      logger.info('No chunks found, skipping concept extraction', { workspaceId })
      return { concepts: 0 }
    }

    const fullTexts = chunks.map(
      (c) => (c.enriched_content as string | null) ?? (c.content as string),
    )
    const chunkTexts = selectChunksWithinBudget(fullTexts, 120_000)

    // ── 3. Call LLM via Vercel AI SDK ─────────────────────────
    const MODEL = MODEL_ROUTES.CONCEPT_EXTRACTION
    const prompt = buildExtractConceptsPrompt(
      chunkTexts,
      workspace.name as string,
      detectedDomain,
      detectedSubfield,
    )
    const start = Date.now()

    let extraction: z.infer<typeof extractionSchema>
    let usage = { inputTokens: 0, outputTokens: 0 }
    try {
      const result = await generateText({
        model: anthropic(MODEL),
        output: Output.object({ schema: extractionSchema }),
        prompt,
      })
      extraction = result.output
      usage = {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
      }
    } catch (err) {
      logger.error('LLM call failed', { error: String(err) })
      return { concepts: 0 }
    }

    // ── 4. Record AI request ──────────────────────────────────
    await supabase.from('ai_requests').insert({
      workspace_id: workspaceId,
      model: MODEL,
      provider: 'anthropic',
      prompt_tokens: usage.inputTokens,
      completion_tokens: usage.outputTokens,
      cost_usd: calculateCost(MODEL, usage.inputTokens, usage.outputTokens),
      latency_ms: Date.now() - start,
      task_name: 'extract-concepts',
      prompt_version: PROMPT_VERSION,
    })

    const rawConcepts = extraction.concepts.filter((c) => c.name && typeof c.name === 'string')

    if (rawConcepts.length === 0) {
      logger.info('No concepts extracted', { workspaceId })
      return { concepts: 0 }
    }

    // ── 5. Deduplicate ────────────────────────────────────────
    const deduplicated = deduplicateConcepts(rawConcepts)

    // ── 6. Upsert concepts ────────────────────────────────────
    const conceptRows = deduplicated.map((c) => ({
      workspace_id: workspaceId,
      name: c.name,
      description: c.description || null,
      tags: c.tags,
    }))

    const { data: insertedConcepts, error: insertError } = await supabase
      .from('concepts')
      .upsert(conceptRows, { onConflict: 'workspace_id,name', ignoreDuplicates: false })
      .select('id, name')
    if (insertError) {
      logger.error('Failed to upsert concepts', { error: insertError.message })
      return { concepts: 0 }
    }

    const conceptIdMap = new Map<string, string>()
    for (const c of insertedConcepts ?? []) {
      conceptIdMap.set(normalizeConceptName(c.name as string), c.id as string)
    }

    // ── 7. Upsert concept relations ───────────────────────────
    const relationRows = extraction.relations
      .map((r) => ({
        source_concept_id: conceptIdMap.get(normalizeConceptName(r.source)),
        target_concept_id: conceptIdMap.get(normalizeConceptName(r.target)),
        relation_type: r.type,
      }))
      .filter((r) => r.source_concept_id && r.target_concept_id)

    if (relationRows.length > 0) {
      await supabase.from('concept_relations').upsert(
        relationRows as {
          source_concept_id: string
          target_concept_id: string
          relation_type: string
        }[],
        {
          onConflict: 'source_concept_id,target_concept_id,relation_type',
          ignoreDuplicates: true,
        },
      )
    }

    // ── 8. Link chunk_concepts ─────────────────────────────────
    const chunkConceptRows: { chunk_id: string; concept_id: string }[] = []
    for (const chunk of chunks) {
      const text = (
        (chunk.enriched_content as string | null) ?? (chunk.content as string)
      ).toLowerCase()
      for (const [normalizedName, conceptId] of conceptIdMap.entries()) {
        if (text.includes(normalizedName)) {
          chunkConceptRows.push({ chunk_id: chunk.id as string, concept_id: conceptId })
        }
      }
    }
    if (chunkConceptRows.length > 0) {
      await supabase
        .from('chunk_concepts')
        .upsert(chunkConceptRows, { onConflict: 'chunk_id,concept_id', ignoreDuplicates: true })
    }

    // ── 9. Trigger generate-syllabus ──────────────────────────
    // Use triggerAndWait to eliminate queue scheduling gap (~90s).
    // Syllabus job then chains to generate-lessons in the same way.
    try {
      const { generateSyllabus } = await import('./generate-syllabus')
      await generateSyllabus.triggerAndWait({ workspaceId })
    } catch (err) {
      logger.error('generate-syllabus failed', { error: String(err) })
    }

    logger.info('Concepts extracted', { workspaceId, count: deduplicated.length })
    return { concepts: deduplicated.length }
  },
})
