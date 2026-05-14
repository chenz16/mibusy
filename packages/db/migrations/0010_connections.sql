-- Migration 0010: unified connection model
--
-- Two new tables:
--
-- 1. agent_connections — each virtual employee can have N outward "faces"
--    Each connection = one bidirectional typed message channel.
--    kind:      task | chat | event | decision | stream
--    direction: inbound | outbound | bidi
--    transport: poll | webhook | slack | email | mcp | peer
--
--    The existing virtual_agents.work_token is migrated in as a
--    (kind='task', transport='poll', direction='bidi') row so behavior
--    is preserved.
--
-- 2. ceo_integrations — CEO-level external tools (Gmail, Slack workspace,
--    Calendar, Webhook). Virtual employees inherit access by default.
--    No per-employee access list (only budget is per-employee).

CREATE TABLE IF NOT EXISTS agent_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES virtual_agents(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('task','chat','event','decision','stream')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound','bidi')),
  transport TEXT NOT NULL CHECK (transport IN ('poll','webhook','slack','email','mcp','peer')),
  token UUID UNIQUE,
  endpoint_url TEXT,
  counterparty_label TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_conn_agent ON agent_connections(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_conn_token ON agent_connections(token) WHERE token IS NOT NULL;

CREATE TABLE IF NOT EXISTS ceo_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desk_id UUID NOT NULL REFERENCES desks(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                      -- 'gmail' | 'slack' | 'calendar' | 'webhook' | 'mcp' | ...
  label TEXT NOT NULL,                     -- human label, e.g. "chen.zhang6@gmail.com"
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'configured' CHECK (status IN ('configured','connected','error','disabled')),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ceo_integrations_desk ON ceo_integrations(desk_id, kind);

-- Backfill: convert each existing virtual_agents.work_token into a connection row.
-- Idempotent: skips agents that already have a poll/task connection.
DO $$
BEGIN
  INSERT INTO agent_connections (agent_id, kind, direction, transport, token, counterparty_label, last_seen_at)
  SELECT
    va.id,
    'task',
    'bidi',
    'poll',
    va.work_token::uuid,
    COALESCE(va.linked_email, va.name) AS counterparty_label,
    va.last_seen_at
  FROM virtual_agents va
  WHERE va.work_token IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM agent_connections c
      WHERE c.agent_id = va.id AND c.kind = 'task' AND c.transport = 'poll'
    );
END $$;
