#!/usr/bin/env bash
# V3 peer-network demo — one-shot orchestration.
#
# What this does:
#   1. Ensures apps/web-peer/ exists (rsync from apps/web/ excluding .next/node_modules)
#   2. Symlinks node_modules so both instances share deps
#   3. Starts instance A (dev mode) on port 3000 with default desk
#   4. Starts instance B (dev mode) on port 3001 with peer desk
#   5. Runs "$ROOT/scripts/v3_e2e.sh" which exercises the full A→B→A roundtrip
#   6. Leaves both instances running so you can poke around the UI
#
# To stop afterward:
#   pkill -f "next dev"

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT/apps/web"
PEER="$ROOT/apps/web-peer"

echo "=== 1. Sync apps/web-peer/ from apps/web/ ==="
rsync -a --delete \
  --exclude=node_modules --exclude=.next --exclude=.qa-screenshots --exclude=.playwright-cli \
  "$WEB/" "$PEER/"
if [ ! -L "$PEER/node_modules" ] && [ ! -d "$PEER/node_modules" ]; then
  ln -s "$WEB/node_modules" "$PEER/node_modules"
fi
echo "  done"

echo
echo "=== 2. Stop any prior dev/start servers ==="
pkill -f "next dev" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 2

echo
echo "=== 3. Start instance A (port 3000, default desk) ==="
( cd "$WEB" && nohup npm run dev > /tmp/v3-a.log 2>&1 < /dev/null & disown )
sleep 6
curl -fsS http://localhost:3000/api/v2/ceo > /dev/null
echo "  A up — CEO: $(curl -fsS http://localhost:3000/api/v2/ceo | python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])')"

echo
echo "=== 4. Start instance B (port 3001, peer desk) ==="
( cd "$PEER" && nohup env MIBUSY_DESK_ID=00000000-0000-0000-0000-000000000002 MIBUSY_PUBLIC_URL=http://localhost:3001 npx next dev -p 3001 > /tmp/v3-b.log 2>&1 < /dev/null & disown )
sleep 8
curl -fsS http://localhost:3001/api/v2/ceo > /dev/null
echo "  B up — CEO: $(curl -fsS http://localhost:3001/api/v2/ceo | python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])')"

echo
echo "=== 5. Run E2E test ==="
bash "$ROOT/scripts/v3_e2e.sh"

echo
echo "=== 6. Done ==="
echo "  Instance A: http://localhost:3000 (logs: /tmp/v3-a.log)"
echo "  Instance B: http://localhost:3001 (logs: /tmp/v3-b.log)"
echo "  To stop both: pkill -f 'next dev'"
