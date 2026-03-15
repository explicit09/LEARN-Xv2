-- Schema corrections: align with docs/03-database.md and docs/07-ai-pipeline.md
-- Fixes issues introduced in migrations 0002 and 0003.

-- ============================================================
-- 1. chunks — add section_heading, content_type, materialized fts
-- ============================================================

ALTER TABLE chunks
  ADD COLUMN IF NOT EXISTS section_heading TEXT,
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text'
    CHECK (content_type IN ('text', 'table', 'code', 'equation', 'definition', 'example'));

-- Replace expression-based GIN index with materialized tsvector column
DROP INDEX IF EXISTS idx_chunks_fts;

ALTER TABLE chunks
  ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX idx_chunks_fts ON chunks USING gin(fts);

-- ============================================================
-- 2. chunk_embeddings — fix to match docs/03-database.md exactly:
--    chunk_id as PRIMARY KEY (not separate id), model_version column,
--    cosine HNSW index, no workspace_id column
-- ============================================================

DROP TABLE IF EXISTS chunk_embeddings CASCADE;

CREATE TABLE chunk_embeddings (
  chunk_id      UUID PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
  embedding     halfvec(3072) NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'text-embedding-3-large',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW with cosine ops — required by docs/03-database.md
CREATE INDEX idx_chunk_embeddings_hnsw
  ON chunk_embeddings
  USING hnsw (embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 64);

ALTER TABLE chunk_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS via chunks join (no workspace_id on this table)
CREATE POLICY "chunk_embeddings: own"
  ON chunk_embeddings
  USING (
    chunk_id IN (
      SELECT c.id FROM chunks c
      JOIN workspaces w ON w.id = c.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ============================================================
-- 3. hybrid_search — update to use materialized fts column,
--    cosine distance (<=>), and join through chunks for workspace filter
-- ============================================================

CREATE OR REPLACE FUNCTION hybrid_search(
  query_text          TEXT,
  query_embedding     halfvec(3072),
  workspace_id_filter UUID,
  match_count         INT DEFAULT 8,
  rrf_k               INT DEFAULT 60
)
RETURNS TABLE (
  chunk_id         UUID,
  content          TEXT,
  enriched_content TEXT,
  document_id      UUID,
  chunk_index      INTEGER,
  page_number      INTEGER,
  score            FLOAT
)
LANGUAGE sql
AS $$
  WITH vector_results AS (
    SELECT
      ce.chunk_id,
      ROW_NUMBER() OVER (ORDER BY ce.embedding <=> query_embedding) AS rank
    FROM chunk_embeddings ce
    JOIN chunks c ON c.id = ce.chunk_id
    WHERE c.workspace_id = workspace_id_filter
    ORDER BY ce.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  fts_results AS (
    SELECT
      c.id AS chunk_id,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(c.fts, plainto_tsquery('english', query_text)) DESC
      ) AS rank
    FROM chunks c
    WHERE c.workspace_id = workspace_id_filter
      AND c.fts @@ plainto_tsquery('english', query_text)
    ORDER BY rank
    LIMIT match_count * 2
  ),
  rrf AS (
    SELECT
      COALESCE(v.chunk_id, f.chunk_id) AS chunk_id,
      COALESCE(0.7 / (rrf_k + v.rank), 0) + COALESCE(0.3 / (rrf_k + f.rank), 0) AS score
    FROM vector_results v
    FULL OUTER JOIN fts_results f ON v.chunk_id = f.chunk_id
    ORDER BY score DESC
    LIMIT match_count
  )
  SELECT
    c.id,
    c.content,
    c.enriched_content,
    c.document_id,
    c.chunk_index,
    c.page_number,
    rrf.score
  FROM rrf
  JOIN chunks c ON c.id = rrf.chunk_id
$$;

-- ============================================================
-- 4. concept_relations — align with docs/03-database.md:
--    source_concept_id / target_concept_id (not from/to),
--    no workspace_id, add strength, remove example_of, unique on (source, target, relation_type)
-- ============================================================

DROP TABLE IF EXISTS concept_relations CASCADE;

CREATE TABLE concept_relations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  target_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  relation_type     TEXT NOT NULL
    CHECK (relation_type IN ('prerequisite', 'related', 'part_of', 'extends')),
  strength          REAL DEFAULT 1.0 CHECK (strength BETWEEN 0 AND 1),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_concept_id, target_concept_id, relation_type)
);

CREATE INDEX idx_concept_relations_source ON concept_relations(source_concept_id);
CREATE INDEX idx_concept_relations_target ON concept_relations(target_concept_id);

ALTER TABLE concept_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "concept_relations_select_own"
  ON concept_relations FOR SELECT
  USING (
    source_concept_id IN (
      SELECT con.id FROM concepts con
      JOIN workspaces w ON w.id = con.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "concept_relations_insert_own"
  ON concept_relations FOR INSERT
  WITH CHECK (
    source_concept_id IN (
      SELECT con.id FROM concepts con
      JOIN workspaces w ON w.id = con.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "concept_relations_delete_own"
  ON concept_relations FOR DELETE
  USING (
    source_concept_id IN (
      SELECT con.id FROM concepts con
      JOIN workspaces w ON w.id = con.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ============================================================
-- 5. chunk_concepts — align with docs/03-database.md:
--    composite PRIMARY KEY (chunk_id, concept_id), add relevance
-- ============================================================

DROP TABLE IF EXISTS chunk_concepts CASCADE;

CREATE TABLE chunk_concepts (
  chunk_id   UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  relevance  REAL DEFAULT 1.0,
  PRIMARY KEY (chunk_id, concept_id)
);

ALTER TABLE chunk_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chunk_concepts_select_own"
  ON chunk_concepts FOR SELECT
  USING (
    chunk_id IN (
      SELECT c.id FROM chunks c
      JOIN workspaces w ON w.id = c.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "chunk_concepts_insert_own"
  ON chunk_concepts FOR INSERT
  WITH CHECK (
    chunk_id IN (
      SELECT c.id FROM chunks c
      JOIN workspaces w ON w.id = c.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ============================================================
-- 6. concepts — fix RLS (was using wrong auth.uid() pattern)
-- ============================================================

DROP POLICY IF EXISTS "concepts_select_own" ON concepts;
DROP POLICY IF EXISTS "concepts_insert_own" ON concepts;
DROP POLICY IF EXISTS "concepts_update_own" ON concepts;
DROP POLICY IF EXISTS "concepts_delete_own" ON concepts;

CREATE POLICY "concepts_select_own"
  ON concepts FOR SELECT
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "concepts_insert_own"
  ON concepts FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "concepts_update_own"
  ON concepts FOR UPDATE
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "concepts_delete_own"
  ON concepts FOR DELETE
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ============================================================
-- 7. syllabuses — fix RLS, add generated_by, unique active index
-- ============================================================

DROP POLICY IF EXISTS "syllabuses_select_own" ON syllabuses;
DROP POLICY IF EXISTS "syllabuses_insert_own" ON syllabuses;
DROP POLICY IF EXISTS "syllabuses_update_own" ON syllabuses;

ALTER TABLE syllabuses
  ADD COLUMN IF NOT EXISTS generated_by TEXT NOT NULL DEFAULT 'ai'
    CHECK (generated_by IN ('ai', 'manual', 'merged'));

-- Only one active syllabus per workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_syllabuses_active
  ON syllabuses(workspace_id)
  WHERE status = 'active';

CREATE POLICY "syllabuses_select_own"
  ON syllabuses FOR SELECT
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "syllabuses_insert_own"
  ON syllabuses FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "syllabuses_update_own"
  ON syllabuses FOR UPDATE
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ============================================================
-- 8. syllabus_units — fix RLS
-- ============================================================

DROP POLICY IF EXISTS "syllabus_units_select_own" ON syllabus_units;
DROP POLICY IF EXISTS "syllabus_units_insert_own" ON syllabus_units;

CREATE POLICY "syllabus_units_select_own"
  ON syllabus_units FOR SELECT
  USING (
    syllabus_id IN (
      SELECT s.id FROM syllabuses s
      JOIN workspaces w ON w.id = s.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "syllabus_units_insert_own"
  ON syllabus_units FOR INSERT
  WITH CHECK (
    syllabus_id IN (
      SELECT s.id FROM syllabuses s
      JOIN workspaces w ON w.id = s.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ============================================================
-- 9. syllabus_topics — fix RLS, add syllabus_id column
-- ============================================================

DROP POLICY IF EXISTS "syllabus_topics_select_own" ON syllabus_topics;
DROP POLICY IF EXISTS "syllabus_topics_insert_own" ON syllabus_topics;

ALTER TABLE syllabus_topics
  ADD COLUMN IF NOT EXISTS syllabus_id UUID REFERENCES syllabuses(id) ON DELETE CASCADE;

-- Backfill from unit
UPDATE syllabus_topics st
SET syllabus_id = su.syllabus_id
FROM syllabus_units su
WHERE st.unit_id = su.id
  AND st.syllabus_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_syllabus_topics_syllabus ON syllabus_topics(syllabus_id);

CREATE POLICY "syllabus_topics_select_own"
  ON syllabus_topics FOR SELECT
  USING (
    syllabus_id IN (
      SELECT s.id FROM syllabuses s
      JOIN workspaces w ON w.id = s.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "syllabus_topics_insert_own"
  ON syllabus_topics FOR INSERT
  WITH CHECK (
    syllabus_id IN (
      SELECT s.id FROM syllabuses s
      JOIN workspaces w ON w.id = s.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ============================================================
-- 10. syllabus_topic_concepts — fix RLS
-- ============================================================

DROP POLICY IF EXISTS "syllabus_topic_concepts_select_own" ON syllabus_topic_concepts;
DROP POLICY IF EXISTS "syllabus_topic_concepts_insert_own" ON syllabus_topic_concepts;

CREATE POLICY "syllabus_topic_concepts_select_own"
  ON syllabus_topic_concepts FOR SELECT
  USING (
    topic_id IN (
      SELECT st.id FROM syllabus_topics st
      JOIN syllabuses s ON s.id = st.syllabus_id
      JOIN workspaces w ON w.id = s.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "syllabus_topic_concepts_insert_own"
  ON syllabus_topic_concepts FOR INSERT
  WITH CHECK (
    topic_id IN (
      SELECT st.id FROM syllabus_topics st
      JOIN syllabuses s ON s.id = st.syllabus_id
      JOIN workspaces w ON w.id = s.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ============================================================
-- 11. syllabus_topic_documents — fix RLS
-- ============================================================

DROP POLICY IF EXISTS "syllabus_topic_documents_select_own" ON syllabus_topic_documents;
DROP POLICY IF EXISTS "syllabus_topic_documents_insert_own" ON syllabus_topic_documents;

CREATE POLICY "syllabus_topic_documents_select_own"
  ON syllabus_topic_documents FOR SELECT
  USING (
    topic_id IN (
      SELECT st.id FROM syllabus_topics st
      JOIN syllabuses s ON s.id = st.syllabus_id
      JOIN workspaces w ON w.id = s.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "syllabus_topic_documents_insert_own"
  ON syllabus_topic_documents FOR INSERT
  WITH CHECK (
    topic_id IN (
      SELECT st.id FROM syllabus_topics st
      JOIN syllabuses s ON s.id = st.syllabus_id
      JOIN workspaces w ON w.id = s.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ============================================================
-- 12. ai_requests — add missing observability columns
-- ============================================================

ALTER TABLE ai_requests
  ADD COLUMN IF NOT EXISTS job_id           UUID REFERENCES jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider         TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version   TEXT,
  ADD COLUMN IF NOT EXISTS was_cached       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS validation_passed BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_ai_requests_user ON ai_requests(user_id, created_at DESC);
