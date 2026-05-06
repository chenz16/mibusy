CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_password';
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'stage1',
  monthly_budget_usd NUMERIC(10, 2) NOT NULL DEFAULT 200.00,
  kill_switch_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'member')),
  platform_role TEXT NOT NULL DEFAULT 'friend' CHECK (platform_role IN ('admin', 'friend')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  revision INT NOT NULL DEFAULT 1,
  model TEXT NOT NULL DEFAULT 'claude-opus-4-5',
  system_prompt TEXT NOT NULL DEFAULT '',
  allowed_tools TEXT[] NOT NULL DEFAULT '{}',
  skills TEXT[] NOT NULL DEFAULT '{}',
  mcp_servers JSONB NOT NULL DEFAULT '{}'::jsonb,
  permission_mode TEXT NOT NULL DEFAULT 'default',
  max_budget_usd NUMERIC(10, 4),
  max_session_hours NUMERIC(10, 2),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name, revision)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_global_template_revision
  ON agent_templates(name, revision)
  WHERE tenant_id IS NULL;

CREATE TABLE IF NOT EXISTS template_invocation_edges (
  caller_template_id UUID NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
  callee_template_id UUID NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (caller_template_id, callee_template_id),
  CHECK (caller_template_id <> callee_template_id)
);

CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES agent_templates(id) ON DELETE SET NULL,
  template_revision INT NOT NULL DEFAULT 1,
  parent_session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
  root_session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
  triggered_by_session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
  depth INT NOT NULL DEFAULT 0 CHECK (depth >= 0 AND depth <= 5),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'awaiting_input', 'suspended', 'completed', 'failed', 'cancelled')
  ),
  sdk_session_id TEXT,
  sdk_task_id TEXT,
  sdk_session_path TEXT,
  cumulative_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  cumulative_tokens BIGINT NOT NULL DEFAULT 0,
  initial_prompt TEXT,
  final_summary TEXT,
  error TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terminated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_tenant_created
  ON agent_sessions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_root
  ON agent_sessions(root_session_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_sdk_session
  ON agent_sessions(sdk_session_id)
  WHERE sdk_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_sessions_sdk_task
  ON agent_sessions(sdk_task_id)
  WHERE sdk_task_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('approval', 'question', 'review')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  answered_at TIMESTAMPTZ,
  answer JSONB,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_summaries_tenant
  ON session_summaries(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS topic_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  digest TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS persona_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 1.0,
  source_session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cron_expr TEXT NOT NULL,
  template_id UUID REFERENCES agent_templates(id) ON DELETE SET NULL,
  prompt_template TEXT NOT NULL,
  notify_channels TEXT[] NOT NULL DEFAULT '{inbox}',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  consecutive_failures INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('tokens', 'session_hour', 'tool_call')),
  amount NUMERIC(18, 6) NOT NULL,
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('agent_session', 'cron_tick', 'cleanup')),
  payload JSONB NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'running', 'completed', 'failed')),
  priority INT NOT NULL DEFAULT 100,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  worker_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_pickup
  ON jobs(state, scheduled_for)
  WHERE state = 'pending';
CREATE INDEX IF NOT EXISTS idx_jobs_tenant
  ON jobs(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS session_events (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  seq INT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('status', 'tool_use', 'tool_result', 'message_chunk', 'final', 'error')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_events_session_seq
  ON session_events(session_id, seq);
CREATE INDEX IF NOT EXISTS idx_events_tenant
  ON session_events(tenant_id, created_at DESC);

CREATE OR REPLACE FUNCTION notify_session_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  channel_name TEXT;
BEGIN
  channel_name := 'session_' || replace(NEW.session_id::TEXT, '-', '_');
  PERFORM pg_notify(channel_name, NEW.seq::TEXT);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_session_event ON session_events;
CREATE TRIGGER trg_notify_session_event
AFTER INSERT ON session_events
FOR EACH ROW
EXECUTE FUNCTION notify_session_event();

CREATE TABLE IF NOT EXISTS invitations (
  code TEXT PRIMARY KEY,
  invited_by_user_id UUID NOT NULL,
  invitee_email TEXT,
  platform_role TEXT NOT NULL DEFAULT 'friend' CHECK (platform_role IN ('admin', 'friend')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  consumed_at TIMESTAMPTZ,
  consumed_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.add_tenant_claim(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  user_tenant UUID;
  claims JSONB;
BEGIN
  SELECT tenant_id INTO user_tenant
  FROM users
  WHERE id = (event->>'user_id')::UUID;

  claims := COALESCE(event->'claims', '{}'::jsonb);

  IF user_tenant IS NULL THEN
    claims := jsonb_set(claims, '{needs_bootstrap}', 'true'::jsonb);
  ELSE
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant::TEXT));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'tenants',
    'users',
    'agent_templates',
    'template_invocation_edges',
    'agent_sessions',
    'inbox_items',
    'session_summaries',
    'topic_digests',
    'persona_facts',
    'schedules',
    'billing_events',
    'jobs',
    'session_events',
    'invitations'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION tenant_claim()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'tenant_id'
$$;

DROP POLICY IF EXISTS tenant_select ON tenants;
CREATE POLICY tenant_select ON tenants
  FOR SELECT USING (id::TEXT = tenant_claim());

DROP POLICY IF EXISTS tenant_update ON tenants;
CREATE POLICY tenant_update ON tenants
  FOR UPDATE USING (id::TEXT = tenant_claim())
  WITH CHECK (id::TEXT = tenant_claim());

DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
  USING (tenant_id::TEXT = tenant_claim())
  WITH CHECK (tenant_id::TEXT = tenant_claim());

DROP POLICY IF EXISTS templates_read ON agent_templates;
CREATE POLICY templates_read ON agent_templates
  FOR SELECT USING (tenant_id IS NULL OR tenant_id::TEXT = tenant_claim());

DROP POLICY IF EXISTS templates_write ON agent_templates;
CREATE POLICY templates_write ON agent_templates
  FOR ALL USING (tenant_id::TEXT = tenant_claim())
  WITH CHECK (tenant_id::TEXT = tenant_claim());

DROP POLICY IF EXISTS template_edges_read ON template_invocation_edges;
CREATE POLICY template_edges_read ON template_invocation_edges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agent_templates caller
      WHERE caller.id = caller_template_id
        AND (caller.tenant_id IS NULL OR caller.tenant_id::TEXT = tenant_claim())
    )
  );

DROP POLICY IF EXISTS template_edges_write ON template_invocation_edges;
CREATE POLICY template_edges_write ON template_invocation_edges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agent_templates caller
      WHERE caller.id = caller_template_id
        AND caller.tenant_id::TEXT = tenant_claim()
    )
  );

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'agent_sessions',
    'inbox_items',
    'session_summaries',
    'topic_digests',
    'persona_facts',
    'schedules',
    'billing_events',
    'jobs',
    'session_events'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id::TEXT = tenant_claim()) WITH CHECK (tenant_id::TEXT = tenant_claim())',
      table_name
    );
  END LOOP;
END
$$;

DROP POLICY IF EXISTS invitations_admin_only ON invitations;
CREATE POLICY invitations_admin_only ON invitations
  USING ((auth.jwt() ->> 'platform_role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'platform_role') = 'admin');

GRANT USAGE ON SCHEMA public, auth TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;

INSERT INTO agent_templates (
  tenant_id,
  name,
  revision,
  model,
  system_prompt,
  allowed_tools,
  skills,
  mcp_servers,
  permission_mode,
  max_budget_usd,
  max_session_hours
)
VALUES
  (
    NULL,
    'general_assistant',
    1,
    'claude-opus-4-7',
    'You are a general-purpose assistant for the owner workspace. Keep answers concise, ask for clarification when needed, and avoid unsafe tool use.',
    ARRAY['Read', 'WebSearch', 'WebFetch', 'AskUserQuestion'],
    ARRAY[]::TEXT[],
    '{}'::jsonb,
    'default',
    3.00,
    2
  ),
  (
    NULL,
    'research_agent',
    1,
    'claude-opus-4-7',
    'You research a topic, cite sources in summaries, and use subagents only when the task benefits from parallel investigation.',
    ARRAY['Read', 'WebSearch', 'WebFetch', 'Task', 'AskUserQuestion'],
    ARRAY[]::TEXT[],
    '{}'::jsonb,
    'default',
    8.00,
    6
  ),
  (
    NULL,
    'writer_agent',
    1,
    'claude-opus-4-7',
    'You turn research notes into clear drafts. Preserve factual uncertainty and ask before sending or publishing anything externally.',
    ARRAY['Read', 'WebFetch', 'AskUserQuestion'],
    ARRAY[]::TEXT[],
    '{}'::jsonb,
    'default',
    2.00,
    2
  ),
  (
    NULL,
    'notifier_agent',
    1,
    'claude-opus-4-7',
    'You prepare concise notifications for inbox or email. Do not send external messages without explicit approval.',
    ARRAY['AskUserQuestion'],
    ARRAY[]::TEXT[],
    '{}'::jsonb,
    'default',
    0.50,
    1
  ),
  (
    NULL,
    'scheduler_agent',
    1,
    'claude-opus-4-7',
    'You execute scheduled prompts, summarize results, and fail safely when required context or budget is missing.',
    ARRAY['Read', 'WebSearch', 'WebFetch', 'AskUserQuestion'],
    ARRAY[]::TEXT[],
    '{}'::jsonb,
    'default',
    4.00,
    3
  )
ON CONFLICT DO NOTHING;

INSERT INTO template_invocation_edges (caller_template_id, callee_template_id)
SELECT caller.id, callee.id
FROM (VALUES
  ('general_assistant', 'research_agent'),
  ('research_agent', 'writer_agent'),
  ('research_agent', 'notifier_agent'),
  ('scheduler_agent', 'notifier_agent')
) AS edge(caller_name, callee_name)
JOIN agent_templates caller ON caller.tenant_id IS NULL AND caller.name = edge.caller_name AND caller.revision = 1
JOIN agent_templates callee ON callee.tenant_id IS NULL AND callee.name = edge.callee_name AND callee.revision = 1
ON CONFLICT DO NOTHING;
