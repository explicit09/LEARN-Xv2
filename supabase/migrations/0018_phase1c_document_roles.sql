-- ============================================================
-- 0018_phase1c_document_roles.sql
-- Add document role classification and batch tracking columns,
-- plus a helper function to flag stale lessons.
-- ============================================================

-- ------------------------------------------------------------
-- 1. New columns on documents
-- ------------------------------------------------------------

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'primary'
    CHECK (role IN ('primary', 'supplementary', 'reference')),
  ADD COLUMN IF NOT EXISTS role_confidence REAL
    CHECK (role_confidence IS NULL OR (role_confidence >= 0 AND role_confidence <= 1)),
  ADD COLUMN IF NOT EXISTS upload_batch_id UUID;

-- ------------------------------------------------------------
-- 2. Index for batch lookups
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_documents_upload_batch
  ON documents(upload_batch_id)
  WHERE upload_batch_id IS NOT NULL;

-- ------------------------------------------------------------
-- 3. classify_document_role — placeholder
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION classify_document_role()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- LLM-based document role classification happens in application code
  -- (Trigger.dev job). This function is a placeholder for the SQL interface.
  NULL;
END;
$$;

-- ------------------------------------------------------------
-- 4. flag_stale_lessons
--    Marks lessons as source_updated when their linked syllabus
--    topics have new or changed documents.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION flag_stale_lessons(
  p_workspace_id UUID,
  p_topic_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE lessons
  SET source_updated = true
  WHERE syllabus_topic_id = ANY(p_topic_ids)
    AND workspace_id = p_workspace_id
    AND source_updated = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
