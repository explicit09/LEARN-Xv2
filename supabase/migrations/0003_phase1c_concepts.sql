-- Phase 1C migration: concepts, concept_relations, chunk_concepts, syllabuses, syllabus_units, syllabus_topics, etc.
-- Depends on Phase 1B migration (chunks, documents, workspaces must exist)

-- ============================================================
-- Concepts
-- ============================================================

CREATE TABLE concepts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description   TEXT,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  embedding     halfvec(3072),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

CREATE INDEX idx_concepts_workspace ON concepts(workspace_id);

CREATE TRIGGER concepts_updated_at
  BEFORE UPDATE ON concepts
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ============================================================
-- Concept relations
-- ============================================================

CREATE TABLE concept_relations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  from_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  to_concept_id   UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  relation_type   TEXT NOT NULL
    CHECK (relation_type IN ('prerequisite', 'related', 'part_of', 'extends', 'example_of')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, from_concept_id, to_concept_id)
);

CREATE INDEX idx_concept_relations_workspace ON concept_relations(workspace_id);
CREATE INDEX idx_concept_relations_from ON concept_relations(from_concept_id);
CREATE INDEX idx_concept_relations_to ON concept_relations(to_concept_id);

-- ============================================================
-- Chunk → concept links
-- ============================================================

CREATE TABLE chunk_concepts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id    UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  concept_id  UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chunk_id, concept_id)
);

CREATE INDEX idx_chunk_concepts_chunk ON chunk_concepts(chunk_id);
CREATE INDEX idx_chunk_concepts_concept ON chunk_concepts(concept_id);

-- ============================================================
-- Syllabuses
-- ============================================================

CREATE TABLE syllabuses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'superseded')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_syllabuses_workspace ON syllabuses(workspace_id);

CREATE TRIGGER syllabuses_updated_at
  BEFORE UPDATE ON syllabuses
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ============================================================
-- Syllabus units
-- ============================================================

CREATE TABLE syllabus_units (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id  UUID NOT NULL REFERENCES syllabuses(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  order_index  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_syllabus_units_syllabus ON syllabus_units(syllabus_id);

-- ============================================================
-- Syllabus topics
-- ============================================================

CREATE TABLE syllabus_topics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id      UUID NOT NULL REFERENCES syllabus_units(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  order_index  INTEGER NOT NULL DEFAULT 0,
  embedding    halfvec(3072),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_syllabus_topics_unit ON syllabus_topics(unit_id);

-- ============================================================
-- Syllabus topic → concept links
-- ============================================================

CREATE TABLE syllabus_topic_concepts (
  topic_id    UUID NOT NULL REFERENCES syllabus_topics(id) ON DELETE CASCADE,
  concept_id  UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, concept_id)
);

-- ============================================================
-- Syllabus topic → document links
-- ============================================================

CREATE TABLE syllabus_topic_documents (
  topic_id     UUID NOT NULL REFERENCES syllabus_topics(id) ON DELETE CASCADE,
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, document_id)
);

-- ============================================================
-- RLS — concepts
-- ============================================================

ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "concepts_select_own"
  ON concepts FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()::text::uuid
    )
  );

CREATE POLICY "concepts_insert_own"
  ON concepts FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()::text::uuid
    )
  );

CREATE POLICY "concepts_update_own"
  ON concepts FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()::text::uuid
    )
  );

CREATE POLICY "concepts_delete_own"
  ON concepts FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()::text::uuid
    )
  );

-- ============================================================
-- RLS — concept_relations
-- ============================================================

ALTER TABLE concept_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "concept_relations_select_own"
  ON concept_relations FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()::text::uuid
    )
  );

CREATE POLICY "concept_relations_insert_own"
  ON concept_relations FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()::text::uuid
    )
  );

CREATE POLICY "concept_relations_delete_own"
  ON concept_relations FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()::text::uuid
    )
  );

-- ============================================================
-- RLS — chunk_concepts
-- ============================================================

ALTER TABLE chunk_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chunk_concepts_select_own"
  ON chunk_concepts FOR SELECT
  USING (
    chunk_id IN (
      SELECT c.id FROM chunks c
      JOIN workspaces w ON w.id = c.workspace_id
      WHERE w.user_id = auth.uid()::text::uuid
    )
  );

CREATE POLICY "chunk_concepts_insert_own"
  ON chunk_concepts FOR INSERT
  WITH CHECK (
    chunk_id IN (
      SELECT c.id FROM chunks c
      JOIN workspaces w ON w.id = c.workspace_id
      WHERE w.user_id = auth.uid()::text::uuid
    )
  );

-- ============================================================
-- RLS — syllabuses
-- ============================================================

ALTER TABLE syllabuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "syllabuses_select_own"
  ON syllabuses FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()::text::uuid
    )
  );

CREATE POLICY "syllabuses_insert_own"
  ON syllabuses FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()::text::uuid
    )
  );

CREATE POLICY "syllabuses_update_own"
  ON syllabuses FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()::text::uuid
    )
  );

-- ============================================================
-- RLS — syllabus_units
-- ============================================================

ALTER TABLE syllabus_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "syllabus_units_select_own"
  ON syllabus_units FOR SELECT
  USING (
    syllabus_id IN (
      SELECT s.id FROM syllabuses s
      JOIN workspaces w ON w.id = s.workspace_id
      WHERE w.user_id = auth.uid()::text::uuid
    )
  );

CREATE POLICY "syllabus_units_insert_own"
  ON syllabus_units FOR INSERT
  WITH CHECK (
    syllabus_id IN (
      SELECT s.id FROM syllabuses s
      JOIN workspaces w ON w.id = s.workspace_id
      WHERE w.user_id = auth.uid()::text::uuid
    )
  );

-- ============================================================
-- RLS — syllabus_topics
-- ============================================================

ALTER TABLE syllabus_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "syllabus_topics_select_own"
  ON syllabus_topics FOR SELECT
  USING (
    unit_id IN (
      SELECT su.id FROM syllabus_units su
      JOIN syllabuses s ON s.id = su.syllabus_id
      JOIN workspaces w ON w.id = s.workspace_id
      WHERE w.user_id = auth.uid()::text::uuid
    )
  );

CREATE POLICY "syllabus_topics_insert_own"
  ON syllabus_topics FOR INSERT
  WITH CHECK (
    unit_id IN (
      SELECT su.id FROM syllabus_units su
      JOIN syllabuses s ON s.id = su.syllabus_id
      JOIN workspaces w ON w.id = s.workspace_id
      WHERE w.user_id = auth.uid()::text::uuid
    )
  );

-- ============================================================
-- RLS — syllabus_topic_concepts
-- ============================================================

ALTER TABLE syllabus_topic_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "syllabus_topic_concepts_select_own"
  ON syllabus_topic_concepts FOR SELECT
  USING (
    topic_id IN (
      SELECT st.id FROM syllabus_topics st
      JOIN syllabus_units su ON su.id = st.unit_id
      JOIN syllabuses s ON s.id = su.syllabus_id
      JOIN workspaces w ON w.id = s.workspace_id
      WHERE w.user_id = auth.uid()::text::uuid
    )
  );

CREATE POLICY "syllabus_topic_concepts_insert_own"
  ON syllabus_topic_concepts FOR INSERT
  WITH CHECK (
    topic_id IN (
      SELECT st.id FROM syllabus_topics st
      JOIN syllabus_units su ON su.id = st.unit_id
      JOIN syllabuses s ON s.id = su.syllabus_id
      JOIN workspaces w ON w.id = s.workspace_id
      WHERE w.user_id = auth.uid()::text::uuid
    )
  );

-- ============================================================
-- RLS — syllabus_topic_documents
-- ============================================================

ALTER TABLE syllabus_topic_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "syllabus_topic_documents_select_own"
  ON syllabus_topic_documents FOR SELECT
  USING (
    topic_id IN (
      SELECT st.id FROM syllabus_topics st
      JOIN syllabus_units su ON su.id = st.unit_id
      JOIN syllabuses s ON s.id = su.syllabus_id
      JOIN workspaces w ON w.id = s.workspace_id
      WHERE w.user_id = auth.uid()::text::uuid
    )
  );

CREATE POLICY "syllabus_topic_documents_insert_own"
  ON syllabus_topic_documents FOR INSERT
  WITH CHECK (
    topic_id IN (
      SELECT st.id FROM syllabus_topics st
      JOIN syllabus_units su ON su.id = st.unit_id
      JOIN syllabuses s ON s.id = su.syllabus_id
      JOIN workspaces w ON w.id = s.workspace_id
      WHERE w.user_id = auth.uid()::text::uuid
    )
  );
