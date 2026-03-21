import { logger } from '@trigger.dev/sdk/v3'

/** Result from a TTS synthesis call. */
export interface TTSResult {
  buffer: ArrayBuffer
  /** Estimated duration in milliseconds. */
  durationMs: number
}

/** Voice configuration for a speaker. */
export interface VoiceConfig {
  voiceId: string
  name: string
}

/** TTS provider interface — implemented by ElevenLabs and OpenAI. */
export interface TTSProvider {
  readonly name: 'elevenlabs' | 'openai'
  isAvailable(): boolean
  synthesize(text: string, voice: VoiceConfig): Promise<TTSResult>
}

/** Default voice mappings per provider + speaker. */
export const VOICE_MAP = {
  elevenlabs: {
    host_a: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
    host_b: { voiceId: 'ErXwobaYiN019PkySvjV', name: 'Antoni' },
  },
  openai: {
    host_a: { voiceId: 'nova', name: 'Nova' },
    host_b: { voiceId: 'onyx', name: 'Onyx' },
  },
} as const

export type Speaker = 'host_a' | 'host_b'

/** Get the voice config for a speaker on a given provider. */
export function getVoice(provider: 'elevenlabs' | 'openai', speaker: Speaker): VoiceConfig {
  return VOICE_MAP[provider][speaker]
}

/**
 * Create a TTS provider with fallback logic.
 * Tries the preferred provider first; falls back to the other if unavailable.
 */
export function createTTSProvider(preferred?: 'elevenlabs' | 'openai'): TTSProvider {
  // Lazy imports to avoid loading unused providers
  const providers: Array<() => Promise<TTSProvider>> = []

  if (!preferred || preferred === 'elevenlabs') {
    providers.push(async () => {
      const { ElevenLabsProvider } = await import('./tts-elevenlabs')
      return new ElevenLabsProvider()
    })
  }

  providers.push(async () => {
    const { OpenAITTSProvider } = await import('./tts-openai')
    return new OpenAITTSProvider()
  })

  if (preferred === 'openai') {
    providers.push(async () => {
      const { ElevenLabsProvider } = await import('./tts-elevenlabs')
      return new ElevenLabsProvider()
    })
  }

  // Try providers in order, return first available
  return {
    name: preferred ?? 'elevenlabs',
    isAvailable: () => true,
    synthesize: async (text, voice) => {
      for (const load of providers) {
        const provider = await load()
        if (provider.isAvailable()) {
          return provider.synthesize(text, voice)
        }
      }
      throw new Error('No TTS provider available. Set ELEVENLABS_API_KEY or OPENAI_API_KEY.')
    },
  } satisfies TTSProvider
}

/**
 * Estimate MP3 duration from buffer size.
 * Assumes 128kbps bitrate (typical for ElevenLabs and OpenAI TTS output).
 */
export function estimateMp3DurationMs(bufferByteLength: number): number {
  const bitrateKbps = 128
  const bytesPerMs = (bitrateKbps * 1000) / 8 / 1000
  return Math.round(bufferByteLength / bytesPerMs)
}

/**
 * Cost per character by TTS provider (USD).
 * ElevenLabs Creator tier: ~$0.30/1K chars
 * OpenAI TTS-1: ~$0.015/1K chars
 */
export const TTS_COST_PER_CHAR: Record<string, number> = {
  elevenlabs: 0.0003,
  openai: 0.000015,
}

export function estimateTTSCost(provider: string, charCount: number): number {
  const costPerChar = TTS_COST_PER_CHAR[provider] ?? 0.0003
  return charCount * costPerChar
}
