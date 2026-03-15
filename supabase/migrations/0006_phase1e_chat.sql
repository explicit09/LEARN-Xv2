-- Phase 1E: Grounded Chat
-- chat_sessions and chat_messages tables with RLS

-- ============================================================
-- chat_sessions
-- ============================================================

CREATE TABLE chat_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    UUID REFERENCES lessons(id) ON DELETE SET NULL,
  title        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_sessions_workspace ON chat_sessions(workspace_id, updated_at DESC);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);

-- ============================================================
-- chat_messages
-- ============================================================

CREATE TABLE chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  cited_chunk_ids UUID[],
  model_used      TEXT,
  token_count     INTEGER,
  latency_ms      INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at ASC);

-- ============================================================
-- RLS: chat_sessions
-- ============================================================

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_sessions_workspace_access"
  ON chat_sessions FOR ALL
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ============================================================
-- RLS: chat_messages
-- ============================================================

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_session_access"
  ON chat_messages FOR ALL
  USING (
    session_id IN (
      SELECT cs.id FROM chat_sessions cs
      JOIN workspaces w ON w.id = cs.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );
