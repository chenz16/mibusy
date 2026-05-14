"""V2 worker: polls assignments table, runs via Hermes Orchestrator."""
from __future__ import annotations

import json
import logging
import os
import pathlib

import time
import uuid
from typing import Any

import psycopg
from psycopg.rows import dict_row

# Load API keys from ~/.hermes/.env if not already set
_hermes_env = pathlib.Path.home() / ".hermes" / ".env"
if _hermes_env.exists():
    for line in _hermes_env.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, val = line.partition("=")
            if key.strip() not in os.environ:
                os.environ[key.strip()] = val.strip()

from .orchestrator import Orchestrator  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [worker] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


class PostgresAssignmentStore:
    def __init__(self, conn: psycopg.Connection) -> None:
        self.conn = conn

    def create_assignment(self, data: dict[str, Any]) -> dict[str, Any]:
        self.conn.execute("""
            INSERT INTO assignments
              (id, workspace_id, desk_id, title, prompt,
               assigned_to_agent_id, created_by_user_id,
               parent_assignment_id, root_assignment_id, status, budget_limit)
            VALUES
              (%(id)s, %(workspace_id)s, %(desk_id)s, %(title)s, %(prompt)s,
               %(assigned_to_agent_id)s, %(created_by_user_id)s,
               %(parent_assignment_id)s, %(root_assignment_id)s,
               %(status)s, %(budget_limit)s)
        """, data)
        self.conn.commit()
        return data

    def get_assignment(self, assignment_id: str) -> dict[str, Any] | None:
        row = self.conn.execute(
            "SELECT * FROM assignments WHERE id = %s", (assignment_id,),
        ).fetchone()
        return dict(row) if row else None

    def update_assignment_status(self, assignment_id: str, status: str) -> None:
        self.conn.execute(
            "UPDATE assignments SET status = %s, updated_at = NOW() WHERE id = %s",
            (status, assignment_id),
        )
        self.conn.commit()

    def clear_assignment_events(self, assignment_id: str) -> None:
        self.conn.execute(
            "DELETE FROM assignment_events WHERE assignment_id = %s", (assignment_id,)
        )
        self.conn.commit()

    def append_assignment_event(
        self, *, assignment_id: str, seq: int, kind: str, payload: dict[str, Any]
    ) -> None:
        self.conn.execute(
            "INSERT INTO assignment_events (assignment_id, seq, kind, payload) VALUES (%s,%s,%s,%s)",
            (assignment_id, seq, kind, json.dumps(payload)),
        )
        self.conn.commit()

    def create_deliverable(self, data: dict[str, Any]) -> dict[str, Any]:
        deliverable_id = str(uuid.uuid4())
        self.conn.execute("""
            INSERT INTO deliverables
              (id, assignment_id, workspace_id, desk_id, title, body, format, created_by_agent_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            deliverable_id,
            data["assignment_id"],
            data.get("workspace_id"),
            data.get("desk_id"),
            data["title"],
            data["body"],
            data.get("format", "markdown"),
            data.get("created_by_agent_id"),
        ))
        self.conn.commit()
        return {**data, "id": deliverable_id}


_MEETING_RE = __import__("re").compile(
    r"\[MEETING_REQUEST:\s*([^|]+?)(?:\s*\|\s*participants=([^\]]+))?\s*\]",
    __import__("re").IGNORECASE,
)


def _maybe_request_meeting(conn: psycopg.Connection, assignment_id: str) -> None:
    """If the latest deliverable for this assignment contains a meeting request
    marker, create a pending meeting via the web API and strip the marker."""
    import os as _os
    import json as _json
    import urllib.request as _ur
    import urllib.error as _uerr

    row = conn.execute(
        "SELECT id, body, assignment_id FROM deliverables WHERE assignment_id = %s ORDER BY created_at DESC LIMIT 1",
        (assignment_id,),
    ).fetchone()
    if not row or not row.get("body"):
        return

    body = row["body"]
    m = _MEETING_RE.search(body)
    if not m:
        return

    reason = (m.group(1) or "").strip()
    parts_raw = (m.group(2) or "").strip()
    participants = [p.strip() for p in parts_raw.split(",") if p.strip()] if parts_raw else []

    # Find the agent who owns this assignment + a topic
    a = conn.execute(
        "SELECT title, assigned_to_agent_id FROM assignments WHERE id = %s",
        (assignment_id,),
    ).fetchone()
    if not a:
        return

    # Resolve participant names → ids
    participant_ids: list[str] = []
    if participants:
        rows = conn.execute(
            "SELECT id::text, name FROM virtual_agents WHERE name = ANY(%s) AND status = 'active'",
            (participants,),
        ).fetchall()
        participant_ids = [r["id"] for r in rows]
    # Always include the initiator agent
    if a.get("assigned_to_agent_id") and str(a["assigned_to_agent_id"]) not in participant_ids:
        participant_ids.append(str(a["assigned_to_agent_id"]))

    if not participant_ids:
        return

    web_url = _os.getenv("MIBUSY_WEB_URL", "http://localhost:3000")
    payload = {
        "topic": f"{a['title']} — 需要讨论",
        "agenda": reason,
        "initiator_kind": "agent",
        "initiator_agent_id": str(a["assigned_to_agent_id"]) if a.get("assigned_to_agent_id") else None,
        "initiator_assignment_id": assignment_id,
        "complexity_reason": reason,
        "participant_agent_ids": participant_ids,
    }
    try:
        req = _ur.Request(
            f"{web_url}/api/v2/meetings",
            data=_json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with _ur.urlopen(req, timeout=10) as resp:
            resp.read()
    except _uerr.URLError:
        return

    # Strip the marker from the deliverable so users don't see it
    new_body = _MEETING_RE.sub("", body).strip()
    conn.execute(
        "UPDATE deliverables SET body = %s WHERE id = %s",
        (new_body, row["id"]),
    )
    conn.commit()


def claim_queued_assignment(conn: psycopg.Connection) -> dict[str, Any] | None:
    # Skip 'inbound' missions — those are CEO's incoming work from upstream,
    # not for the worker to execute. The CEO handles them manually
    # (accept → break down into subtasks → submit 述职报告).
    row = conn.execute("""
        UPDATE assignments
        SET status = 'running', updated_at = NOW()
        WHERE id = (
            SELECT id FROM assignments
            WHERE status = 'queued'
              AND COALESCE(origin, 'ceo') <> 'inbound'
              AND assigned_to_agent_id IS NOT NULL
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING id::text, title, prompt, assigned_to_agent_id::text,
                  desk_id::text, workspace_id::text
    """).fetchone()
    conn.commit()
    return dict(row) if row else None


def run_worker(db_url: str, poll_seconds: float = 5.0) -> None:
    log.info("V2 Worker starting. DB: %s", db_url.split("@")[-1])
    log.info("HERMES_PROVIDER=%s  DEEPSEEK_KEY=%s",
             os.getenv("HERMES_PROVIDER", "deepseek"),
             "set" if os.getenv("DEEPSEEK_API_KEY") else "MISSING")

    with psycopg.connect(db_url, row_factory=dict_row, autocommit=False) as conn:
        # On startup, reset any tasks stuck in 'running' (left over from crashed workers)
        conn.execute("""
            UPDATE assignments SET status = 'queued', updated_at = NOW()
            WHERE status = 'running'
              AND updated_at < NOW() - INTERVAL '30 minutes'
        """)
        conn.commit()
        log.info("Startup cleanup done.")

        store = PostgresAssignmentStore(conn)
        orc = Orchestrator(store)

        while True:
            try:
                row = claim_queued_assignment(conn)
                if row is None:
                    time.sleep(poll_seconds)
                    continue

                aid = row["id"]
                log.info("▶ Running assignment %s  %r", aid[:8], row["title"])

                # If the CEO desk has a workspace_dir configured, chdir there so
                # Hermes' file tools operate inside the user's sandbox. Restored
                # after the run so the worker's own state isn't disturbed.
                _wsdir = None
                if row.get("desk_id"):
                    _ws = conn.execute(
                        "SELECT workspace_dir FROM desks WHERE id = %s",
                        (row["desk_id"],),
                    ).fetchone()
                    _wsdir = (_ws or {}).get("workspace_dir") if _ws else None
                _prev_cwd = None
                if _wsdir:
                    import os as _os
                    _expanded = _os.path.expanduser(_wsdir)
                    if _os.path.isdir(_expanded):
                        _prev_cwd = _os.getcwd()
                        try:
                            _os.chdir(_expanded)
                            log.info("  workspace: %s", _expanded)
                        except OSError as e:
                            log.warning("  could not chdir to %s: %s", _expanded, e)
                            _prev_cwd = None

                try:
                    result = orc.run_assignment(aid)
                finally:
                    if _prev_cwd:
                        import os as _os
                        _os.chdir(_prev_cwd)
                log.info("✓ Done %s — status=%s  events=%d",
                         aid[:8], result["status"], result.get("events_count", 0))

                # Post-process: if the agent's deliverable contains
                # [MEETING_REQUEST: reason | participants=A,B,C], spawn a meeting
                # request via the web API. Marker is stripped from deliverable.
                _maybe_request_meeting(conn, aid)

            except KeyboardInterrupt:
                log.info("Worker stopped.")
                break
            except Exception as exc:
                log.exception("Worker error: %s", exc)
                try:
                    conn.rollback()
                except Exception:
                    pass
                time.sleep(poll_seconds)


def main() -> None:
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/solo_agent",
    )
    run_worker(db_url)


if __name__ == "__main__":
    main()
