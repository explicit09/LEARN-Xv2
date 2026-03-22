-- Fix: get_due_flashcards was comparing u.id (internal UUID) with auth.uid() (auth UUID).
-- Should compare u.auth_id = auth.uid().
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
    AND u.auth_id = auth.uid()
  ORDER BY f.due_at ASC
  LIMIT p_limit;
$$;
