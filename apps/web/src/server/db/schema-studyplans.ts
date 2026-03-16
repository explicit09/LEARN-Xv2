import { date, jsonb, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users, workspaces } from './schema'

export const studyPlans = pgTable('study_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  date: date('date').notNull().defaultNow(),
  items: jsonb('items').notNull().default([]),
  examDate: date('exam_date'),
  readinessScore: real('readiness_score'),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
