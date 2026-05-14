#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PYTHON="$PROJECT_ROOT/.venv/bin/python3"
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/solo_agent}"
export PROJECT_ROOT

echo "=== Step 1: Start Postgres ==="

# Remove old container if stopped
if sudo docker ps -a --format '{{.Names}}' | grep -q "^mibusy-db$"; then
  STATE=$(sudo docker inspect -f '{{.State.Status}}' mibusy-db)
  if [ "$STATE" = "running" ]; then
    echo "Container mibusy-db already running."
  else
    echo "Removing stopped container mibusy-db..."
    sudo docker rm mibusy-db
    sudo docker run -d \
      --name mibusy-db \
      -e POSTGRES_DB=solo_agent \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=postgres \
      -p 5432:5432 \
      pgvector/pgvector:pg16
  fi
else
  echo "Starting new container mibusy-db..."
  sudo docker run -d \
    --name mibusy-db \
    -e POSTGRES_DB=solo_agent \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -p 5432:5432 \
    pgvector/pgvector:pg16
fi

echo ""
echo "=== Step 2: Wait for Postgres to be ready ==="
for i in $(seq 1 30); do
  if "$VENV_PYTHON" -c "
import psycopg, os, sys
try:
    psycopg.connect(os.environ['DATABASE_URL'], connect_timeout=2).close()
    sys.exit(0)
except:
    sys.exit(1)
" 2>/dev/null; then
    echo "Postgres is ready (attempt $i)."
    break
  fi
  echo "  waiting... ($i/30)"
  sleep 2
done

echo ""
echo "=== Step 3: Apply 0001_init.sql (if needed) ==="
"$VENV_PYTHON" - <<PYEOF
import psycopg, os, pathlib

db_url = os.environ["DATABASE_URL"]
root = pathlib.Path(os.environ["PROJECT_ROOT"])

with psycopg.connect(db_url) as conn:
    tables = [r[0] for r in conn.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
    ).fetchall()]

if "users" not in tables:
    print("Applying 0001_init.sql...")
    sql = (root / "packages/db/migrations/0001_init.sql").read_text()
    with psycopg.connect(db_url, autocommit=True) as conn:
        conn.execute(sql)
    print("0001 applied.")
else:
    print("0001 already applied (users table exists).")
PYEOF

echo ""
echo "=== Step 4: Apply 0002_v2_schema.sql ==="
"$VENV_PYTHON" - <<PYEOF
import psycopg, os, pathlib

db_url = os.environ["DATABASE_URL"]
root = pathlib.Path(os.environ["PROJECT_ROOT"])

with psycopg.connect(db_url) as conn:
    tables = [r[0] for r in conn.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
    ).fetchall()]

if "virtual_agents" not in tables:
    print("Applying 0002_v2_schema.sql...")
    sql = (root / "packages/db/migrations/0002_v2_schema.sql").read_text()
    with psycopg.connect(db_url, autocommit=True) as conn:
        conn.execute(sql)
    print("0002 applied.")
else:
    print("0002 already applied (virtual_agents table exists).")

# Verify seeds
with psycopg.connect(db_url) as conn:
    all_tables = sorted([r[0] for r in conn.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
    ).fetchall()])
    print(f"\nAll tables ({len(all_tables)}): {', '.join(all_tables)}")

    staff = conn.execute("SELECT name, kind, role FROM virtual_agents ORDER BY name").fetchall()
    print(f"\nVirtual agents ({len(staff)} seeded):")
    for name, kind, role in staff:
        print(f"  {name:12s}  kind={kind:<20s} role={role}")

    desks = conn.execute("SELECT name, function FROM desks").fetchall()
    print(f"\nDesks ({len(desks)}): {[(d[0], d[1]) for d in desks]}")
PYEOF

echo ""
echo "=== All done! ==="
