-- Phase 2A: Exam System

-- Exams (formal timed assessments, distinct from quizzes)
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  join_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_exams_join_token ON exams(join_token) WHERE join_token IS NOT NULL;
CREATE INDEX idx_exams_workspace ON exams(workspace_id);

-- Exam questions with Bloom's taxonomy tagging
CREATE TABLE exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'short_answer', 'true_false', 'fill_blank')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  bloom_level TEXT CHECK (bloom_level IN ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create')),
  concept_id UUID REFERENCES concepts(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exam_questions_exam ON exam_questions(exam_id, order_index);

-- Exam attempts (one per student per exam)
CREATE TABLE exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  score FLOAT,
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX idx_exam_attempts_user ON exam_attempts(user_id);

-- Exam responses (one per question per attempt)
CREATE TABLE exam_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  user_answer TEXT,
  is_correct BOOLEAN,
  feedback TEXT,
  points_earned FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exam_responses_attempt ON exam_responses(attempt_id);

-- RLS Policies

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_responses ENABLE ROW LEVEL SECURITY;

-- Exams: workspace owner or student with join_token access
CREATE POLICY "exams_select" ON exams
  FOR SELECT USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      INNER JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
    OR user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "exams_insert" ON exams
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    AND workspace_id IN (
      SELECT w.id FROM workspaces w
      INNER JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "exams_update" ON exams
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "exams_delete" ON exams
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Exam questions: workspace scoped
CREATE POLICY "exam_questions_select" ON exam_questions
  FOR SELECT USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      INNER JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "exam_questions_insert" ON exam_questions
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      INNER JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "exam_questions_update" ON exam_questions
  FOR UPDATE USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      INNER JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "exam_questions_delete" ON exam_questions
  FOR DELETE USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      INNER JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Exam attempts: user owns their own attempts
CREATE POLICY "exam_attempts_select" ON exam_attempts
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR exam_id IN (
      SELECT e.id FROM exams e
      INNER JOIN workspaces w ON w.id = e.workspace_id
      INNER JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "exam_attempts_insert" ON exam_attempts
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "exam_attempts_update" ON exam_attempts
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Exam responses: tied to attempt ownership
CREATE POLICY "exam_responses_select" ON exam_responses
  FOR SELECT USING (
    attempt_id IN (
      SELECT id FROM exam_attempts
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "exam_responses_insert" ON exam_responses
  FOR INSERT WITH CHECK (
    attempt_id IN (
      SELECT id FROM exam_attempts
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "exam_responses_update" ON exam_responses
  FOR UPDATE USING (
    attempt_id IN (
      SELECT id FROM exam_attempts
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );
