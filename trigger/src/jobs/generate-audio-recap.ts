import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { anthropic, MODEL_ROUTES } from '../lib/ai'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const AUDIO_PROMPT_VERSION = 'audio-recap-dialogue.v1'

// ElevenLabs voice IDs
const VOICE_HOST_A = '21m00Tcm4TlvDq8ikWAM' // Rachel (Host A); Antoni: ErXwobaYiN019PkySvjV (Host B)

function makeSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface GenerateAudioRecapPayload {
  workspaceId: string
  lessonId: string
  userId: string
}

async function buildDialogueScript(lessonTitle: string, lessonContent: string): Promise<string> {
  return `You are writing a two-host educational podcast dialogue.
Host A (Rachel) is an expert explaining concepts clearly.
Host B (Antoni) asks clarifying questions and helps reinforce key points.

Lesson: "${lessonTitle}"

Content to cover:
${lessonContent.slice(0, 3000)}

Write a natural dialogue (600-800 words) where:
1. Host A introduces the topic
2. Host B asks a clarifying question
3. They alternate explaining key concepts with examples
4. Host A wraps up with 2-3 key takeaways

Format each line as "HostA: text" or "HostB: text".
Keep it conversational and educational, not a lecture.`
}

export const generateAudioRecap = task({
  id: 'generate-audio-recap',
  run: async (payload: GenerateAudioRecapPayload) => {
    const supabase = makeSupabase()
    const { workspaceId, lessonId, userId } = payload

    // Fetch lesson
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

    // Create audio_recap row in generating state
    const { data: recap, error: recapError } = await supabase
      .from('audio_recaps')
      .insert({
        workspace_id: workspaceId,
        lesson_id: lessonId,
        title: `Audio Recap: ${lesson.title}`,
        status: 'generating',
      })
      .select('id')
      .single()

    if (recapError || !recap) {
      throw new Error(`Failed to create audio recap row: ${recapError?.message}`)
    }

    try {
      // Build lesson content from markdown or summary
      const content = lesson.content_markdown || lesson.summary || lesson.title
      const prompt = await buildDialogueScript(lesson.title, content)

      const startMs = Date.now()
      const { text: dialogue, usage } = await generateText({
        model: anthropic(MODEL_ROUTES.LESSON_GENERATION),
        prompt,
        maxOutputTokens: 1200,
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
        task_name: AUDIO_PROMPT_VERSION,
      })

      let storageUrl: string | null = null
      let durationSeconds: number | null = null

      if (ELEVENLABS_API_KEY) {
        // Extract Host A lines for primary TTS (concatenated script)
        const hostALines = dialogue
          .split('\n')
          .filter((line) => line.startsWith('HostA:'))
          .map((line) => line.replace('HostA: ', ''))
          .join(' ')

        const hostBLines = dialogue
          .split('\n')
          .filter((line) => line.startsWith('HostB:'))
          .map((line) => line.replace('HostB: ', ''))
          .join(' ')

        // TTS for Host A
        const ttsResponseA = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_HOST_A}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
              text: hostALines,
              model_id: 'eleven_turbo_v2',
              voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
          },
        )

        if (ttsResponseA.ok) {
          const audioBuffer = await ttsResponseA.arrayBuffer()
          const fileName = `audio-recaps/${workspaceId}/${recap.id}-host-a.mp3`
          const { error: uploadError } = await supabase.storage
            .from('audio-recaps')
            .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true })

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('audio-recaps').getPublicUrl(fileName)
            storageUrl = urlData.publicUrl
            // Estimate duration: ~150 words per minute average
            const wordCount = hostALines.split(' ').length + hostBLines.split(' ').length
            durationSeconds = Math.round((wordCount / 150) * 60)
          }
        }
      } else {
        // No ElevenLabs key — store transcript only
        logger.info('No ELEVENLABS_API_KEY, storing transcript only', { recapId: recap.id })
        durationSeconds = null
      }

      // Update recap with results
      await supabase
        .from('audio_recaps')
        .update({
          storage_url: storageUrl,
          duration_seconds: durationSeconds,
          transcript: dialogue,
          status: storageUrl ? 'ready' : 'ready', // ready even if no audio (transcript available)
          updated_at: new Date().toISOString(),
        })
        .eq('id', recap.id)

      logger.info('Audio recap generated', { recapId: recap.id, hasAudio: !!storageUrl })
      return { recapId: recap.id, hasAudio: !!storageUrl }
    } catch (err) {
      await supabase
        .from('audio_recaps')
        .update({
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', recap.id)
      throw err
    }
  },
})
