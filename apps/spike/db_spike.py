#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import threading
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import psycopg
from psycopg.rows import dict_row


DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/solo_agent",
)
APP_DATABASE_URL = os.environ.get(
    "APP_DATABASE_URL",
    "postgresql://app_user:app_password@localhost:5432/solo_agent",
)
ROOT = Path(__file__).resolve().parents[2]
MIGRATION_PATH = ROOT / "packages/db/migrations/0001_init.sql"


@dataclass(frozen=True)
class Seed:
    tenant_a: str
    tenant_b: str
    user_a: str
    session_a: str
    session_b: str


def connect(url: str = DATABASE_URL, *, autocommit: bool = False):
    return psycopg.connect(url, row_factory=dict_row, autocommit=autocommit)


def wait_for_db(timeout_seconds: int = 30) -> None:
    deadline = time.time() + timeout_seconds
    last_error: Exception | None = None
    while time.time() < deadline:
        try:
            with connect(autocommit=True) as conn:
                conn.execute("SELECT 1")
            return
        except psycopg.Error as exc:
            last_error = exc
            time.sleep(1)
    raise SystemExit(f"database did not become ready within {timeout_seconds}s: {last_error}")


def run_migration() -> None:
    wait_for_db()
    sql = MIGRATION_PATH.read_text()
    with connect(autocommit=True) as conn:
        conn.execute(sql)
    print(f"Applied migration: {MIGRATION_PATH}")


def run_preflight() -> None:
    wait_for_db()
    checks: list[tuple[str, bool, str]] = []
    with connect(autocommit=True) as conn:
        version = conn.execute("SHOW server_version").fetchone()
        checks.append(("postgres reachable", True, str(version["server_version"])))

        pgcrypto = conn.execute("SELECT 1 FROM pg_available_extensions WHERE name = 'pgcrypto'").fetchone()
        checks.append(("pgcrypto available", pgcrypto is not None, str(pgcrypto)))

        vector = conn.execute("SELECT 1 FROM pg_available_extensions WHERE name = 'vector'").fetchone()
        checks.append(("pgvector available", vector is not None, str(vector)))

        can_create_role = conn.execute(
            "SELECT rolsuper OR rolcreaterole AS can_create_role FROM pg_roles WHERE rolname = current_user"
        ).fetchone()
        can_create_app_user = bool(can_create_role and can_create_role["can_create_role"])
        checks.append(("migration role can create app_user", can_create_app_user, str(can_create_role)))

    print_result("DB preflight", checks)


def set_claims(conn: psycopg.Connection[Any], tenant_id: str, platform_role: str = "friend") -> None:
    claims = json.dumps({"tenant_id": tenant_id, "platform_role": platform_role})
    conn.execute("SELECT set_config('request.jwt.claims', %s, false)", (claims,))


def reset_data() -> None:
    with connect(autocommit=True) as conn:
        for table in [
            "session_events",
            "jobs",
            "billing_events",
            "schedules",
            "persona_facts",
            "topic_digests",
            "session_summaries",
            "inbox_items",
            "agent_sessions",
            "template_invocation_edges",
            "agent_templates",
            "invitations",
            "users",
            "tenants",
        ]:
            conn.execute(f"TRUNCATE {table} CASCADE")


def seed() -> Seed:
    reset_data()
    tenant_a = str(uuid.uuid4())
    tenant_b = str(uuid.uuid4())
    user_a = str(uuid.uuid4())
    session_a = str(uuid.uuid4())
    session_b = str(uuid.uuid4())

    with connect(autocommit=True) as conn:
        conn.execute(
            "INSERT INTO tenants(id, name) VALUES (%s, 'tenant-a'), (%s, 'tenant-b')",
            (tenant_a, tenant_b),
        )
        conn.execute(
            "INSERT INTO users(id, tenant_id, email, platform_role) VALUES (%s, %s, 'a@example.com', 'admin')",
            (user_a, tenant_a),
        )
        conn.execute(
            """
            INSERT INTO agent_sessions(id, tenant_id, root_session_id, initial_prompt)
            VALUES (%s, %s, %s, 'hello-a'), (%s, %s, %s, 'hello-b')
            """,
            (session_a, tenant_a, session_a, session_b, tenant_b, session_b),
        )
    return Seed(tenant_a, tenant_b, user_a, session_a, session_b)


def claim_count(conn: psycopg.Connection[Any], table: str) -> int:
    row = conn.execute(f"SELECT COUNT(*) AS count FROM {table}").fetchone()
    return int(row["count"])


def bootstrap_invite(code: str, email: str, auth_user_id: str) -> tuple[str, str]:
    with connect() as conn:
        invitation = conn.execute(
            """
            SELECT code, platform_role
            FROM invitations
            WHERE code = %s
              AND consumed_at IS NULL
              AND expires_at > NOW()
              AND (invitee_email IS NULL OR lower(invitee_email) = lower(%s))
            FOR UPDATE
            """,
            (code, email),
        ).fetchone()
        if invitation is None:
            raise ValueError("invalid, expired, consumed, or email-mismatched invitation")

        tenant_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO tenants(id, name) VALUES (%s, %s)",
            (tenant_id, f"{email.split('@')[0]} bootstrap"),
        )
        conn.execute(
            """
            INSERT INTO users(id, tenant_id, email, role, platform_role)
            VALUES (%s, %s, %s, 'owner', %s)
            """,
            (auth_user_id, tenant_id, email, invitation["platform_role"]),
        )
        conn.execute(
            """
            UPDATE invitations
            SET consumed_at = NOW(), consumed_by_user_id = %s
            WHERE code = %s
            """,
            (auth_user_id, code),
        )
        conn.commit()
        return tenant_id, auth_user_id


def run_v7() -> None:
    data = seed()
    code = "valid-invite"
    auth_user_id = str(uuid.uuid4())
    email = "new-user@example.com"

    with connect(autocommit=True) as conn:
        conn.execute(
            """
            INSERT INTO invitations(code, invited_by_user_id, invitee_email, platform_role)
            VALUES (%s, %s, %s, 'friend')
            """,
            (code, data.user_a, email),
        )

    tenant_id, user_id = bootstrap_invite(code, email, auth_user_id)

    with connect(autocommit=True) as conn:
        user_row = conn.execute(
            "SELECT tenant_id, email, role, platform_role FROM users WHERE id = %s",
            (user_id,),
        ).fetchone()
        invite_row = conn.execute(
            "SELECT consumed_at, consumed_by_user_id FROM invitations WHERE code = %s",
            (code,),
        ).fetchone()

    checks = [
        ("tenant created", bool(tenant_id), tenant_id),
        ("user created as tenant owner", user_row["tenant_id"] == tenant_id and user_row["role"] == "owner", str(user_row)),
        ("platform role inherited", user_row["platform_role"] == "friend", str(user_row)),
        ("invite consumed", invite_row["consumed_at"] is not None and invite_row["consumed_by_user_id"] == user_id, str(invite_row)),
    ]
    print_result("V7 signup bootstrap happy path", checks)


def run_v8() -> None:
    data = seed()
    expired_code = "expired-invite"
    used_code = "used-invite"
    invalid_code = "missing-invite"
    auth_user_id = str(uuid.uuid4())

    with connect(autocommit=True) as conn:
        conn.execute(
            """
            INSERT INTO invitations(code, invited_by_user_id, platform_role, expires_at)
            VALUES (%s, %s, 'friend', NOW() - INTERVAL '1 minute')
            """,
            (expired_code, data.user_a),
        )
        conn.execute(
            """
            INSERT INTO invitations(code, invited_by_user_id, platform_role, consumed_at, consumed_by_user_id)
            VALUES (%s, %s, 'friend', NOW(), %s)
            """,
            (used_code, data.user_a, data.user_a),
        )

    checks: list[tuple[str, bool, str]] = []
    for label, code in [
        ("expired invite rejected", expired_code),
        ("used invite rejected", used_code),
        ("invalid invite rejected", invalid_code),
    ]:
        before_tenants = count_table("tenants")
        before_users = count_table("users")
        try:
            bootstrap_invite(code, "blocked@example.com", auth_user_id)
            checks.append((label, False, "bootstrap unexpectedly succeeded"))
        except ValueError as exc:
            after_tenants = count_table("tenants")
            after_users = count_table("users")
            clean = before_tenants == after_tenants and before_users == after_users
            checks.append((label, clean, f"{exc}; clean={clean}"))

    print_result("V8 bootstrap exception paths", checks)


def count_table(table: str) -> int:
    with connect(autocommit=True) as conn:
        row = conn.execute(f"SELECT COUNT(*) AS count FROM {table}").fetchone()
        return int(row["count"])


def run_v11() -> None:
    data = seed()
    checks: list[tuple[str, bool, str]] = []

    with connect(APP_DATABASE_URL) as conn:
        set_claims(conn, data.tenant_a)

        visible = conn.execute("SELECT id FROM agent_sessions ORDER BY created_at").fetchall()
        checks.append(("read isolation", len(visible) == 1 and visible[0]["id"] == data.session_a, str(visible)))

        inserted = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO agent_sessions(id, tenant_id, root_session_id, initial_prompt) VALUES (%s, %s, %s, 'own-write')",
            (inserted, data.tenant_a, inserted),
        )
        conn.commit()
        set_claims(conn, data.tenant_a)
        checks.append(("write own tenant", True, inserted))

        try:
            conn.execute(
                "INSERT INTO agent_sessions(id, tenant_id, root_session_id, initial_prompt) VALUES (%s, %s, %s, 'cross-write')",
                (str(uuid.uuid4()), data.tenant_b, str(uuid.uuid4())),
            )
            checks.append(("write cross tenant", False, "insert unexpectedly succeeded"))
        except psycopg.errors.InsufficientPrivilege as exc:
            conn.rollback()
            set_claims(conn, data.tenant_a)
            checks.append(("write cross tenant", True, exc.__class__.__name__))

        checks.append(("list isolation", claim_count(conn, "agent_sessions") == 2, "tenant A sees own rows only"))

        aggregate = conn.execute("SELECT COUNT(*) AS count FROM agent_sessions").fetchone()
        checks.append(("aggregate isolation", int(aggregate["count"]) == 2, str(aggregate)))

        set_claims(conn, data.tenant_b)
        tampered = conn.execute("SELECT id FROM agent_sessions ORDER BY created_at").fetchall()
        checks.append(("jwt claim switch", len(tampered) == 1 and tampered[0]["id"] == data.session_b, str(tampered)))

    print_result("V11 RLS cross-tenant isolation", checks)


def run_all_db_checks() -> None:
    for check in [run_v7, run_v8, run_v9, run_v10, run_v11]:
        check()


def claim_job(conn: psycopg.Connection[Any], worker_id: str) -> str | None:
    row = conn.execute(
        """
        UPDATE jobs
        SET state = 'running',
            started_at = NOW(),
            worker_id = %s,
            attempts = attempts + 1
        WHERE id = (
          SELECT id
          FROM jobs
          WHERE state = 'pending' AND scheduled_for <= NOW()
          ORDER BY priority DESC, scheduled_for ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING id
        """,
        (worker_id,),
    ).fetchone()
    return None if row is None else str(row["id"])


def run_v10(workers: int = 8, jobs: int = 50) -> None:
    data = seed()
    with connect(autocommit=True) as conn:
        for index in range(jobs):
            conn.execute(
                "INSERT INTO jobs(tenant_id, kind, payload, priority) VALUES (%s, 'agent_session', %s, %s)",
                (data.tenant_a, json.dumps({"index": index}), 100 - index),
            )

    claimed: list[str] = []
    lock = threading.Lock()

    def worker(worker_index: int) -> None:
        worker_id = f"worker-{worker_index}"
        with connect() as conn:
            while True:
                job_id = claim_job(conn, worker_id)
                conn.commit()
                if job_id is None:
                    return
                with lock:
                    claimed.append(job_id)
                time.sleep(0.005)

    threads = [threading.Thread(target=worker, args=(index,)) for index in range(workers)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    unique_claims = set(claimed)
    checks = [
        ("all jobs claimed", len(claimed) == jobs, f"claimed={len(claimed)} jobs={jobs}"),
        ("no duplicate consumption", len(unique_claims) == jobs, f"unique={len(unique_claims)}"),
    ]
    print_result("V10 jobs SKIP LOCKED multi-worker pickup", checks)


def next_seq(conn: psycopg.Connection[Any], session_id: str) -> int:
    row = conn.execute(
        "SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM session_events WHERE session_id = %s",
        (session_id,),
    ).fetchone()
    return int(row["seq"])


def run_v9() -> None:
    data = seed()
    notifications: list[str] = []
    channel = "session_" + data.session_a.replace("-", "_")

    with connect(autocommit=True) as listener, connect(autocommit=True) as writer:
        listener.execute(f"LISTEN {channel}")
        for index in range(5):
            writer.execute(
                """
                INSERT INTO session_events(session_id, tenant_id, seq, kind, payload)
                VALUES (%s, %s, %s, 'status', %s)
                """,
                (
                    data.session_a,
                    data.tenant_a,
                    next_seq(writer, data.session_a),
                    json.dumps({"index": index}),
                ),
            )

        deadline = time.time() + 5
        while time.time() < deadline and len(notifications) < 5:
            listener.wait(0.5)
            for notify in listener.notifies():
                notifications.append(notify.payload)

    with connect() as conn:
        rows = conn.execute(
            "SELECT seq FROM session_events WHERE session_id = %s AND seq > 0 ORDER BY seq",
            (data.session_a,),
        ).fetchall()

    checks = [
        ("LISTEN/NOTIFY local delivery", len(notifications) == 5, str(notifications)),
        ("since replay query", [row["seq"] for row in rows] == [1, 2, 3, 4, 5], str(rows)),
    ]
    print_result("V9 local LISTEN/NOTIFY and since replay semantics", checks)


def print_result(title: str, checks: list[tuple[str, bool, str]]) -> None:
    print(f"\n{title}")
    failed = False
    for name, ok, detail in checks:
        failed = failed or not ok
        status = "PASS" if ok else "FAIL"
        print(f"- {status}: {name} ({detail})")
    if failed:
        raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Week 0 database spike checks")
    parser.add_argument("check", choices=["preflight", "migrate", "all", "v7", "v8", "v9", "v10", "v11"])
    args = parser.parse_args()

    if args.check == "preflight":
        run_preflight()
    elif args.check == "migrate":
        run_migration()
    elif args.check == "all":
        run_all_db_checks()
    elif args.check == "v7":
        run_v7()
    elif args.check == "v8":
        run_v8()
    elif args.check == "v9":
        run_v9()
    elif args.check == "v10":
        run_v10()
    elif args.check == "v11":
        run_v11()


if __name__ == "__main__":
    main()
