-- Phase 2B+: Podcast Upgrade
-- Renames audio_recaps → podcasts, adds new columns, creates podcast_segments.

-- ============================================================
-- 1. Rename audio_recaps → podcasts
-- ============================================================

ALTER TABLE audio_recaps RENAME TO podcasts;

ALTER INDEX idx_audio_recaps_workspace RENAME TO idx_podcasts_workspace;
ALTER INDEX idx_audio_recaps_lesson RENAME TO idx_podcasts_lesson;

-- Rename RLS policies
ALTER POLICY "audio_recaps_select" ON podcasts RENAME TO "podcasts_select";
ALTER POLICY "audio_recaps_insert" ON podcasts RENAME TO "podcasts_insert";
ALTER POLICY "audio_recaps_update" ON podcasts RENAME TO "podcasts_update";
ALTER POLICY "audio_recaps_delete" ON podcasts RENAME TO "podcasts_delete";

-- ============================================================
-- 2. Add new columns to podcasts
-- ============================================================

ALTER TABLE podcasts
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN format TEXT NOT NULL DEFAULT 'conversation'
    CHECK (format IN ('single_voice', 'conversation')),
  ADD COLUMN voice_config JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN progress INTEGER NOT NULL DEFAULT 0
    CHECK (progress >= 0 AND progress <= 100),
  ADD COLUMN generation_time_seconds INTEGER,
  ADD COLUMN total_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  ADD COLUMN tts_provider TEXT NOT NULL DEFAULT 'elevenlabs'
    CHECK (tts_provider IN ('elevenlabs', 'openai'));

-- Update status CHECK to include synthesizing and assembling phases.
-- Drop old constraint (named after the table's original inline CHECK).
ALTER TABLE podcasts DROP CONSTRAINT IF EXISTS audio_recaps_status_check;

-- The inline CHECK on the column is unnamed, so also try dropping by column re-add.
-- Safest approach: drop all CHECKs on status, re-add the new one.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'podcasts'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE podcasts DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE podcasts ADD CONSTRAINT podcasts_status_check
  CHECK (status IN ('pending', 'generating', 'synthesizing', 'assembling', 'ready', 'failed'));

-- Add index on user_id for listAll queries
CREATE INDEX idx_podcasts_user ON podcasts(user_id);

-- ============================================================
-- 3. Create podcast_segments table
-- ============================================================

CREATE TABLE podcast_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  speaker TEXT NOT NULL CHECK (speaker IN ('host_a', 'host_b')),
  text TEXT NOT NULL,
  audio_url TEXT,
  duration_seconds NUMERIC(8, 2),
  start_time NUMERIC(8, 2),
  end_time NUMERIC(8, 2),
  concept_id UUID REFERENCES concepts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (podcast_id, segment_index)
);

CREATE INDEX idx_podcast_segments_podcast ON podcast_segments(podcast_id);

-- ============================================================
-- 4. RLS on podcast_segments
-- ============================================================

ALTER TABLE podcast_segments ENABLE ROW LEVEL SECURITY;

-- SELECT: inherit access from parent podcast → workspace → user
CREATE POLICY "podcast_segments_select" ON podcast_segments
  FOR SELECT USING (
    podcast_id IN (
      SELECT p.id FROM podcasts p
      INNER JOIN workspaces w ON w.id = p.workspace_id
      INNER JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- service_role handles insert/update/delete (from Trigger.dev jobs)
CREATE POLICY "podcast_segments_service_insert" ON podcast_segments
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "podcast_segments_service_update" ON podcast_segments
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "podcast_segments_service_delete" ON podcast_segments
  FOR DELETE USING (auth.role() = 'service_role');

-- Also add service_role policies to podcasts for Trigger.dev job inserts/updates
CREATE POLICY "podcasts_service_insert" ON podcasts
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "podcasts_service_update" ON podcasts
  FOR UPDATE USING (auth.role() = 'service_role');
