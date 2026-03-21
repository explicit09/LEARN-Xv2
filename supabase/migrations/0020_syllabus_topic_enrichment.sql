-- Phase 2a: Enrich syllabus_topics with learning objectives, continuity, duration, prerequisites

ALTER TABLE syllabus_topics
  ADD COLUMN learning_objectives TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN continuity_notes TEXT,
  ADD COLUMN estimated_duration_minutes INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN prerequisite_topic_ids UUID[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN syllabus_topics.learning_objectives IS 'Measurable learning outcomes for this topic (e.g. "Explain X", "Compare Y and Z")';
COMMENT ON COLUMN syllabus_topics.continuity_notes IS 'How this topic connects to prior and next topics in the learning path';
COMMENT ON COLUMN syllabus_topics.estimated_duration_minutes IS 'Estimated time to complete this topic (15=simple, 30=standard, 45=complex)';
COMMENT ON COLUMN syllabus_topics.prerequisite_topic_ids IS 'References to syllabus_topics(id) that must be completed before this topic';
