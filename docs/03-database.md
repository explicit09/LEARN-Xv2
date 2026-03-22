# Database

## Overview

- **Database:** Supabase (managed Postgres)
- **ORM:** Drizzle (TypeScript, schema-first)
- **Vectors:** pgvector with HNSW index, single `chunk_embeddings` table
- **Full-text search:** Postgres `tsvector` (materialized column on `chunks`)
- **Auth:** Supabase Auth — `users.auth_id` references `auth.users`
- **Migrations:** SQL files in `supabase/migrations/`, run via Drizzle migration runner

## Rules

1. Migrations are the source of truth for schema. Never edit Supabase dashboard schema directly.
2. Every foreign key has an explicit `ON DELETE` action.
3. Every table used in queries has an index on its primary lookup column.
4. JSONB is allowed only for: `settings`, `learning_style`, `structured_sections`, `options` (MCQ), `input_data`, `output_data`, `voice_config`, `metadata` (events). Do not add to this list without discussion.
5. The `chunk_embeddings` table is the only embeddings table. Do not create another.

---

## Schema

### Identity & Access

```sql
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id      UUID UNIQUE NOT NULL,  -- references auth.users
  display_name TEXT NOT NULL,
  email        TEXT NOT NULL,
  avatar_url   TEXT,
  user_type    TEXT NOT NULL DEFAULT 'student'
    CHECK (user_type IN ('student', 'professor', 'admin')),
  is_admin     BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE personas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version               INTEGER NOT NULL DEFAULT 1,

  -- Layer 1: Learner Profile — who the student is
  interests             TEXT[] NOT NULL DEFAULT '{}',
  -- e.g. ['basketball', 'finance', 'gaming']
  aspiration_tags       TEXT[] NOT NULL DEFAULT '{}',
  -- e.g. ['software engineer', 'pre-med']
  affinity_domains      TEXT[] NOT NULL DEFAULT '{}',
  -- domains they understand intuitively (used for analogy selection)
  motivational_style    TEXT NOT NULL DEFAULT 'mastery'
    CHECK (motivational_style IN ('challenge', 'progress', 'mastery', 'curiosity')),

  -- Layer 2: Pedagogical Profile — how they learn best
  explanation_preferences JSONB NOT NULL DEFAULT '{}',
  -- {
  --   explanationStyle: 'visual'|'textual'|'step_by_step'|'narrative',
  --   structurePreference: 'theory_first'|'example_first'|'socratic',
  --   depthPreference: 'concise'|'thorough'|'academic',
  --   tonePreference: 'formal'|'conversational'|'direct'|'socratic',
  --   challengeTolerance: 'low'|'medium'|'high',
  --   pacePreference: 'slow'|'standard'|'fast'
  -- }

  -- Layer 3: Performance Profile — live record of what they know (updated continuously)
  performance_profile   JSONB NOT NULL DEFAULT '{}',
  -- {
  --   weakConcepts: uuid[],
  --   masteryTrends: [{ conceptId, trend: 'improving'|'stable'|'declining' }],
  --   commonErrorPatterns: string[],
  --   confusionTriggers: string[],
  --   retentionStrengths: uuid[]
  -- }

  -- Legacy column kept for migration compatibility; superseded by explanation_preferences
  tone_preference       TEXT NOT NULL DEFAULT 'balanced'
    CHECK (tone_preference IN ('casual', 'balanced', 'academic', 'socratic')),
  difficulty_preference TEXT NOT NULL DEFAULT 'adaptive'
    CHECK (difficulty_preference IN ('beginner', 'intermediate', 'advanced', 'adaptive')),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, version)
);
-- Layer 4 (Framing Engine) is derived at runtime by buildPersonaContext() — not stored.
-- See 12-personalization-engine.md for FramingContext type and resolution logic.
```

### Workspace Core

```sql
CREATE TABLE workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'processing')),
  settings    JSONB NOT NULL DEFAULT '{}',
  -- { theme, default_lesson_depth, auto_generate_quiz }
  total_token_count INTEGER NOT NULL DEFAULT 0,
  -- Running total of all document token counts in this workspace.
  -- Used to decide retrieval mode: < 500K → full-context with prompt caching,
  -- >= 500K → RAG hybrid search. Updated by document_processing job on completion.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspaces_user ON workspaces(user_id);
```

### Documents & Chunks

```sql
CREATE TABLE documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id),
  file_name        TEXT NOT NULL,
  file_type        TEXT NOT NULL
    CHECK (file_type IN ('pdf', 'docx', 'pptx', 'txt', 'url', 'youtube')),
  file_size        INTEGER,         -- bytes
  storage_path     TEXT,            -- Supabase Storage path
  source_url       TEXT,            -- for URL/YouTube sources
  status           TEXT NOT NULL DEFAULT 'uploading'
    CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
  role             TEXT NOT NULL DEFAULT 'primary'
    CHECK (role IN ('primary', 'supplementary', 'reference')),
  -- Auto-detected during processing. 'primary' = drives syllabus structure.
  -- 'supplementary' = enriches existing topics. 'reference' = RAG only, not in syllabus.
  -- User can override. Confidence below 0.65 surfaces a UI confirmation prompt.
  role_confidence  REAL,           -- 0.0–1.0, set by classification LLM call
  upload_batch_id  UUID,           -- set when multiple docs are uploaded simultaneously
  -- All docs with the same upload_batch_id are held until all reach 'completed',
  -- then syllabus synthesis runs once on the whole batch (avoids ordering conflicts).
  page_count       INTEGER,
  word_count       INTEGER,
  processing_error TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_workspace ON documents(workspace_id);

CREATE TABLE chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  chunk_index     INTEGER NOT NULL,
  content         TEXT NOT NULL,
  token_count     INTEGER NOT NULL,
  page_number     INTEGER,
  section_heading TEXT,
  content_type    TEXT DEFAULT 'text'
    CHECK (content_type IN ('text', 'table', 'code', 'equation', 'definition', 'example')),
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
  -- Materialized FTS column
  fts             tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chunks_workspace ON chunks(workspace_id);
CREATE INDEX idx_chunks_document  ON chunks(document_id);
CREATE INDEX idx_chunks_fts       ON chunks USING gin(fts);

-- THE ONLY EMBEDDING TABLE. Do not create another.
CREATE TABLE chunk_embeddings (
  chunk_id      UUID PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
  embedding     halfvec(3072) NOT NULL,  -- text-embedding-3-large, 3072 dims
  -- IMPORTANT: Must use halfvec not vector — pgvector HNSW limit is 2000 dims for vector type,
  -- 4000 dims for halfvec. At 3072 dims we MUST use halfvec or the HNSW index will not build.
  model_version TEXT NOT NULL DEFAULT 'text-embedding-3-large',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index — better recall than IVFFlat for this use case
CREATE INDEX idx_chunk_embeddings_hnsw
  ON chunk_embeddings
  USING hnsw (embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### Concepts & Knowledge Graph

```sql
CREATE TABLE concepts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
  importance      REAL CHECK (importance BETWEEN 0 AND 1),
  bloom_level     TEXT CHECK (bloom_level IN (
    'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
  )),
  embedding       halfvec(3072),  -- for concept-level similarity search (halfvec required at 3072 dims)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_concepts_workspace ON concepts(workspace_id);

CREATE TABLE concept_relations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  target_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  relation_type     TEXT NOT NULL
    CHECK (relation_type IN ('prerequisite', 'related', 'part_of', 'extends')),
  strength          REAL DEFAULT 1.0 CHECK (strength BETWEEN 0 AND 1),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_concept_id, target_concept_id, relation_type)
);

-- Chunk ↔ Concept (many:many)
CREATE TABLE chunk_concepts (
  chunk_id   UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  relevance  REAL DEFAULT 1.0,
  PRIMARY KEY (chunk_id, concept_id)
);
```

### Lessons

```sql
CREATE TABLE lessons (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id),
  title               TEXT NOT NULL,
  order_index         INTEGER NOT NULL DEFAULT 0,
  content_markdown    TEXT NOT NULL,       -- the lesson body
  structured_sections JSONB NOT NULL,
  -- Array of LessonSection component specs — see 10-generative-ui.md for the full discriminated union schema
  -- Each section has a 'type' field routing to a React component: text, concept_definition, process_flow,
  -- comparison_table, interactive_widget, code_explainer, analogy_card, key_takeaway, mini_quiz, etc.
  summary             TEXT,
  key_takeaways       TEXT[],
  prompt_version      TEXT,
  model_used          TEXT,
  generation_cost_cents INTEGER,
  syllabus_topic_id   UUID,
  -- FK to syllabus_topics(id) ON DELETE SET NULL — added via ALTER TABLE in a separate
  -- migration after the syllabus tables are created (forward reference otherwise).
  -- Links lesson to its position in the Syllabus tree. Set by generate-lessons job.
  -- Preserved when syllabus is versioned — lesson retains link to old topic.
  source_updated      BOOLEAN NOT NULL DEFAULT false,
  -- Set to true when a contributing document is reprocessed, or when a new document
  -- is added that covers this lesson's topics. Surfaces as "may need regeneration" UI notice.
  -- Never triggers auto-regeneration — user initiates that explicitly.
  is_completed        BOOLEAN NOT NULL DEFAULT false,
  completed_at        TIMESTAMPTZ,
  time_spent_seconds  INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lessons_workspace ON lessons(workspace_id, order_index);

-- Lesson ↔ Concept (many:many)
CREATE TABLE lesson_concepts (
  lesson_id  UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  PRIMARY KEY (lesson_id, concept_id)
);
```

### Syllabus

The Syllabus is a living, versioned tree. When updated, old versions are preserved with status `superseded`. See `02-domain-model.md §What "Syllabus" Means` for full semantics.

```sql
CREATE TABLE syllabuses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version      INTEGER NOT NULL DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'superseded')),
  generated_by TEXT NOT NULL DEFAULT 'ai'
    CHECK (generated_by IN ('ai', 'manual', 'merged')),
  -- 'merged' = AI-generated from multiple documents in batch synthesis
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, version)
);

-- Only one active syllabus per workspace at a time
CREATE UNIQUE INDEX idx_syllabuses_active
  ON syllabuses(workspace_id)
  WHERE status = 'active';

CREATE TABLE syllabus_units (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id UUID NOT NULL REFERENCES syllabuses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_syllabus_units_syllabus ON syllabus_units(syllabus_id, order_index);

CREATE TABLE syllabus_topics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id     UUID NOT NULL REFERENCES syllabus_units(id) ON DELETE CASCADE,
  syllabus_id UUID NOT NULL REFERENCES syllabuses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  -- Embedding used for topic deduplication/merging during incremental updates
  -- (cosine similarity >= 0.85 → merge; < 0.85 → new topic). halfvec required at 3072 dims.
  embedding   halfvec(3072),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_syllabus_topics_unit    ON syllabus_topics(unit_id, order_index);
CREATE INDEX idx_syllabus_topics_syllabus ON syllabus_topics(syllabus_id);

-- Syllabus topic ↔ Concept (many:many) — drives lesson ordering
CREATE TABLE syllabus_topic_concepts (
  topic_id   UUID NOT NULL REFERENCES syllabus_topics(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, concept_id)
);

-- Syllabus topic ↔ Document (many:many) — tracks which docs inform each topic
CREATE TABLE syllabus_topic_documents (
  topic_id    UUID NOT NULL REFERENCES syllabus_topics(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  -- true = this document is the primary source for the topic (used in citations, lesson generation)
  PRIMARY KEY (topic_id, document_id)
);
```

### Chat

```sql
CREATE TABLE chat_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id),
  lesson_id    UUID REFERENCES lessons(id) ON DELETE SET NULL,  -- NULL = workspace-level
  title        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_sessions_workspace ON chat_sessions(workspace_id);

CREATE TABLE chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  cited_chunk_ids UUID[],       -- which chunks were used to generate this response
  model_used      TEXT,
  token_count     INTEGER,
  latency_ms      INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
```

### Quizzes

```sql
CREATE TABLE quizzes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lesson_id       UUID REFERENCES lessons(id) ON DELETE SET NULL,
  user_id         UUID NOT NULL REFERENCES users(id),
  title           TEXT NOT NULL,
  quiz_type       TEXT NOT NULL DEFAULT 'practice'
    CHECK (quiz_type IN ('practice', 'review', 'exam_prep', 'diagnostic')),
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quiz_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id       UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL
    CHECK (question_type IN (
      'mcq', 'short_answer', 'fill_blank', 'true_false', 'matching', 'essay', 'case_study'
    )),
  bloom_level   TEXT CHECK (bloom_level IN (
    'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
  )),
  question_text TEXT NOT NULL,
  options       JSONB,           -- MCQ: [{ label: 'A', text: '...', is_correct: bool }]
  correct_answer TEXT,           -- short_answer, fill_blank, true_false
  explanation   TEXT,
  concept_id    UUID REFERENCES concepts(id),
  order_index   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quiz_attempts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id            UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id),
  score              REAL,              -- 0.0 to 1.0
  time_spent_seconds INTEGER,
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quiz_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id  UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id),
  user_answer TEXT,
  is_correct  BOOLEAN,
  ai_feedback TEXT,        -- personalized feedback on wrong answers
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Flashcards (FSRS)

```sql
CREATE TABLE flashcard_sets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('lesson', 'workspace', 'manual')),
  source_id   UUID,             -- lesson_id or workspace_id
  card_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE flashcards (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id              UUID NOT NULL REFERENCES flashcard_sets(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id),
  front               TEXT NOT NULL,
  back                TEXT NOT NULL,
  concept_id          UUID REFERENCES concepts(id),
  -- FSRS-6 scheduling state (per-card, per-user)
  fsrs_stability      REAL NOT NULL DEFAULT 0,
  fsrs_difficulty     REAL NOT NULL DEFAULT 0,
  fsrs_elapsed_days   INTEGER NOT NULL DEFAULT 0,
  fsrs_scheduled_days INTEGER NOT NULL DEFAULT 0,
  fsrs_reps           INTEGER NOT NULL DEFAULT 0,
  fsrs_lapses         INTEGER NOT NULL DEFAULT 0,
  fsrs_state          TEXT NOT NULL DEFAULT 'new'
    CHECK (fsrs_state IN ('new', 'learning', 'review', 'relearning')),
  next_review_at      TIMESTAMPTZ,
  last_review_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial index: only index cards that need scheduling (not 'new' ones awaiting first review)
CREATE INDEX idx_flashcards_due ON flashcards(user_id, next_review_at)
  WHERE fsrs_state != 'new';

CREATE TABLE flashcard_reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id             UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id),
  rating              INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
  -- FSRS ratings: 1=Again, 2=Hard, 3=Good, 4=Easy
  review_duration_ms  INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Study Guides & Audio

```sql
CREATE TABLE study_guides (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id),
  title            TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  sections         JSONB NOT NULL,
  -- [{ heading: string, content: string, concept_ids: uuid[] }]
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audio_generations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lesson_id        UUID REFERENCES lessons(id),
  user_id          UUID NOT NULL REFERENCES users(id),
  audio_type       TEXT NOT NULL
    CHECK (audio_type IN ('lecture', 'conversation', 'summary', 'socratic', 'debate')),
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating_script', 'synthesizing', 'completed', 'failed')),
  script_text      TEXT,
  audio_url        TEXT,             -- Cloudflare R2 URL
  duration_seconds INTEGER,
  voice_config     JSONB,            -- { provider, voice_id, speed }
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Mastery & Analytics

```sql
CREATE TABLE mastery_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id            UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  workspace_id          UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mastery_level         REAL NOT NULL DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 1),
  confidence            REAL NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
  quiz_score_avg        REAL,
  flashcard_retention   REAL,
  lesson_completed      BOOLEAN DEFAULT false,
  chat_interaction_count INTEGER DEFAULT 0,
  last_interaction_at   TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, concept_id)
);

CREATE INDEX idx_mastery_user_workspace ON mastery_records(user_id, workspace_id);

CREATE TABLE learning_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  event_type   TEXT NOT NULL,  -- see domain-model.md for canonical list
  entity_type  TEXT,           -- 'lesson' | 'quiz' | 'flashcard' | 'chat_session'
  entity_id    UUID,
  metadata     JSONB DEFAULT '{}',   -- reference IDs only, no PII
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_learning_events_user ON learning_events(user_id, created_at DESC);
CREATE INDEX idx_learning_events_workspace ON learning_events(workspace_id, created_at DESC);
```

### Jobs & AI Observability

```sql
CREATE TABLE jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  workspace_id     UUID REFERENCES workspaces(id),
  job_type         TEXT NOT NULL,
  -- document_processing | concept_extraction | lesson_generation
  -- quiz_generation | flashcard_generation | audio_generation | study_plan
  -- syllabus_generation | syllabus_update | syllabus_batch_synthesis
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress         REAL DEFAULT 0 CHECK (progress BETWEEN 0 AND 1),
  progress_message TEXT,
  input_data       JSONB NOT NULL DEFAULT '{}',
  output_data      JSONB DEFAULT '{}',
  error_message    TEXT,
  trigger_run_id   TEXT,          -- Trigger.dev run ID for lookup
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_user_status ON jobs(user_id, status);
CREATE INDEX idx_jobs_workspace   ON jobs(workspace_id);

CREATE TABLE ai_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id),
  job_id           UUID REFERENCES jobs(id),
  task_type        TEXT NOT NULL,
  -- chat | lesson_gen | quiz_gen | flashcard_gen | concept_extract | embedding
  provider         TEXT NOT NULL,    -- openai | anthropic | google
  model            TEXT NOT NULL,
  prompt_version   TEXT,
  input_tokens     INTEGER,
  output_tokens    INTEGER,
  latency_ms       INTEGER,
  cost_cents       REAL,
  was_cached       BOOLEAN DEFAULT false,
  validation_passed BOOLEAN,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_requests_created ON ai_requests(created_at DESC);
CREATE INDEX idx_ai_requests_user    ON ai_requests(user_id, created_at DESC);
```

---

## RPC Functions

### hybrid_search — The One Retrieval Path

```sql
CREATE OR REPLACE FUNCTION hybrid_search(
  p_workspace_id   UUID,
  p_query_embedding halfvec(3072),
  p_query_text     TEXT,
  p_match_count    INTEGER DEFAULT 10,
  p_vector_weight  REAL DEFAULT 0.7
)
RETURNS TABLE (
  chunk_id        UUID,
  content         TEXT,
  section_heading TEXT,
  content_type    TEXT,
  similarity      REAL,
  rank_score      REAL
) AS $$
  WITH vector_results AS (
    SELECT
      c.id AS chunk_id,
      c.content,
      c.section_heading,
      c.content_type,
      1 - (ce.embedding <=> p_query_embedding) AS similarity,
      ROW_NUMBER() OVER (ORDER BY ce.embedding <=> p_query_embedding) AS vrank
    FROM chunks c
    JOIN chunk_embeddings ce ON ce.chunk_id = c.id
    WHERE c.workspace_id = p_workspace_id
    ORDER BY ce.embedding <=> p_query_embedding
    LIMIT p_match_count * 2
  ),
  fts_results AS (
    SELECT
      c.id AS chunk_id,
      c.content,
      c.section_heading,
      c.content_type,
      0::REAL AS similarity,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank(c.fts, websearch_to_tsquery('english', p_query_text)) DESC
      ) AS frank
    FROM chunks c
    WHERE c.workspace_id = p_workspace_id
      AND c.fts @@ websearch_to_tsquery('english', p_query_text)
    LIMIT p_match_count * 2
  ),
  combined AS (
    SELECT
      COALESCE(v.chunk_id, f.chunk_id) AS chunk_id,
      COALESCE(v.content, f.content) AS content,
      COALESCE(v.section_heading, f.section_heading) AS section_heading,
      COALESCE(v.content_type, f.content_type) AS content_type,
      COALESCE(v.similarity, 0) AS similarity,
      (p_vector_weight * COALESCE(1.0 / (60 + v.vrank), 0)) +
      ((1 - p_vector_weight) * COALESCE(1.0 / (60 + f.frank), 0)) AS rank_score
    FROM vector_results v
    FULL OUTER JOIN fts_results f ON v.chunk_id = f.chunk_id
  )
  SELECT chunk_id, content, section_heading, content_type, similarity, rank_score
  FROM combined
  ORDER BY rank_score DESC
  LIMIT p_match_count;
$$ LANGUAGE sql STABLE;
```

### get_due_flashcards

```sql
CREATE OR REPLACE FUNCTION get_due_flashcards(
  p_user_id UUID,
  p_limit   INTEGER DEFAULT 20
)
RETURNS SETOF flashcards AS $$
  SELECT *
  FROM flashcards
  WHERE user_id = p_user_id
    AND (
      fsrs_state = 'new'
      OR (next_review_at IS NOT NULL AND next_review_at <= now())
    )
  ORDER BY
    CASE fsrs_state
      WHEN 'relearning' THEN 0
      WHEN 'learning'   THEN 1
      WHEN 'new'        THEN 2
      WHEN 'review'     THEN 3
    END,
    next_review_at ASC NULLS LAST
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;
```

### get_workspace_mastery_summary

```sql
CREATE OR REPLACE FUNCTION get_workspace_mastery_summary(
  p_user_id      UUID,
  p_workspace_id UUID
)
RETURNS TABLE (
  total_concepts     BIGINT,
  mastered_concepts  BIGINT,
  struggling_concepts BIGINT,
  avg_mastery        REAL,
  concepts_due_review BIGINT
) AS $$
  SELECT
    COUNT(*)                                                            AS total_concepts,
    COUNT(*) FILTER (WHERE mastery_level >= 0.8)                       AS mastered_concepts,
    COUNT(*) FILTER (WHERE mastery_level < 0.4
                       AND last_interaction_at IS NOT NULL)             AS struggling_concepts,
    AVG(mastery_level)::REAL                                            AS avg_mastery,
    (
      SELECT COUNT(*)
      FROM flashcards f
      JOIN concepts c ON f.concept_id = c.id
      WHERE f.user_id = p_user_id
        AND c.workspace_id = p_workspace_id
        AND f.next_review_at <= now()
    )                                                                   AS concepts_due_review
  FROM mastery_records
  WHERE user_id = p_user_id
    AND workspace_id = p_workspace_id;
$$ LANGUAGE sql STABLE;
```

---

## Row Level Security

All tables with `user_id` or `workspace_id` require RLS policies. Template:

```sql
-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Users can only see their own workspaces
CREATE POLICY "users_own_workspaces"
  ON workspaces FOR ALL
  USING (user_id = (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));
```

Apply the same pattern to: documents, chunks, chunk_embeddings, concepts, lessons, syllabuses, syllabus_units, syllabus_topics, chat_sessions, chat_messages, quizzes, flashcard_sets, flashcards, mastery_records, learning_events, jobs.

For syllabus child tables (`syllabus_units`, `syllabus_topics`, `syllabus_topic_concepts`, `syllabus_topic_documents`): RLS is via a JOIN to the parent `syllabuses` table which is already workspace-scoped. Use the pattern:

```sql
CREATE POLICY "syllabus_units_workspace_access" ON syllabus_units
  FOR ALL USING (
    syllabus_id IN (
      SELECT id FROM syllabuses WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      )
    )
  );
```

Server-side operations (Trigger.dev tasks, AI generation) use the `service_role` key which bypasses RLS. Never expose `service_role` to the client.
