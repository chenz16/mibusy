#!/usr/bin/env python3
"""Apply 0002_v2_schema.sql to the Mibusy Postgres instance."""
import os
import pathlib
import psycopg

DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/solo_agent")
PROJECT_ROOT = pathlib.Path(os.environ.get("PROJECT_ROOT", pathlib.Path(__file__).parent.parent))
MIGRATION = PROJECT_ROOT / "packages/db/migrations/0002_v2_schema.sql"

print(f"Migration: {MIGRATION}")
sql = MIGRATION.read_text()

with psycopg.connect(DB_URL, autocommit=True) as conn:
    conn.execute(sql)
print("Migration applied.")

with psycopg.connect(DB_URL) as conn:
    tables = [r[0] for r in conn.execute(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name"
    ).fetchall()]
    print(f"\nAll tables ({len(tables)}): {', '.join(tables)}")

    staff = conn.execute(
        "SELECT name, kind, role FROM virtual_agents ORDER BY name"
    ).fetchall()
    print(f"\nVirtual agents seeded ({len(staff)}):")
    for name, kind, role in staff:
        print(f"  {name:12s} kind={kind:<18s} role={role}")

    desks = conn.execute("SELECT name, function FROM desks").fetchall()
    print(f"\nDesks ({len(desks)}): {desks}")
