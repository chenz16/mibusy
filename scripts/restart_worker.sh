#!/bin/bash
cd "$(dirname "$0")/.."

# Kill existing workers
kill $(pgrep -f "v2_worker") 2>/dev/null || true

sleep 1

# Start fresh
export PYTHONPATH="$PWD/apps/worker/src"
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/solo_agent"

nohup .venv/bin/python3 -m solo_agent_worker.v2_worker > /tmp/mibusy-worker.log 2>&1 &
echo "Worker started, PID $!"
echo "Log: tail -f /tmp/mibusy-worker.log"
