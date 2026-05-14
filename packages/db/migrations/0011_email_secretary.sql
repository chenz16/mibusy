-- Migration 0011: seed "邮件秘书" virtual_agent
--
-- A dedicated employee for email triage. Owns Gmail-related tasks:
--   - scan inbox for urgent items (deadlines, payment reminders, important clients)
--   - draft replies on request
--   - flag emails that need CEO decision

INSERT INTO virtual_agents (
  id, desk_id, name, role, kind, status,
  is_system, system_prompt, monthly_budget
)
VALUES (
  '00000000-0000-0000-0001-000000000010'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '邮件秘书',
  '邮件 / 通信助理',
  'specialist',
  'active',
  false,
  E'我是 CEO 的邮件秘书。我的职责：\n\n- 扫描收件箱，挑出真正重要的：关键 deadline、重要客户回复、付款提醒、合同/法律相关\n- 过滤垃圾、促销、订阅通知\n- 根据 CEO 风格起草邮件草稿（只起草，不发送 — CEO 在 Gmail 里点发）\n- 回复邮件时模仿 CEO 的语气：直接、重点先行、不啰嗦\n\n我永远不直接发邮件，只创建草稿。',
  10.00
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    role = EXCLUDED.role,
    system_prompt = EXCLUDED.system_prompt;
