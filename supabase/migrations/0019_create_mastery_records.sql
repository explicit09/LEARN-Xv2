-- Mastery records: per-user, per-concept mastery tracking
CREATE TABLE IF NOT EXISTS mastery_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mastery_level REAL NOT NULL DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 1),
  source TEXT NOT NULL DEFAULT 'lesson',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_mastery_records_workspace ON mastery_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_mastery_records_user ON mastery_records(user_id);

ALTER TABLE mastery_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY mastery_records_select ON mastery_records
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY mastery_records_insert ON mastery_records
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY mastery_records_update ON mastery_records
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE OR REPLACE FUNCTION update_mastery_records_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mastery_records_updated_at
  BEFORE UPDATE ON mastery_records
  FOR EACH ROW EXECUTE FUNCTION update_mastery_records_timestamp();
