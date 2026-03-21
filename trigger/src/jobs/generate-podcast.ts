import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import { generateText, Output } from 'ai'

import { getProvider, getProviderName, calculateCost, MODEL_ROUTES } from '../lib/ai'
import { buildAiRequestRow } from '../lib/tracked-generate'
import { assembleSegments } from '../lib/audio-assembly'
import { createTTSProvider, getVoice, estimateTTSCost, type Speaker } from '../lib/tts/tts-provider'
import {
  buildPodcastDialoguePrompt,
  PODCAST_DIALOGUE_PROMPT_VERSION,
} from '../../../apps/web/src/lib/ai/prompts/podcast-dialogue.v1'
import { dialogueOutputSchema } from '../../../packages/validators/src/podcast'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const STORAGE_BUCKET = 'audio-recaps'

function makeSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface GeneratePodcastPayload {
  workspaceId: string
  lessonId: string
  userId: string
  format: 'single_voice' | 'conversation'
  ttsProvider?: 'elevenlabs' | 'openai'
}

async function updatePodcast(
  supabase: ReturnType<typeof makeSupabase>,
  podcastId: string,
  fields: Record<string, unknown>,
) {
  await supabase
    .from('podcasts')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', podcastId)
}

export const generatePodcast = task({
  id: 'generate-podcast',
  run: async (payload: GeneratePodcastPayload) => {
    const supabase = makeSupabase()
    const { workspaceId, lessonId, userId, format } = payload
    const startTime = Date.now()

    // 1. Fetch lesson + concepts
    const { data: lesson } = await supabase
      .from('lessons')
      .select('id, title, content_markdown, summary, key_takeaways')
      .eq('id', lessonId)
      .eq('workspace_id', workspaceId)
      .single()

    if (!lesson) {
      logger.warn('Lesson not found', { lessonId })
      return { skipped: true }
    }

    const { data: lessonConcepts } = await supabase
      .from('lesson_concepts')
      .select('concept_id, concepts(name)')
      .eq('lesson_id', lessonId)

    const conceptNames = (lessonConcepts ?? [])
      .map((lc: Record<string, unknown>) => {
        const c = lc.concepts
        if (Array.isArray(c) && c.length > 0) return (c[0] as { name: string }).name
        if (c && typeof c === 'object' && 'name' in c) return (c as { name: string }).name
        return undefined
      })
      .filter(Boolean) as string[]

    // 2. Create podcast row
    const ttsProviderName = payload.ttsProvider ?? 'elevenlabs'
    const { data: podcast, error: insertError } = await supabase
      .from('podcasts')
      .insert({
        workspace_id: workspaceId,
        lesson_id: lessonId,
        user_id: userId,
        title: `Podcast: ${lesson.title}`,
        format,
        tts_provider: ttsProviderName,
        status: 'generating',
        progress: 5,
      })
      .select('id')
      .single()

    if (insertError || !podcast) {
      throw new Error(`Failed to create podcast row: ${insertError?.message}`)
    }

    const podcastId = podcast.id as string

    try {
      // 3. Generate dialogue via LLM
      const content = lesson.content_markdown || lesson.summary || lesson.title
      const prompt = buildPodcastDialoguePrompt({
        lessonTitle: lesson.title,
        lessonContent: content,
        conceptNames,
        format,
      })

      const model = MODEL_ROUTES.LESSON_GENERATION
      const provider = getProvider(model)
      const llmStart = Date.now()

      const { output: dialogue, usage } = await generateText({
        model: provider(model),
        prompt,
        output: Output.object({ schema: dialogueOutputSchema }),
        maxOutputTokens: 2000,
      })

      if (!dialogue) {
        throw new Error('LLM returned no structured output for podcast dialogue')
      }

      const llmLatency = Date.now() - llmStart

      // Rule 6: Track AI request
      const costUsd = calculateCost(model, usage.inputTokens ?? 0, usage.outputTokens ?? 0)
      await supabase.from('ai_requests').insert(
        buildAiRequestRow({
          workspaceId,
          userId,
          model,
          provider: getProviderName(model) as 'anthropic' | 'openai' | 'google',
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          latencyMs: llmLatency,
          taskName: PODCAST_DIALOGUE_PROMPT_VERSION,
          promptVersion: PODCAST_DIALOGUE_PROMPT_VERSION,
          validationPassed: true,
          costUsd,
        }),
      )

      await updatePodcast(supabase, podcastId, { progress: 30 })

      // 4. Insert segment rows (text only)
      const segmentRows = dialogue.segments.map((seg, i) => ({
        podcast_id: podcastId,
        segment_index: i,
        speaker: seg.speaker,
        text: seg.text,
      }))

      const { data: insertedSegments } = await supabase
        .from('podcast_segments')
        .insert(segmentRows)
        .select('id, segment_index')

      const segmentIdMap = new Map(
        (insertedSegments ?? []).map((s: { id: string; segment_index: number }) => [
          s.segment_index,
          s.id,
        ]),
      )

      // Build full transcript
      const transcript = dialogue.segments
        .map((s) => `${s.speaker === 'host_a' ? 'Rachel' : 'Antoni'}: ${s.text}`)
        .join('\n\n')

      await updatePodcast(supabase, podcastId, {
        status: 'synthesizing',
        progress: 30,
        transcript,
      })

      // 5. TTS synthesis per segment
      const tts = createTTSProvider(ttsProviderName)
      const audioSegments: Array<{ buffer: ArrayBuffer; durationMs: number }> = []
      let totalTTSCost = 0
      const hasAnyTTS = tts.isAvailable()

      if (hasAnyTTS) {
        for (let i = 0; i < dialogue.segments.length; i++) {
          const seg = dialogue.segments[i]!
          const voice = getVoice(ttsProviderName, seg.speaker as Speaker)

          const { buffer, durationMs } = await tts.synthesize(seg.text, voice)
          audioSegments.push({ buffer, durationMs })

          // Upload segment audio
          const segPath = `podcasts/${workspaceId}/${podcastId}/segment-${i}.mp3`
          await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(segPath, buffer, { contentType: 'audio/mpeg', upsert: true })

          const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(segPath)

          // Update segment row
          const segId = segmentIdMap.get(i)
          if (segId) {
            await supabase
              .from('podcast_segments')
              .update({
                audio_url: urlData.publicUrl,
                duration_seconds: (durationMs / 1000).toFixed(2),
              })
              .eq('id', segId)
          }

          totalTTSCost += estimateTTSCost(ttsProviderName, seg.text.length)

          // Update progress (30→90 proportionally)
          const segProgress = 30 + Math.round(((i + 1) / dialogue.segments.length) * 60)
          await updatePodcast(supabase, podcastId, { progress: segProgress })
        }

        // 6. Assemble final audio
        await updatePodcast(supabase, podcastId, { status: 'assembling', progress: 90 })

        const assembly = assembleSegments(audioSegments)

        // Update segment timings
        for (const timing of assembly.timings) {
          const segId = segmentIdMap.get(timing.segmentIndex)
          if (segId) {
            await supabase
              .from('podcast_segments')
              .update({
                start_time: (timing.startTimeMs / 1000).toFixed(2),
                end_time: (timing.endTimeMs / 1000).toFixed(2),
              })
              .eq('id', segId)
          }
        }

        // Upload final MP3
        const finalPath = `podcasts/${workspaceId}/${podcastId}/full.mp3`
        await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(finalPath, assembly.buffer, { contentType: 'audio/mpeg', upsert: true })

        const { data: finalUrl } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(finalPath)

        const totalDurationSec = Math.round(assembly.totalDurationMs / 1000)
        const generationTimeSec = Math.round((Date.now() - startTime) / 1000)

        await updatePodcast(supabase, podcastId, {
          storage_url: finalUrl.publicUrl,
          duration_seconds: totalDurationSec,
          generation_time_seconds: generationTimeSec,
          total_cost_usd: (costUsd + totalTTSCost).toFixed(6),
          status: 'ready',
          progress: 100,
        })

        logger.info('Podcast generated with audio', { podcastId, totalDurationSec })
      } else {
        // No TTS available — transcript-only mode
        const wordCount = transcript.split(/\s+/).length
        const estimatedDuration = Math.round((wordCount / 150) * 60)

        await updatePodcast(supabase, podcastId, {
          duration_seconds: estimatedDuration,
          total_cost_usd: costUsd.toFixed(6),
          generation_time_seconds: Math.round((Date.now() - startTime) / 1000),
          status: 'ready',
          progress: 100,
        })

        logger.info('Podcast generated (transcript only)', { podcastId })
      }

      return { podcastId, hasAudio: hasAnyTTS }
    } catch (err) {
      await updatePodcast(supabase, podcastId, {
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
      })
      throw err
    }
  },
})
