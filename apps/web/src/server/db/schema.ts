import {
  boolean,
  customType,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// ============================================================
// Custom types
// ============================================================

const halfvec = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'halfvec(3072)'
  },
  fromDriver(val: string) {
    return JSON.parse(val) as number[]
  },
  toDriver(val: number[]) {
    return `[${val.join(',')}]`
  },
})

// ============================================================
// Identity & Access
// ============================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authId: uuid('auth_id').unique().notNull(),
  displayName: text('display_name').notNull(),
  email: text('email').notNull(),
  avatarUrl: text('avatar_url'),
  userType: text('user_type').notNull().default('student'),
  isAdmin: boolean('is_admin').notNull().default(false),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const personas = pgTable(
  'personas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    interests: text('interests').array().notNull().default([]),
    aspirationTags: text('aspiration_tags').array().notNull().default([]),
    affinityDomains: text('affinity_domains').array().notNull().default([]),
    motivationalStyle: text('motivational_style').notNull().default('mastery'),
    explanationPreferences: jsonb('explanation_preferences').notNull().default({}),
    performanceProfile: jsonb('performance_profile').notNull().default({}),
    tonePreference: text('tone_preference').notNull().default('balanced'),
    difficultyPreference: text('difficulty_preference').notNull().default('adaptive'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('personas_user_version_idx').on(table.userId, table.version)],
)

// ============================================================
// Workspace Core
// ============================================================

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  settings: jsonb('settings').notNull().default({}),
  totalTokenCount: integer('total_token_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================================
// Documents
// ============================================================

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  fileType: text('file_type').notNull(),
  fileUrl: text('file_url').notNull(),
  status: text('status').notNull().default('uploading'),
  pageCount: integer('page_count'),
  tokenCount: integer('token_count').notNull().default(0),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================================
// Chunks
// ============================================================

export const chunks = pgTable('chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  enrichedContent: text('enriched_content'),
  chunkIndex: integer('chunk_index').notNull(),
  pageNumber: integer('page_number'),
  tokenCount: integer('token_count').notNull().default(0),
  sectionHeading: text('section_heading'),
  contentType: text('content_type').default('text'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================================
// Chunk embeddings — chunk_id is the primary key (1:1 with chunks)
// ============================================================

export const chunkEmbeddings = pgTable('chunk_embeddings', {
  chunkId: uuid('chunk_id')
    .primaryKey()
    .references(() => chunks.id, { onDelete: 'cascade' }),
  embedding: halfvec('embedding').notNull(),
  modelVersion: text('model_version').notNull().default('text-embedding-3-large'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================================
// Jobs
// ============================================================

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  taskId: text('task_id'),
  type: text('type').notNull(),
  status: text('status').notNull().default('pending'),
  progress: integer('progress').notNull().default(0),
  error: text('error'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================================
// Concepts
// ============================================================

export const concepts = pgTable(
  'concepts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    tags: text('tags').array().notNull().default([]),
    embedding: halfvec('embedding'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('concepts_workspace_name_idx').on(table.workspaceId, table.name)],
)

// concept_relations: source → target, no workspace_id (scope via concepts join)
export const conceptRelations = pgTable(
  'concept_relations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceConceptId: uuid('source_concept_id')
      .notNull()
      .references(() => concepts.id, { onDelete: 'cascade' }),
    targetConceptId: uuid('target_concept_id')
      .notNull()
      .references(() => concepts.id, { onDelete: 'cascade' }),
    relationType: text('relation_type').notNull(),
    strength: real('strength').default(1.0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('concept_relations_unique_idx').on(
      table.sourceConceptId,
      table.targetConceptId,
      table.relationType,
    ),
  ],
)

// chunk_concepts: composite PK, no separate id
export const chunkConcepts = pgTable(
  'chunk_concepts',
  {
    chunkId: uuid('chunk_id')
      .notNull()
      .references(() => chunks.id, { onDelete: 'cascade' }),
    conceptId: uuid('concept_id')
      .notNull()
      .references(() => concepts.id, { onDelete: 'cascade' }),
    relevance: real('relevance').default(1.0),
  },
  (table) => [primaryKey({ columns: [table.chunkId, table.conceptId] })],
)

// ============================================================
// Syllabuses
// ============================================================

export const syllabuses = pgTable('syllabuses', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  status: text('status').notNull().default('active'),
  generatedBy: text('generated_by').notNull().default('ai'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const syllabusUnits = pgTable('syllabus_units', {
  id: uuid('id').primaryKey().defaultRandom(),
  syllabusId: uuid('syllabus_id')
    .notNull()
    .references(() => syllabuses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const syllabusTopics = pgTable('syllabus_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id')
    .notNull()
    .references(() => syllabusUnits.id, { onDelete: 'cascade' }),
  syllabusId: uuid('syllabus_id').references(() => syllabuses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull().default(0),
  embedding: halfvec('embedding'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const syllabusTopicConcepts = pgTable(
  'syllabus_topic_concepts',
  {
    topicId: uuid('topic_id')
      .notNull()
      .references(() => syllabusTopics.id, { onDelete: 'cascade' }),
    conceptId: uuid('concept_id')
      .notNull()
      .references(() => concepts.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.topicId, table.conceptId] })],
)

export const syllabusTopicDocuments = pgTable(
  'syllabus_topic_documents',
  {
    topicId: uuid('topic_id')
      .notNull()
      .references(() => syllabusTopics.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.topicId, table.documentId] })],
)

// ============================================================
// AI requests (cost tracking + observability)
// ============================================================

export const aiRequests = pgTable('ai_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  model: text('model').notNull(),
  provider: text('provider'),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }).notNull().default('0'),
  latencyMs: integer('latency_ms').notNull().default(0),
  taskName: text('task_name'),
  promptVersion: text('prompt_version'),
  wasCached: boolean('was_cached').default(false),
  validationPassed: boolean('validation_passed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
