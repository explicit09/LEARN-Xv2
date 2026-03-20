-- Atomic insert of chunks + embeddings in a single transaction.
-- Prevents orphaned chunks if embedding insert fails.

CREATE OR REPLACE FUNCTION insert_chunks_and_embeddings(
  p_chunks jsonb,
  p_embeddings text[],
  p_model_version text DEFAULT 'text-embedding-3-large'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chunk_record jsonb;
  inserted_ids uuid[];
  i int;
BEGIN
  -- Insert all chunks and collect their IDs in order
  WITH inserted AS (
    INSERT INTO chunks (document_id, workspace_id, content, enriched_content, chunk_index, token_count)
    SELECT
      (c->>'document_id')::uuid,
      (c->>'workspace_id')::uuid,
      c->>'content',
      c->>'enriched_content',
      (c->>'chunk_index')::int,
      (c->>'token_count')::int
    FROM jsonb_array_elements(p_chunks) WITH ORDINALITY AS t(c, ord)
    ORDER BY t.ord
    RETURNING id
  )
  SELECT array_agg(id) INTO inserted_ids FROM inserted;

  -- Insert corresponding embeddings
  FOR i IN 1..array_length(inserted_ids, 1) LOOP
    INSERT INTO chunk_embeddings (chunk_id, embedding, model_version)
    VALUES (inserted_ids[i], p_embeddings[i]::halfvec(3072), p_model_version);
  END LOOP;
END;
$$;
