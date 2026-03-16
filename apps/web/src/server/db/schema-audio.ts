import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { documents, lessons, workspaces } from './schema'

export const audioRecaps = pgTable('audio_recaps', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  storageUrl: text('storage_url'),
  durationSeconds: integer('duration_seconds'),
  transcript: text('transcript'),
  status: text('status', { enum: ['pending', 'generating', 'ready', 'failed'] })
    .notNull()
    .default('pending'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
