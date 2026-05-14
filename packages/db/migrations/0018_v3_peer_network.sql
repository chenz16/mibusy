-- Migration 0018: V3 peer network foundation
--
-- "延长线" architecture — virtual employees can be either local AI agents
-- (Hermes leaf) or façade agents that forward tasks to another Mibusy
-- instance's CEO (real human or further-relayed).
--
-- 1) virtual_agents.agent_mode — 'ai' (default, Hermes) or 'facade' (peer)
-- 2) agent_connections.peer_url / peer_token — for facade routing
-- 3) assignments.peer_origin_id / peer_connection_id — track cross-instance
--    task lifecycle (assignment <-> remote mission)

ALTER TABLE virtual_agents
  ADD COLUMN IF NOT EXISTS agent_mode TEXT NOT NULL DEFAULT 'ai'
    CHECK (agent_mode IN ('ai', 'facade'));

ALTER TABLE agent_connections
  ADD COLUMN IF NOT EXISTS peer_url TEXT,
  ADD COLUMN IF NOT EXISTS peer_token UUID;

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS peer_origin_id UUID,
  ADD COLUMN IF NOT EXISTS peer_connection_id UUID
    REFERENCES agent_connections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_peer_origin
  ON assignments(peer_origin_id) WHERE peer_origin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_mode
  ON virtual_agents(agent_mode) WHERE agent_mode = 'facade';
