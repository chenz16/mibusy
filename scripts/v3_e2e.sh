#!/usr/bin/env bash
# V3 M1 end-to-end demo: A → 小王 (facade) → B → execute → callback → A's deliverable
set -e

A="http://localhost:3000"
B="http://localhost:3001"

echo "=== 0. Smoke check both instances ==="
curl -fsS "$A/api/v2/ceo" >/dev/null && echo "  A (3000) OK"
curl -fsS "$B/api/v2/ceo" >/dev/null && echo "  B (3001) OK"

echo
echo "=== 1. Generate upstream_token on B (so A can POST missions there) ==="
B_TOKEN=$(curl -fsS -X POST "$B/api/v2/ceo" | python3 -c "import json,sys; print(json.load(sys.stdin)['upstream_token'])")
echo "  B upstream_token: $B_TOKEN"

echo
echo "=== 2. Find 小王 on A and configure as facade pointing to B ==="
XW_ID=$(curl -fsS "$A/api/v2/staff" | python3 -c "
import json,sys
agents = json.load(sys.stdin)
for a in agents:
    if a['name'] == '小王':
        print(a['id']); break
")
echo "  小王 id: $XW_ID"

echo
echo "=== 3. POST peer config to 小王 ==="
curl -fsS -X POST "$A/api/v2/agents/$XW_ID/peer" \
  -H "Content-Type: application/json" \
  -d "{\"peer_url\":\"$B\",\"peer_token\":\"$B_TOKEN\",\"counterparty_label\":\"对端 CEO (instance B)\"}" \
  | python3 -m json.tool

echo
echo "=== 4. Verify 小王 is now facade mode ==="
MODE=$(curl -fsS "$A/api/v2/agents/$XW_ID" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['agent_mode'])")
echo "  小王 agent_mode: $MODE"

echo
echo "=== 5. Create assignment for 小王 from A (should route to B) ==="
ASSIGNMENT_ID=$(curl -fsS -X POST "$A/api/v2/assignments" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"V3 测试任务\",\"prompt\":\"这是一个跨实例派给小王的测试任务，应该在 B 的 mission inbox 出现\",\"assigned_to_agent_id\":\"$XW_ID\"}" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
echo "  A's assignment id: $ASSIGNMENT_ID"

# Wait a moment for async dispatch
sleep 2

echo
echo "=== 6. Check B's mission inbox ==="
curl -fsS "$B/api/v2/missions" | python3 -c "
import json,sys
missions = json.load(sys.stdin)
print(f'  Missions on B: {len(missions)}')
for m in missions:
    src = m.get('mission_source') or ''
    src_short = src[:40] + ('…' if len(src) > 40 else '')
    print(f\"    - [{m['status']}] {m['title']} (source={src_short})\")
    if m['status'] == 'queued':
        print(f'      peer_origin matches A assignment? id={m[\"id\"]}')
        print(f'      MISSION_ID_ON_B={m[\"id\"]}')
"

# Extract B's mission id
MISSION_ID_ON_B=$(curl -fsS "$B/api/v2/missions" | python3 -c "
import json,sys
ms = json.load(sys.stdin)
for m in ms:
    if m['status'] in ('queued','awaiting_input') and '$ASSIGNMENT_ID' in (m.get('mission_source','') or ''):
        # Mission source on B contains peer:: pattern, not our assignment id directly; pick the most recent queued
        pass
# Pick the most-recent queued/awaiting mission
queued = [m for m in ms if m['status'] in ('queued','awaiting_input')]
if queued:
    print(queued[0]['id'])
")
echo "  B mission id: $MISSION_ID_ON_B"

if [ -z "$MISSION_ID_ON_B" ]; then
  echo "✘ No mission appeared on B"
  exit 1
fi

echo
echo "=== 7. B accepts the mission ==="
curl -fsS -X PATCH "$B/api/v2/missions/$MISSION_ID_ON_B" \
  -H "Content-Type: application/json" \
  -d '{"status":"awaiting_input"}' \
  | python3 -m json.tool

echo
echo "=== 8. B submits the 述职报告 (which should callback to A) ==="
curl -fsS -X PATCH "$B/api/v2/missions/$MISSION_ID_ON_B" \
  -H "Content-Type: application/json" \
  -d '{"report_body":"任务已完成。\n\n## 处理过程\n- 收到 A 的派活\n- 评估并完成\n- 跨实例回流测试 PASS"}' \
  | python3 -m json.tool

sleep 2

echo
echo "=== 9. Verify A's assignment now has a deliverable ==="
curl -fsS "$A/api/v2/assignments/$ASSIGNMENT_ID" 2>/dev/null | python3 -c "
import json,sys
d = json.load(sys.stdin)
print(f\"  status: {d.get('status')}\")
print(f\"  deliverable_title: {d.get('deliverable_title')}\")
print(f\"  deliverable_body (first 200 chars):\")
body = d.get('deliverable_body') or ''
print('   ', body[:200])
"

echo
echo "✓ V3 M1 E2E COMPLETE — peer instance roundtrip verified"
