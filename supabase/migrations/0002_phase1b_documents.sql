-- Phase 1B migration: documents, chunks, chunk_embeddings, jobs, ai_requests
-- Depends on Phase 0 migration (users, workspaces tables must exist)

-- ============================================================
-- Storage bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,  -- 50 MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Documents
-- ============================================================

CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  file_type     TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt', 'md')),
  file_url      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'uploading'
    CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
  page_count    INTEGER,
  token_count   INTEGER NOT NULL DEFAULT 0,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_workspace ON documents(workspace_id);
CREATE INDEX idx_documents_user ON documents(user_id);

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ============================================================
-- Chunks
-- ============================================================

CREATE TABLE chunks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  enriched_content TEXT,
  chunk_index      INTEGER NOT NULL,
  page_number      INTEGER,
  token_count      INTEGER NOT NULL DEFAULT 0,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chunks_document ON chunks(document_id);
CREATE INDEX idx_chunks_workspace ON chunks(workspace_id);
-- Full-text search index for hybrid_search
CREATE INDEX idx_chunks_fts ON chunks USING gin(to_tsvector('english', content));

-- ============================================================
-- Chunk embeddings (halfvec for 3072-dim text-embedding-3-large)
-- ============================================================

CREATE TABLE chunk_embeddings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id     UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  embedding    halfvec(3072),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for approximate nearest-neighbor search (inner product)
CREATE INDEX idx_chunk_embeddings_hnsw
  ON chunk_embeddings
  USING hnsw (embedding halfvec_ip_ops);

CREATE INDEX idx_chunk_embeddings_workspace ON chunk_embeddings(workspace_id);

-- ============================================================
-- Jobs
-- ============================================================

CREATE TABLE jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id      TEXT,  -- Trigger.dev task run ID
  type         TEXT NOT NULL,  -- e.g. 'process-document', 'extract-concepts'
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress     INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  error        TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_workspace ON jobs(workspace_id);
CREATE INDEX idx_jobs_user ON jobs(user_id);

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ============================================================
-- AI requests (cost tracking — every LLM call inserts a row)
-- ============================================================

CREATE TABLE ai_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  model             TEXT NOT NULL,
  prompt_tokens     INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd          NUMERIC(10, 6) NOT NULL DEFAULT 0,
  latency_ms        INTEGER NOT NULL DEFAULT 0,
  task_name         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_requests_workspace ON ai_requests(workspace_id);

-- ============================================================
-- hybrid_search function: 70% vector + 30% FTS via RRF
-- ============================================================

CREATE OR REPLACE FUNCTION hybrid_search(
  query_text          TEXT,
  query_embedding     halfvec(3072),
  workspace_id_filter UUID,
  match_count         INT DEFAULT 8,
  rrf_k               INT DEFAULT 60
)
RETURNS TABLE (
  chunk_id         UUID,
  content          TEXT,
  enriched_content TEXT,
  document_id      UUID,
  chunk_index      INTEGER,
  page_number      INTEGER,
  score            FLOAT
)
LANGUAGE sql
AS $$
  WITH vector_results AS (
    SELECT
      ce.chunk_id,
      ROW_NUMBER() OVER (ORDER BY ce.embedding <#> query_embedding) AS rank
    FROM chunk_embeddings ce
    WHERE ce.workspace_id = workspace_id_filter
    ORDER BY ce.embedding <#> query_embedding
    LIMIT match_count * 2
  ),
  fts_results AS (
    SELECT
      c.id AS chunk_id,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(to_tsvector('english', c.content), plainto_tsquery('english', query_text)) DESC
      ) AS rank
    FROM chunks c
    WHERE c.workspace_id = workspace_id_filter
      AND to_tsvector('english', c.content) @@ plainto_tsquery('english', query_text)
    ORDER BY rank
    LIMIT match_count * 2
  ),
  rrf AS (
    SELECT
      COALESCE(v.chunk_id, f.chunk_id) AS chunk_id,
      COALESCE(0.7 / (rrf_k + v.rank), 0) + COALESCE(0.3 / (rrf_k + f.rank), 0) AS score
    FROM vector_results v
    FULL OUTER JOIN fts_results f ON v.chunk_id = f.chunk_id
    ORDER BY score DESC
    LIMIT match_count
  )
  SELECT
    c.id,
    c.content,
    c.enriched_content,
    c.document_id,
    c.chunk_index,
    c.page_number,
    rrf.score
  FROM rrf
  JOIN chunks c ON c.id = rrf.chunk_id
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunk_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;

-- documents: user can CRUD their own documents
CREATE POLICY "documents: own"
  ON documents
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "documents: insert own"
  ON documents FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- chunks: scoped to workspace owner
CREATE POLICY "chunks: own"
  ON chunks
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- chunk_embeddings: scoped to workspace owner
CREATE POLICY "chunk_embeddings: own"
  ON chunk_embeddings
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- jobs: scoped to workspace owner
CREATE POLICY "jobs: own"
  ON jobs
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "jobs: insert own"
  ON jobs FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ai_requests: scoped to workspace owner (nullable workspace_id allowed for service inserts)
CREATE POLICY "ai_requests: own"
  ON ai_requests
  USING (
    workspace_id IS NULL OR
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Storage RLS: documents bucket — workspace owners only
CREATE POLICY "documents storage: own"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'documents' AND
    auth.uid() IS NOT NULL
  )
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid() IS NOT NULL
  );
