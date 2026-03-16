-- Phase 1F: Quizzes + Flashcards

-- Quizzes
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  quiz_type TEXT NOT NULL DEFAULT 'practice' CHECK (quiz_type IN ('practice', 'review', 'exam_prep', 'diagnostic')),
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'fill_blank')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  bloom_level TEXT CHECK (bloom_level IN ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create')),
  concept_id UUID REFERENCES concepts(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  score FLOAT,
  time_spent_seconds INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Flashcards
CREATE TABLE flashcard_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('lesson', 'workspace', 'manual')),
  source_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES flashcard_sets(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES concepts(id) ON DELETE SET NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  -- FSRS fields
  stability FLOAT NOT NULL DEFAULT 0,
  difficulty FLOAT NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  state INTEGER NOT NULL DEFAULT 0,
  last_review TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE flashcard_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
  elapsed_days FLOAT NOT NULL DEFAULT 0,
  scheduled_days FLOAT NOT NULL DEFAULT 0,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- quizzes: workspace owner
CREATE POLICY "workspace owner access quizzes"
  ON quizzes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE w.id = quizzes.workspace_id AND u.id = auth.uid()
    )
  );

-- quiz_questions: via quiz → workspace owner
CREATE POLICY "workspace owner access quiz_questions"
  ON quiz_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN workspaces w ON w.id = q.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE q.id = quiz_questions.quiz_id AND u.id = auth.uid()
    )
  );

-- quiz_attempts: own attempts
CREATE POLICY "user own quiz_attempts"
  ON quiz_attempts FOR ALL
  USING (user_id = auth.uid());

-- quiz_responses: via attempt → own
CREATE POLICY "user own quiz_responses"
  ON quiz_responses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa
      WHERE qa.id = quiz_responses.attempt_id AND qa.user_id = auth.uid()
    )
  );

-- flashcard_sets: workspace owner
CREATE POLICY "workspace owner access flashcard_sets"
  ON flashcard_sets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE w.id = flashcard_sets.workspace_id AND u.id = auth.uid()
    )
  );

-- flashcards: via set → workspace owner
CREATE POLICY "workspace owner access flashcards"
  ON flashcards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM flashcard_sets fs
      JOIN workspaces w ON w.id = fs.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE fs.id = flashcards.set_id AND u.id = auth.uid()
    )
  );

-- flashcard_reviews: own reviews
CREATE POLICY "user own flashcard_reviews"
  ON flashcard_reviews FOR ALL
  USING (user_id = auth.uid());

-- RPC: get_due_flashcards
CREATE OR REPLACE FUNCTION get_due_flashcards(p_workspace_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  set_id UUID,
  concept_id UUID,
  front TEXT,
  back TEXT,
  stability FLOAT,
  difficulty FLOAT,
  due_at TIMESTAMPTZ,
  reps INTEGER,
  lapses INTEGER,
  state INTEGER,
  last_review TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id, f.set_id, f.concept_id, f.front, f.back,
         f.stability, f.difficulty, f.due_at, f.reps, f.lapses, f.state, f.last_review
  FROM flashcards f
  JOIN flashcard_sets fs ON fs.id = f.set_id
  JOIN workspaces w ON w.id = fs.workspace_id
  JOIN users u ON u.id = w.user_id
  WHERE fs.workspace_id = p_workspace_id
    AND f.due_at <= now()
    AND u.id = auth.uid()
  ORDER BY f.due_at ASC
  LIMIT p_limit;
$$;
