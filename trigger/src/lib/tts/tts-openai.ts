import { logger } from '@trigger.dev/sdk/v3'
import OpenAI from 'openai'
import type { TTSProvider, TTSResult, VoiceConfig } from './tts-provider'
import { estimateMp3DurationMs } from './tts-provider'

const MODEL = 'tts-1' as const
const RESPONSE_FORMAT = 'mp3' as const

export class OpenAITTSProvider implements TTSProvider {
  readonly name = 'openai' as const
  private client: OpenAI | null = null

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    }
  }

  isAvailable(): boolean {
    return this.client !== null
  }

  async synthesize(text: string, voice: VoiceConfig): Promise<TTSResult> {
    if (!this.client) {
      throw new Error('OPENAI_API_KEY is not set')
    }

    const response = await this.client.audio.speech.create({
      model: MODEL,
      voice: voice.voiceId as 'nova' | 'onyx' | 'alloy' | 'echo' | 'fable' | 'shimmer',
      input: text,
      response_format: RESPONSE_FORMAT,
    })

    const buffer = await response.arrayBuffer()
    const durationMs = estimateMp3DurationMs(buffer.byteLength)

    logger.info('OpenAI TTS complete', {
      voice: voice.name,
      chars: text.length,
      bytes: buffer.byteLength,
      durationMs,
    })

    return { buffer, durationMs }
  }
}
