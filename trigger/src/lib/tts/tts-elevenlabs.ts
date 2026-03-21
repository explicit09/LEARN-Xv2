import { logger } from '@trigger.dev/sdk/v3'
import type { TTSProvider, TTSResult, VoiceConfig } from './tts-provider'
import { estimateMp3DurationMs } from './tts-provider'

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech'
const MODEL_ID = 'eleven_turbo_v2'
const VOICE_SETTINGS = { stability: 0.5, similarity_boost: 0.75 }
const REQUEST_TIMEOUT_MS = 60_000

export class ElevenLabsProvider implements TTSProvider {
  readonly name = 'elevenlabs' as const
  private apiKey: string | undefined

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY
  }

  isAvailable(): boolean {
    return !!this.apiKey
  }

  async synthesize(text: string, voice: VoiceConfig): Promise<TTSResult> {
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not set')
    }

    const url = `${ELEVENLABS_API_URL}/${voice.voiceId}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: VOICE_SETTINGS,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'unknown')
        throw new Error(`ElevenLabs TTS failed (${response.status}): ${errorText}`)
      }

      const buffer = await response.arrayBuffer()
      const durationMs = estimateMp3DurationMs(buffer.byteLength)

      logger.info('ElevenLabs TTS complete', {
        voice: voice.name,
        chars: text.length,
        bytes: buffer.byteLength,
        durationMs,
      })

      return { buffer, durationMs }
    } finally {
      clearTimeout(timeout)
    }
  }
}
