-- Migration 0019: Seed a second CEO desk for the peer instance (V3 M0).
--
-- Instance A uses 0000...0001 (the original CEO desk).
-- Instance B uses 0000...0002 (this row).
-- Both can run on the same DB simultaneously, isolated by MIBUSY_DESK_ID env.
--
-- The peer desk also gets a full set of built-in system agents (Atlas, Nova,
-- Ledger, Quill, Scheduler, Beacon) so the instance is functional out of the
-- box. We use different agent UUIDs so there's no FK collision.

INSERT INTO desks (id, name, function, status, ceo_name, ceo_role, ceo_system_prompt, ceo_monthly_budget)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Peer CEO Desk',
  'general',
  'active',
  '对端 CEO',
  'CEO',
  '我是对端实例的 CEO（V3 测试用）。可以是模拟另一个真人或者用来当代理目标。',
  500.00
)
ON CONFLICT (id) DO NOTHING;

-- System agents for peer desk (UUIDs differ from instance A by last byte)
INSERT INTO virtual_agents (id, desk_id, name, role, kind, status, is_system, system_prompt, monthly_budget)
VALUES
  ('00000000-0000-0000-0002-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'Atlas', 'Chief of Staff', 'chief_of_staff', 'active', true, NULL, 50.00),
  ('00000000-0000-0000-0002-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'Nova', 'Research Specialist', 'specialist', 'active', true, NULL, 50.00),
  ('00000000-0000-0000-0002-000000000003'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'Ledger', 'Analyst', 'specialist', 'active', true, NULL, 50.00),
  ('00000000-0000-0000-0002-000000000004'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'Quill', 'Writer', 'specialist', 'active', true, NULL, 50.00),
  ('00000000-0000-0000-0002-000000000005'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'Scheduler', 'Scheduler', 'specialist', 'active', true, NULL, 50.00),
  ('00000000-0000-0000-0002-000000000006'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'Beacon', 'System · 自学习 & 调试', 'specialist', 'active', true, NULL, 50.00)
ON CONFLICT (id) DO NOTHING;
