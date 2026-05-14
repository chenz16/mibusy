#!/usr/bin/env python3
"""
Mibusy Local Runner — connects this machine as a worker node.

Usage:
  WORK_TOKEN=<your-token> SERVER_URL=http://localhost:3000 python3 runner.py

Executor options (set EXECUTOR env var):
  claude_code  — runs: claude --print "<prompt>"  (default)
  bash         — runs: bash -c "<prompt>"
  echo         — dev/test: echoes the prompt as deliverable
"""

import os
import subprocess
import time
import requests

WORK_TOKEN = os.environ["WORK_TOKEN"]
SERVER_URL = os.environ.get("SERVER_URL", "http://localhost:3000").rstrip("/")
EXECUTOR = os.environ.get("EXECUTOR", "claude_code")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "8"))
HEARTBEAT_INTERVAL = 30

def api(path: str, method="get", **kwargs):
    url = f"{SERVER_URL}/api/v2/work{path}"
    resp = getattr(requests, method)(url, timeout=15, **kwargs)
    resp.raise_for_status()
    return resp.json()

def execute(prompt: str) -> str:
    if EXECUTOR == "claude_code":
        result = subprocess.run(
            ["claude", "--print", prompt],
            capture_output=True, text=True, timeout=300,
        )
        return result.stdout.strip() or result.stderr.strip() or "(no output)"

    if EXECUTOR == "bash":
        result = subprocess.run(
            ["bash", "-c", prompt],
            capture_output=True, text=True, timeout=120,
        )
        return result.stdout.strip() or result.stderr.strip() or "(no output)"

    # echo — for testing
    return f"[echo] {prompt[:200]}"

def main():
    print(f"[runner] Connecting to {SERVER_URL} as token {WORK_TOKEN[:8]}…")
    last_heartbeat = 0

    while True:
        now = time.time()

        # Heartbeat + fetch next assignment in one call
        try:
            data = api(f"?token={WORK_TOKEN}")
            nxt = data.get("next")
            agent_name = data.get("agent", {}).get("name", "?")
            last_heartbeat = now
        except Exception as e:
            print(f"[runner] poll error: {e}")
            time.sleep(POLL_INTERVAL)
            continue

        if nxt:
            assignment_id = nxt["id"]
            title = nxt["title"]
            prompt = nxt["prompt"]
            print(f"[runner] [{agent_name}] task: {title}")

            try:
                api("/start", method="post", json={"token": WORK_TOKEN, "assignment_id": assignment_id})
                result = execute(prompt)
                api("/done", method="post", json={
                    "token": WORK_TOKEN,
                    "assignment_id": assignment_id,
                    "title": title,
                    "body": result,
                })
                print(f"[runner] delivered ({len(result)} chars)")
            except subprocess.TimeoutExpired:
                print("[runner] task timed out")
            except Exception as e:
                print(f"[runner] task error: {e}")
        else:
            # Only log occasionally when idle
            if now - last_heartbeat > HEARTBEAT_INTERVAL:
                print(f"[runner] [{agent_name}] idle, waiting…")

        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
