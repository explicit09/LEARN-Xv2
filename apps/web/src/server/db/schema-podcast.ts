import {
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { concepts, documents, lessons, users, workspaces } from './schema'

export const podcasts = pgTable('podcasts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  format: text('format', { enum: ['single_voice', 'conversation'] })
    .notNull()
    .default('conversation'),
  storageUrl: text('storage_url'),
  durationSeconds: integer('duration_seconds'),
  transcript: text('transcript'),
  voiceConfig: jsonb('voice_config').notNull().default({}),
  progress: integer('progress').notNull().default(0),
  generationTimeSeconds: integer('generation_time_seconds'),
  totalCostUsd: numeric('total_cost_usd', { precision: 10, scale: 6 }).notNull().default('0'),
  ttsProvider: text('tts_provider', { enum: ['elevenlabs', 'openai'] })
    .notNull()
    .default('elevenlabs'),
  status: text('status', {
    enum: ['pending', 'generating', 'synthesizing', 'assembling', 'ready', 'failed'],
  })
    .notNull()
    .default('pending'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const podcastSegments = pgTable(
  'podcast_segments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    podcastId: uuid('podcast_id')
      .notNull()
      .references(() => podcasts.id, { onDelete: 'cascade' }),
    segmentIndex: integer('segment_index').notNull(),
    speaker: text('speaker', { enum: ['host_a', 'host_b'] }).notNull(),
    text: text('text').notNull(),
    audioUrl: text('audio_url'),
    durationSeconds: numeric('duration_seconds', { precision: 8, scale: 2 }),
    startTime: numeric('start_time', { precision: 8, scale: 2 }),
    endTime: numeric('end_time', { precision: 8, scale: 2 }),
    conceptId: uuid('concept_id').references(() => concepts.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('idx_podcast_segments_unique').on(table.podcastId, table.segmentIndex)],
)
