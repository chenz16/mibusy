#!/usr/bin/env bash
# One-command startup: DB → migrate → web → worker
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
PROJECT_ROOT="$(pwd)"
VENV_PYTHON="$PROJECT_ROOT/.venv/bin/python3"
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/solo_agent"

# ── 1. Postgres ────────────────────────────────────────────────────────────────
echo "▶ Starting Postgres..."
if sudo docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^mibusy-db$"; then
  STATE=$(sudo docker inspect -f '{{.State.Status}}' mibusy-db 2>/dev/null || echo "missing")
  if [ "$STATE" = "running" ]; then
    echo "  already running."
  else
    sudo docker rm mibusy-db 2>/dev/null || true
    sudo docker run -d --name mibusy-db \
      -e POSTGRES_DB=solo_agent -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
      -p 5432:5432 pgvector/pgvector:pg16
  fi
else
  sudo docker run -d --name mibusy-db \
    -e POSTGRES_DB=solo_agent -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
    -p 5432:5432 pgvector/pgvector:pg16
fi

echo "  Waiting for Postgres..."
for i in $(seq 1 30); do
  if "$VENV_PYTHON" -c "
import psycopg, os, sys
try:
    psycopg.connect(os.environ['DATABASE_URL'], connect_timeout=2).close()
    sys.exit(0)
except: sys.exit(1)
" 2>/dev/null; then
    echo "  ready (${i}s)."; break
  fi
  sleep 1
done

# ── 2. Migrate ─────────────────────────────────────────────────────────────────
echo "▶ Applying migrations..."
"$VENV_PYTHON" - <<'PYEOF'
import psycopg, os, pathlib, sys

db_url = os.environ["DATABASE_URL"]
root = pathlib.Path(os.environ.get("PROJECT_ROOT", "."))

with psycopg.connect(db_url) as conn:
    tables = {r[0] for r in conn.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
    ).fetchall()}

def apply(path: pathlib.Path, marker: str) -> None:
    if marker not in tables:
        print(f"  Applying {path.name}...")
        with psycopg.connect(db_url, autocommit=True) as conn:
            conn.execute(path.read_text())
        print(f"  {path.name} done.")
    else:
        print(f"  {path.name} already applied.")

apply(root / "packages/db/migrations/0001_init.sql", "users")
apply(root / "packages/db/migrations/0002_v2_schema.sql", "virtual_agents")
apply(root / "packages/db/migrations/0003_groups.sql", "agent_groups")

def apply_sql(path: pathlib.Path, check_sql: str) -> None:
    with psycopg.connect(db_url) as conn:
        already = conn.execute(check_sql).fetchone()[0]
    if not already:
        print(f"  Applying {path.name}...")
        with psycopg.connect(db_url, autocommit=True) as conn:
            conn.execute(path.read_text())
        print(f"  {path.name} done.")
    else:
        print(f"  {path.name} already applied.")

apply_sql(
    root / "packages/db/migrations/0004_system_flag.sql",
    "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='virtual_agents' AND column_name='is_system')"
)

# Verify
with psycopg.connect(db_url) as conn:
    staff = conn.execute("SELECT name FROM virtual_agents ORDER BY name").fetchall()
    print(f"  Staff seeded: {[r[0] for r in staff]}")
PYEOF

# ── 3. Web env ─────────────────────────────────────────────────────────────────
echo "DATABASE_URL=$DATABASE_URL" > apps/web/.env.local
echo "▶ apps/web/.env.local written."

# ── 4. Web dev server ──────────────────────────────────────────────────────────
if lsof -i :3000 -sTCP:LISTEN -t &>/dev/null; then
  echo "▶ Web server already on :3000."
else
  echo "▶ Starting web dev server on :3000 (background)..."
  (cd apps/web && DATABASE_URL="$DATABASE_URL" pnpm dev > /tmp/mibusy-web.log 2>&1) &
  WEB_PID=$!
  echo "  PID $WEB_PID  logs: /tmp/mibusy-web.log"
  sleep 3
fi

# ── 5. V2 Worker ───────────────────────────────────────────────────────────────
echo "▶ Starting V2 Hermes worker..."
export HERMES_PROVIDER="${HERMES_PROVIDER:-deepseek}"
# Load API keys from ~/.hermes/.env
if [ -f "$HOME/.hermes/.env" ]; then
  set -a; source "$HOME/.hermes/.env"; set +a
fi
echo "  DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY:0:12}..."
PYTHONPATH="$PROJECT_ROOT/apps/worker/src" "$VENV_PYTHON" -m solo_agent_worker.v2_worker
