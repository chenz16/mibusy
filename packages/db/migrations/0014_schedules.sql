-- Migration 0014: v2 scheduled tasks
--
-- Schedules can attach to a parent "task" (root assignment) or stand alone.
-- Each tick that crosses next_run_at spawns a fresh assignment:
--   - if parent_task_id is set → child assignment under that root (so it shows in TaskSheet history)
--   - otherwise → standalone root assignment owned by the assigned agent
--
-- cron_expr format:
--   - Standard 5-field cron: "M H DoM Mon DoW" — repeating
--   - "ONCE:<ISO>" for one-shot (deleted/disabled after fire)

CREATE TABLE IF NOT EXISTS scheduled_tasks_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desk_id UUID NOT NULL REFERENCES desks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_task_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  assigned_to_agent_id UUID REFERENCES virtual_agents(id) ON DELETE SET NULL,
  cron_expr TEXT NOT NULL,
  title_template TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  consecutive_failures INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sched_v2_next
  ON scheduled_tasks_v2(enabled, next_run_at)
  WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_sched_v2_parent
  ON scheduled_tasks_v2(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_sched_v2_agent
  ON scheduled_tasks_v2(assigned_to_agent_id);
