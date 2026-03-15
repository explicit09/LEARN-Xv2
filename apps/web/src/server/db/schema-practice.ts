import { boolean, integer, jsonb, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { concepts, lessons, users, workspaces } from './schema'

export const quizzes = pgTable('quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
  quizType: text('quiz_type', {
    enum: ['practice', 'review', 'exam_prep', 'diagnostic'],
  })
    .notNull()
    .default('practice'),
  title: text('title'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  questionType: text('question_type', {
    enum: ['multiple_choice', 'true_false', 'short_answer', 'fill_blank'],
  }).notNull(),
  options: jsonb('options'),
  correctAnswer: text('correct_answer').notNull(),
  bloomLevel: text('bloom_level', {
    enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
  }),
  conceptId: uuid('concept_id').references(() => concepts.id, { onDelete: 'set null' }),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  score: real('score'),
  timeSpentSeconds: integer('time_spent_seconds'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const quizResponses = pgTable('quiz_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  attemptId: uuid('attempt_id')
    .notNull()
    .references(() => quizAttempts.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id')
    .notNull()
    .references(() => quizQuestions.id, { onDelete: 'cascade' }),
  userAnswer: text('user_answer').notNull(),
  isCorrect: boolean('is_correct'),
  feedback: text('feedback'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const flashcardSets = pgTable('flashcard_sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  sourceType: text('source_type', { enum: ['lesson', 'workspace', 'manual'] })
    .notNull()
    .default('manual'),
  sourceId: uuid('source_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const flashcards = pgTable('flashcards', {
  id: uuid('id').primaryKey().defaultRandom(),
  setId: uuid('set_id')
    .notNull()
    .references(() => flashcardSets.id, { onDelete: 'cascade' }),
  conceptId: uuid('concept_id').references(() => concepts.id, { onDelete: 'set null' }),
  front: text('front').notNull(),
  back: text('back').notNull(),
  stability: real('stability').notNull().default(0),
  difficulty: real('difficulty').notNull().default(0),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull().defaultNow(),
  reps: integer('reps').notNull().default(0),
  lapses: integer('lapses').notNull().default(0),
  state: integer('state').notNull().default(0),
  lastReview: timestamp('last_review', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const flashcardReviews = pgTable('flashcard_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  flashcardId: uuid('flashcard_id')
    .notNull()
    .references(() => flashcards.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  elapsedDays: real('elapsed_days').notNull().default(0),
  scheduledDays: real('scheduled_days').notNull().default(0),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull().defaultNow(),
})
