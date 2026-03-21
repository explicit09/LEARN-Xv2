-- Lesson feedback / rating table
CREATE TABLE IF NOT EXISTS lesson_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_feedback_lesson ON lesson_feedback(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_feedback_user ON lesson_feedback(user_id);

ALTER TABLE lesson_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY lesson_feedback_select ON lesson_feedback
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY lesson_feedback_insert ON lesson_feedback
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY lesson_feedback_update ON lesson_feedback
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
