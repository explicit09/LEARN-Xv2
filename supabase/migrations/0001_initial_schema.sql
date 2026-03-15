-- Phase 0 migration: users, personas, workspaces
-- Only these three tables are needed for user.getProfile to work.
-- All other tables come in Phase 1B–1G migrations.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;  -- pgvector (halfvec columns added in Phase 1B+)

-- ============================================================
-- Identity & Access
-- ============================================================

CREATE TABLE users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id              UUID UNIQUE NOT NULL,  -- references auth.users
  display_name         TEXT NOT NULL,
  email                TEXT NOT NULL,
  avatar_url           TEXT,
  user_type            TEXT NOT NULL DEFAULT 'student'
    CHECK (user_type IN ('student', 'professor', 'admin')),
  is_admin             BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE personas (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version                 INTEGER NOT NULL DEFAULT 1,

  -- Layer 1: Learner Profile
  interests               TEXT[] NOT NULL DEFAULT '{}',
  aspiration_tags         TEXT[] NOT NULL DEFAULT '{}',
  affinity_domains        TEXT[] NOT NULL DEFAULT '{}',
  motivational_style      TEXT NOT NULL DEFAULT 'mastery'
    CHECK (motivational_style IN ('challenge', 'progress', 'mastery', 'curiosity')),

  -- Layer 2: Pedagogical Profile
  explanation_preferences JSONB NOT NULL DEFAULT '{}',

  -- Layer 3: Performance Profile (updated continuously)
  performance_profile     JSONB NOT NULL DEFAULT '{}',

  -- Legacy columns (kept for migration compatibility)
  tone_preference         TEXT NOT NULL DEFAULT 'balanced'
    CHECK (tone_preference IN ('casual', 'balanced', 'academic', 'socratic')),
  difficulty_preference   TEXT NOT NULL DEFAULT 'adaptive'
    CHECK (difficulty_preference IN ('beginner', 'intermediate', 'advanced', 'adaptive')),

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, version)
);

-- ============================================================
-- Workspace Core
-- ============================================================

CREATE TABLE workspaces (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'processing')),
  settings          JSONB NOT NULL DEFAULT '{}',
  total_token_count INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspaces_user ON workspaces(user_id);

-- ============================================================
-- updated_at triggers
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ============================================================
-- Auth trigger: auto-create users row on Supabase Auth sign-up
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, display_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- users: each user can read and update their own row only
CREATE POLICY "users: read own"
  ON users FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "users: update own"
  ON users FOR UPDATE
  USING (auth.uid() = auth_id);

-- personas: user can CRUD their own personas
CREATE POLICY "personas: own"
  ON personas
  USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- workspaces: user can CRUD their own workspaces
CREATE POLICY "workspaces: own"
  ON workspaces
  USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- workspaces INSERT: explicitly allow inserting with correct user_id
CREATE POLICY "workspaces: insert own"
  ON workspaces FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );
