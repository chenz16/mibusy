-- Migration 0006: assignment origin
-- Marks where the assignment was created from so private chats with an agent
-- don't leak into the CEO's main TodayPage feed/handoffs.
--
-- origin values:
--   'ceo'           - CEO main chat (TodayPage) or general dictador-mode call
--   'private_chat'  - 1:1 chat in AgentSheet, should NOT appear in CEO feed
--   'worker'        - created via worker protocol by an external node
--   'system'        - system-generated (escalation, scheduled, etc.)

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'ceo';

CREATE INDEX IF NOT EXISTS idx_assignments_origin
  ON assignments(origin, created_at DESC);
