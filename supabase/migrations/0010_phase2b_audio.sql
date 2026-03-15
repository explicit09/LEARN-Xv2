-- Phase 2B: Audio Recaps

CREATE TABLE audio_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  storage_url TEXT,
  duration_seconds INTEGER,
  transcript TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audio_recaps_workspace ON audio_recaps(workspace_id);
CREATE INDEX idx_audio_recaps_lesson ON audio_recaps(lesson_id);

ALTER TABLE audio_recaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audio_recaps_select" ON audio_recaps
  FOR SELECT USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      INNER JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "audio_recaps_insert" ON audio_recaps
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      INNER JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "audio_recaps_update" ON audio_recaps
  FOR UPDATE USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      INNER JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "audio_recaps_delete" ON audio_recaps
  FOR DELETE USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      INNER JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );
