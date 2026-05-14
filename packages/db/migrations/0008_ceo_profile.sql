-- Migration 0008: CEO profile
--
-- Every Mibusy instance has a CEO (the current user). The CEO has:
--   - name / role / system_prompt (identity, used in TodayPage chat)
--   - upstream_token (how an upstream instance addresses this CEO as a worker)
--   - upstream_name (display name of who's above, e.g. "联合创始人")
--
-- Stored on `desks` (singleton CEO desk).

ALTER TABLE desks
  ADD COLUMN IF NOT EXISTS ceo_name TEXT,
  ADD COLUMN IF NOT EXISTS ceo_role TEXT,
  ADD COLUMN IF NOT EXISTS ceo_system_prompt TEXT,
  ADD COLUMN IF NOT EXISTS upstream_token UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS upstream_name TEXT,
  ADD COLUMN IF NOT EXISTS upstream_last_seen_at TIMESTAMPTZ;

-- Seed defaults on the CEO desk if empty
UPDATE desks
SET
  ceo_name = COALESCE(ceo_name, '我'),
  ceo_role = COALESCE(ceo_role, 'CEO'),
  ceo_system_prompt = COALESCE(
    ceo_system_prompt,
    '我是这家公司的 CEO。
我习惯通过对话拆解工作，把任务派给合适的员工，并在述职报告里向上级汇报进展。
风格：直接、重点先行、关注交付与时间线。'
  )
WHERE id = '00000000-0000-0000-0000-000000000001';
