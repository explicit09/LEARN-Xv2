-- Add heartbeat tracking and cached AI coach message to study plans.
-- heartbeat_at: set when a completion event fires (lesson done, flashcard reviewed).
-- coach_message: AI-generated coaching text, regenerated only when a heartbeat exists.
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS coach_message TEXT;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS coach_generated_at TIMESTAMPTZ;
