import { boolean, integer, jsonb, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { concepts, users, workspaces } from './schema'

export const exams = pgTable('exams', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  timeLimitMinutes: integer('time_limit_minutes'),
  status: text('status', { enum: ['draft', 'active', 'closed'] })
    .notNull()
    .default('draft'),
  joinToken: text('join_token'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const examQuestions = pgTable('exam_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  examId: uuid('exam_id')
    .notNull()
    .references(() => exams.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  questionType: text('question_type', {
    enum: ['mcq', 'short_answer', 'true_false', 'fill_blank'],
  }).notNull(),
  options: jsonb('options'),
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation'),
  bloomLevel: text('bloom_level', {
    enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
  }),
  conceptId: uuid('concept_id').references(() => concepts.id, { onDelete: 'set null' }),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const examAttempts = pgTable('exam_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  examId: uuid('exam_id')
    .notNull()
    .references(() => exams.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  score: real('score'),
  timeSpentSeconds: integer('time_spent_seconds'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const examResponses = pgTable('exam_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  attemptId: uuid('attempt_id')
    .notNull()
    .references(() => examAttempts.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id')
    .notNull()
    .references(() => examQuestions.id, { onDelete: 'cascade' }),
  userAnswer: text('user_answer'),
  isCorrect: boolean('is_correct'),
  feedback: text('feedback'),
  pointsEarned: real('points_earned').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
