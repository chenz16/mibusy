#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATION_FILE="$PROJECT_ROOT/packages/db/migrations/0002_v2_schema.sql"
VENV_PYTHON="$PROJECT_ROOT/.venv/bin/python3"
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/solo_agent}"
export PROJECT_ROOT

echo "=== Mibusy: Apply 0002_v2_schema.sql ==="
echo "Project root: $PROJECT_ROOT"
echo "Database: $DATABASE_URL"

# Check if DB is accessible
check_db() {
  "$VENV_PYTHON" -c "
import psycopg, os, sys
try:
    psycopg.connect(os.environ['DATABASE_URL'], connect_timeout=2).close()
    sys.exit(0)
except:
    sys.exit(1)
" 2>/dev/null
}

if ! check_db; then
  echo "Postgres not running — starting via docker compose..."
  (cd "$PROJECT_ROOT" && sudo docker compose up -d db)
  echo "Waiting for Postgres to be ready..."
  for i in $(seq 1 20); do
    if check_db; then
      echo "Postgres is ready."
      break
    fi
    echo "  attempt $i/20..."
    sleep 2
  done
else
  echo "Postgres already running."
fi

# Apply migration and verify
"$VENV_PYTHON" "$SCRIPT_DIR/apply_migration.py"

echo ""
echo "=== Done ==="
