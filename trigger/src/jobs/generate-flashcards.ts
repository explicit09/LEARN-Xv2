import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import { generateObject } from 'ai'
import { z } from 'zod'

import { openaiProvider } from '../lib/ai'
import {
  buildFlashcardGenerationPrompt,
  FLASHCARD_GENERATION_PROMPT_VERSION,
} from '../lib/prompts/flashcard-generation.v1'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function makeSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface GenerateFlashcardsPayload {
  workspaceId: string
  lessonId?: string
  title?: string
}

const flashcardItemSchema = z.object({
  front: z.string(),
  back: z.string(),
  concept_name: z.string().nullable().optional(),
})

const flashcardOutputSchema = z.object({
  flashcards: z.array(flashcardItemSchema),
})

export const generateFlashcards = task({
  id: 'generate-flashcards',
  run: async (payload: GenerateFlashcardsPayload) => {
    const supabase = makeSupabase()
    const { workspaceId, lessonId } = payload

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

    // Fetch concepts
    const { data: concepts } = await supabase
      .from('concepts')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .limit(20)

    // Fetch chunks
    const { data: chunks } = await supabase
      .from('chunks')
      .select('content, enriched_content')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(15)

    if (!chunks?.length) {
      logger.info('No chunks found, skipping flashcard generation', { workspaceId })
      return { skipped: true }
    }

    const conceptNames = concepts?.map((c) => c.name) ?? []
    const conceptMap = new Map((concepts ?? []).map((c) => [c.name.toLowerCase(), c.id]))
    const chunkTexts = chunks.map((c) => c.enriched_content ?? c.content)

    const setTitle = payload.title ?? `Flashcards — ${workspace.name}`
    const startMs = Date.now()

    // Build and call LLM
    const prompt = buildFlashcardGenerationPrompt({
      title: setTitle,
      chunks: chunkTexts,
      conceptNames,
      cardCount: 10,
    })

    const { object: output, usage } = await generateObject({
      model: openaiProvider('gpt-4o-mini'),
      schema: flashcardOutputSchema,
      prompt,
    })

    const latencyMs = Date.now() - startMs

    // Track ai_request
    await supabase.from('ai_requests').insert({
      workspace_id: workspaceId,
      model: 'gpt-4o-mini',
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      cost_usd: usage.promptTokens * 0.00000015 + usage.completionTokens * 0.0000006,
      latency_ms: latencyMs,
      task_name: FLASHCARD_GENERATION_PROMPT_VERSION,
    })

    // Create flashcard set
    const { data: flashcardSet, error: setError } = await supabase
      .from('flashcard_sets')
      .insert({
        workspace_id: workspaceId,
        ...(lessonId ? { lesson_id: lessonId } : {}),
        title: setTitle,
        source_type: lessonId ? 'lesson' : 'workspace',
      })
      .select('id')
      .single()

    if (setError || !flashcardSet) {
      throw new Error(`Failed to create flashcard set: ${setError?.message}`)
    }

    // Insert flashcards
    if (output.flashcards.length > 0) {
      const { error: insertError } = await supabase.from('flashcards').insert(
        output.flashcards.map((f) => {
          const conceptId = f.concept_name
            ? (conceptMap.get(f.concept_name.toLowerCase()) ?? null)
            : null
          return {
            set_id: flashcardSet.id,
            front: f.front,
            back: f.back,
            ...(conceptId ? { concept_id: conceptId } : {}),
          }
        }),
      )
      if (insertError) {
        throw new Error(`Failed to insert flashcards: ${insertError.message}`)
      }
    }

    logger.info('Flashcards generated', {
      setId: flashcardSet.id,
      count: output.flashcards.length,
    })
    return { setId: flashcardSet.id, count: output.flashcards.length }
  },
})
