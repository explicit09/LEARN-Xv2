-- Phase 1D: Lessons + Lesson Concepts
-- Follows docs/03-database.md §Lessons exactly

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------

CREATE TABLE lessons (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id),
  title                 TEXT NOT NULL,
  order_index           INTEGER NOT NULL DEFAULT 0,
  content_markdown      TEXT NOT NULL DEFAULT '',
  structured_sections   JSONB NOT NULL DEFAULT '[]',
  -- Array of LessonSection component specs — see docs/10-generative-ui.md
  summary               TEXT,
  key_takeaways         TEXT[],
  prompt_version        TEXT,
  model_used            TEXT,
  generation_cost_cents INTEGER,
  syllabus_topic_id     UUID REFERENCES syllabus_topics(id) ON DELETE SET NULL,
  source_updated        BOOLEAN NOT NULL DEFAULT false,
  is_completed          BOOLEAN NOT NULL DEFAULT false,
  completed_at          TIMESTAMPTZ,
  time_spent_seconds    INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lessons_workspace ON lessons(workspace_id, order_index);
CREATE INDEX idx_lessons_syllabus_topic ON lessons(syllabus_topic_id)
  WHERE syllabus_topic_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- lesson_concepts — Lesson ↔ Concept (many:many)
-- ---------------------------------------------------------------------------

CREATE TABLE lesson_concepts (
  lesson_id   UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  concept_id  UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (lesson_id, concept_id)
);

CREATE INDEX idx_lesson_concepts_concept ON lesson_concepts(concept_id);

-- ---------------------------------------------------------------------------
-- RLS — workspace owner only (pattern: JOIN users u ON u.id = w.user_id WHERE u.auth_id = auth.uid())
-- ---------------------------------------------------------------------------

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY lessons_select ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE w.id = lessons.workspace_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY lessons_insert ON lessons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE w.id = lessons.workspace_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY lessons_update ON lessons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE w.id = lessons.workspace_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY lessons_delete ON lessons
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE w.id = lessons.workspace_id
        AND u.auth_id = auth.uid()
    )
  );

ALTER TABLE lesson_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY lesson_concepts_select ON lesson_concepts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN workspaces w ON w.id = l.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE l.id = lesson_concepts.lesson_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY lesson_concepts_insert ON lesson_concepts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN workspaces w ON w.id = l.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE l.id = lesson_concepts.lesson_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY lesson_concepts_delete ON lesson_concepts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN workspaces w ON w.id = l.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE l.id = lesson_concepts.lesson_id
        AND u.auth_id = auth.uid()
    )
  );
