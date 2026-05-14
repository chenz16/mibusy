-- v2 additive schema: desks, virtual_agents, runtime_profiles,
-- assignments, assignment_events, deliverables, context_packs
-- No existing v1 tables are dropped or altered.

CREATE TABLE IF NOT EXISTS desks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  name TEXT NOT NULL,
  function TEXT NOT NULL DEFAULT 'general',
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS runtime_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'deepseek',
  model TEXT NOT NULL DEFAULT 'deepseek-chat',
  base_url TEXT NOT NULL DEFAULT 'https://api.deepseek.com',
  max_iterations INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS virtual_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  desk_id UUID REFERENCES desks(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'specialist'
    CHECK (kind IN ('chief_of_staff', 'specialist', 'temporary')),
  runtime_profile_id UUID REFERENCES runtime_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_virtual_agents_desk
  ON virtual_agents(desk_id, created_at ASC);

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  desk_id UUID REFERENCES desks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  assigned_to_agent_id UUID REFERENCES virtual_agents(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  root_assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'awaiting_input', 'completed', 'failed')),
  budget_limit NUMERIC(10, 4) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_status
  ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_desk
  ON assignments(desk_id, created_at DESC);

CREATE TABLE IF NOT EXISTS assignment_events (
  id BIGSERIAL PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  seq INT NOT NULL,
  kind TEXT NOT NULL
    CHECK (kind IN ('status', 'message_chunk', 'tool_use', 'tool_result',
                    'delegate_request', 'deliverable', 'final', 'error')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_assignment_events_assignment
  ON assignment_events(assignment_id, seq);

CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  workspace_id UUID,
  desk_id UUID REFERENCES desks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL DEFAULT 'markdown'
    CHECK (format IN ('markdown', 'text', 'json')),
  created_by_agent_id UUID REFERENCES virtual_agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS context_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  summary TEXT NOT NULL DEFAULT '',
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seeds: default CEO Desk, system staff, and runtime profile.
-- All inserts are idempotent via ON CONFLICT DO NOTHING.

INSERT INTO runtime_profiles (name, provider, model, base_url, max_iterations)
VALUES ('hermes_deepseek_v4_pro', 'deepseek', 'deepseek-chat',
        'https://api.deepseek.com', 10)
ON CONFLICT (name) DO NOTHING;

INSERT INTO desks (id, name, function, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'CEO Desk', 'executive', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO virtual_agents
  (id, desk_id, name, role, kind, runtime_profile_id, status)
SELECT
  agent_data.agent_id::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  agent_data.name,
  agent_data.role,
  agent_data.kind,
  (SELECT id FROM runtime_profiles WHERE name = 'hermes_deepseek_v4_pro'),
  'active'
FROM (VALUES
  ('00000000-0000-0000-0001-000000000001', 'Atlas',     'Chief of Staff',      'chief_of_staff'),
  ('00000000-0000-0000-0001-000000000002', 'Nova',      'Research Specialist', 'specialist'),
  ('00000000-0000-0000-0001-000000000003', 'Ledger',    'Analyst',             'specialist'),
  ('00000000-0000-0000-0001-000000000004', 'Quill',     'Writer',              'specialist'),
  ('00000000-0000-0000-0001-000000000005', 'Scheduler', 'Scheduler',           'specialist'),
  ('00000000-0000-0000-0001-000000000006', 'Beacon',    'QA',                  'specialist')
) AS agent_data(agent_id, name, role, kind)
ON CONFLICT (id) DO NOTHING;
