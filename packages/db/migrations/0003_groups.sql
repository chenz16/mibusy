-- Agent groups (virtual org chart)
CREATE TABLE IF NOT EXISTS agent_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desk_id UUID REFERENCES desks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#888888',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_group_members (
  group_id UUID NOT NULL REFERENCES agent_groups(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES virtual_agents(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_agent ON agent_group_members(agent_id);
