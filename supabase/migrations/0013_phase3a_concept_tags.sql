-- Phase 3A: Cross-Workspace Knowledge Graph
-- concept_tags: maps concepts to canonical domain tags
CREATE TABLE IF NOT EXISTS concept_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(concept_id, tag)
);

-- concept_relations_global: domain-level connections (not tied to a workspace)
CREATE TABLE IF NOT EXISTS concept_relations_global (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  target_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('prerequisite','related','extends','part_of')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_concept_id, target_concept_id, relation_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_concept_tags_concept_id ON concept_tags(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_tags_domain ON concept_tags(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_concept_relations_global_source ON concept_relations_global(source_concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_relations_global_target ON concept_relations_global(target_concept_id);

-- RLS
ALTER TABLE concept_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_relations_global ENABLE ROW LEVEL SECURITY;

-- concept_tags: readable by workspace members (concept → chunk_concepts → chunks → document → workspace → user)
-- For simplicity: allow authenticated users to read all tags, only concept owner's workspace can insert
CREATE POLICY "concept_tags_select" ON concept_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM concepts c
      JOIN workspaces w ON w.id = c.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE c.id = concept_tags.concept_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "concept_tags_insert" ON concept_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM concepts c
      JOIN workspaces w ON w.id = c.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE c.id = concept_tags.concept_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "concept_tags_delete" ON concept_tags
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM concepts c
      JOIN workspaces w ON w.id = c.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE c.id = concept_tags.concept_id
        AND u.auth_id = auth.uid()
    )
  );

-- concept_relations_global: readable by workspace members of either concept's workspace
CREATE POLICY "concept_relations_global_select" ON concept_relations_global
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM concepts c
      JOIN workspaces w ON w.id = c.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE c.id = concept_relations_global.source_concept_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "concept_relations_global_insert" ON concept_relations_global
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM concepts c
      JOIN workspaces w ON w.id = c.workspace_id
      JOIN users u ON u.id = w.user_id
      WHERE c.id = concept_relations_global.source_concept_id
        AND u.auth_id = auth.uid()
    )
  );
