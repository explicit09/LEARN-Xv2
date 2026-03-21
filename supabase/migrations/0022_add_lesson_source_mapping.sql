-- Add source_mapping column to track which chunks were cited in each lesson.
-- Stores an array of {citationId, chunkId, documentId, documentTitle, pageNumber, preview}.
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS source_mapping JSONB NOT NULL DEFAULT '[]';
