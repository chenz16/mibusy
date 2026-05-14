-- Migration 0007: mission inbox (this CEO's incoming missions from above)
--
-- A "mission" is an assignment that THIS CEO instance received from someone
-- one level up. Conceptually identical to any other assignment, but flagged
-- so the TodayPage can show it as "my mission" at the top.
--
-- origin = 'inbound'        — mission received from upstream
-- mission_source TEXT       — placeholder label for who sent it ("联合创始人", "Foo Corp HQ", etc.)
-- mission_status enum-ish:
--   queued      → 待接受 / unread
--   awaiting_input → 已接受 / 进行中
--   completed   → 已递交
--   cancelled   → 已拒绝

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS mission_source TEXT;

-- Allow assignments to have no assignee (mission lands on this CEO directly,
-- not pre-routed to any virtual_agent). The desk_id remains required.
ALTER TABLE assignments
  ALTER COLUMN assigned_to_agent_id DROP NOT NULL;

-- Seed a couple of placeholder missions so the inbox isn't empty in dev.
-- Idempotent: only inserts if no inbound missions exist yet.
DO $$
DECLARE
  ceo_desk UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM assignments WHERE origin = 'inbound') THEN
    INSERT INTO assignments (desk_id, title, prompt, status, origin, mission_source, budget_limit)
    VALUES
      (
        ceo_desk,
        'Q2 季度品牌升级 — 主导整体方向',
        '联合创始人会议结论：Q2 重点是品牌升级。'
        || E'\n\n目标：'
        || E'\n- 新视觉系统落地（含 logo / 品牌色 / 字体）'
        || E'\n- 三个核心渠道（小红书 / 公众号 / 官网）的内容改版'
        || E'\n- 6 月底前完成第一轮发布'
        || E'\n\n时间线：5/14 启动 → 6/15 内审 → 6/28 对外。'
        || E'\n\n请拆解给市场总监、设计师、文案，按周述职。',
        'queued',
        'inbound',
        '联合创始人 · 王总',
        20.0
      ),
      (
        ceo_desk,
        '准备 5/20 投资人 update',
        '本月投资人月报：'
        || E'\n\n- 数据：MAU / 留存 / 收入'
        || E'\n- 重点进展（新产品线，关键合作）'
        || E'\n- 风险与请求'
        || E'\n\n截止 5/19 23:00 前发邮件版 + Notion 链接。',
        'queued',
        'inbound',
        '董事会',
        15.0
      );
  END IF;
END $$;
