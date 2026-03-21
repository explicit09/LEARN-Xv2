import { z } from 'zod'

// ============================================================
// Enums
// ============================================================

export const podcastFormatEnum = z.enum(['single_voice', 'conversation'])
export const podcastStatusEnum = z.enum([
  'pending',
  'generating',
  'synthesizing',
  'assembling',
  'ready',
  'failed',
])
export const ttsProviderEnum = z.enum(['elevenlabs', 'openai'])
export const podcastSpeakerEnum = z.enum(['host_a', 'host_b'])

// ============================================================
// Input schemas
// ============================================================

export const generatePodcastSchema = z.object({
  workspaceId: z.string().uuid(),
  lessonId: z.string().uuid(),
  format: podcastFormatEnum.optional().default('conversation'),
  ttsProvider: ttsProviderEnum.optional(),
})

export const getPodcastSchema = z.object({
  workspaceId: z.string().uuid(),
  lessonId: z.string().uuid(),
})

export const getPodcastByIdSchema = z.object({
  podcastId: z.string().uuid(),
})

export const listPodcastsSchema = z.object({
  workspaceId: z.string().uuid(),
  status: podcastStatusEnum.optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  cursor: z.string().uuid().optional(),
})

export const listAllPodcastsSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(20),
  cursor: z.string().uuid().optional(),
})

export const deletePodcastSchema = z.object({
  podcastId: z.string().uuid(),
})

// ============================================================
// Segment schema (for output / structured generation)
// ============================================================

export const podcastSegmentSchema = z.object({
  id: z.string().uuid(),
  segmentIndex: z.number().int(),
  speaker: podcastSpeakerEnum,
  text: z.string(),
  audioUrl: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  startTime: z.number().nullable(),
  endTime: z.number().nullable(),
  conceptId: z.string().uuid().nullable(),
})

// ============================================================
// Dialogue generation output (used in prompt + Trigger job)
// ============================================================

export const dialogueSegmentSchema = z.object({
  speaker: podcastSpeakerEnum,
  text: z.string().min(1),
  conceptHint: z.string().optional(),
})

export const dialogueOutputSchema = z.object({
  segments: z.array(dialogueSegmentSchema).min(2).max(30),
})

// ============================================================
// Types
// ============================================================

export type PodcastFormat = z.infer<typeof podcastFormatEnum>
export type PodcastStatus = z.infer<typeof podcastStatusEnum>
export type TTSProvider = z.infer<typeof ttsProviderEnum>
export type PodcastSpeaker = z.infer<typeof podcastSpeakerEnum>
export type DialogueSegment = z.infer<typeof dialogueSegmentSchema>
export type DialogueOutput = z.infer<typeof dialogueOutputSchema>
export type PodcastSegment = z.infer<typeof podcastSegmentSchema>
