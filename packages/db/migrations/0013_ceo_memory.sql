-- Migration 0013: CEO long-term memory
--
-- Mirrors Hermes' memory concepts (decision / fact / note / summary) but lives
-- in our own Postgres so the Next.js CEO agent can read/write without crossing
-- the Python boundary. Storage layer can later be swapped for a Hermes service.
--
-- kind:
--   'decision' — CEO decided / agreed / approved / rejected
--   'fact'     — a stable fact about people, projects, preferences
--   'note'     — ad-hoc note CEO asked to remember
--   'summary'  — auto-generated conversation summary (per N turns or on /compact)

CREATE TABLE IF NOT EXISTS ceo_memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desk_id UUID NOT NULL REFERENCES desks(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('decision','fact','note','summary')),
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT,           -- 'llm_remember' | 'auto_hire' | 'auto_decision' | 'user_compact' | 'manual'
  ref_id UUID,           -- optional reference (assignment id, agent id, mission id, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ceo_memory_desk_time
  ON ceo_memory_entries(desk_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ceo_memory_kind
  ON ceo_memory_entries(desk_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ceo_memory_tags
  ON ceo_memory_entries USING GIN(tags);
