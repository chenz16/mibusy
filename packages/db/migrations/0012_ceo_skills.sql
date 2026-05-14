-- Migration 0012: CEO-level skills
--
-- A "skill" is a reusable prompt/recipe owned by the CEO. Every employee
-- (under this CEO) inherits all skills by default — they can be injected
-- into the system prompt or invoked by name in chat.
--
-- For real human workers connecting via work_token, per-worker skill
-- visibility will be configurable later (separate concern).

CREATE TABLE IF NOT EXISTS ceo_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desk_id UUID NOT NULL REFERENCES desks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                -- short slug, e.g. "周报模板"
  description TEXT NOT NULL,         -- one-line what it does
  body TEXT NOT NULL,                -- the actual prompt / recipe content
  tags TEXT[] NOT NULL DEFAULT '{}', -- optional tags for filtering
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (desk_id, name)
);

CREATE INDEX IF NOT EXISTS idx_ceo_skills_desk ON ceo_skills(desk_id, enabled, created_at DESC);
