-- Phase 1G: Mastery Dashboard RPC functions

CREATE OR REPLACE FUNCTION get_workspace_mastery_summary(p_workspace_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_concepts INTEGER;
  v_mastered INTEGER;
  v_struggling INTEGER;
  v_due_reviews INTEGER;
  v_avg_mastery FLOAT;
BEGIN
  SELECT COUNT(*) INTO v_total_concepts
  FROM concepts WHERE workspace_id = p_workspace_id;

  SELECT COUNT(DISTINCT f.concept_id) INTO v_mastered
  FROM flashcards f
  JOIN flashcard_sets fs ON fs.id = f.set_id
  WHERE fs.workspace_id = p_workspace_id
    AND f.concept_id IS NOT NULL
    AND f.stability > 20
    AND f.state >= 2;

  SELECT COUNT(DISTINCT f.concept_id) INTO v_struggling
  FROM flashcards f
  JOIN flashcard_sets fs ON fs.id = f.set_id
  WHERE fs.workspace_id = p_workspace_id
    AND f.concept_id IS NOT NULL
    AND f.lapses > 2;

  SELECT COUNT(*) INTO v_due_reviews
  FROM flashcards f
  JOIN flashcard_sets fs ON fs.id = f.set_id
  WHERE fs.workspace_id = p_workspace_id
    AND f.due_at <= now();

  SELECT COALESCE(AVG(LEAST(f.stability / 100.0, 1.0)), 0) INTO v_avg_mastery
  FROM flashcards f
  JOIN flashcard_sets fs ON fs.id = f.set_id
  WHERE fs.workspace_id = p_workspace_id AND f.reps > 0;

  RETURN json_build_object(
    'total_concepts', v_total_concepts,
    'mastered', v_mastered,
    'struggling', v_struggling,
    'due_reviews', v_due_reviews,
    'avg_mastery', v_avg_mastery
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_weak_concepts(p_workspace_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  concept_id UUID,
  concept_name TEXT,
  avg_lapses FLOAT,
  avg_stability FLOAT,
  card_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS concept_id,
    c.name AS concept_name,
    AVG(f.lapses)::FLOAT AS avg_lapses,
    AVG(f.stability)::FLOAT AS avg_stability,
    COUNT(f.id)::INTEGER AS card_count
  FROM flashcards f
  JOIN flashcard_sets fs ON fs.id = f.set_id
  JOIN concepts c ON c.id = f.concept_id
  WHERE fs.workspace_id = p_workspace_id
    AND f.concept_id IS NOT NULL
    AND f.reps > 0
  GROUP BY c.id, c.name
  ORDER BY AVG(f.lapses) DESC, AVG(f.stability) ASC
  LIMIT p_limit;
$$;
