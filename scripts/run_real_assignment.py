#!/usr/bin/env python3
"""Run a real assignment through the Orchestrator and persist to Postgres."""
import json
import os
import sys
import uuid
from typing import Any

import psycopg
from psycopg.rows import dict_row

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../apps/worker/src"))
from solo_agent_worker.orchestrator import AssignmentStore, Orchestrator

DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/solo_agent")

# Fixed seed IDs from 0002_v2_schema.sql
CEO_DESK_ID   = "00000000-0000-0000-0000-000000000001"
ATLAS_ID      = "00000000-0000-0000-0001-000000000001"
WORKSPACE_ID  = "00000000-0000-0000-0000-000000000001"


class PostgresAssignmentStore:
    def __init__(self, conn: psycopg.Connection) -> None:
        self.conn = conn

    def create_assignment(self, data: dict[str, Any]) -> dict[str, Any]:
        self.conn.execute("""
            INSERT INTO assignments
              (id, workspace_id, desk_id, title, prompt,
               assigned_to_agent_id, created_by_user_id,
               parent_assignment_id, root_assignment_id,
               status, budget_limit)
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
            "SELECT * FROM assignments WHERE id = %s", (assignment_id,)
        ).fetchone()
        return dict(row) if row else None

    def update_assignment_status(self, assignment_id: str, status: str) -> None:
        self.conn.execute(
            "UPDATE assignments SET status = %s, updated_at = NOW() WHERE id = %s",
            (status, assignment_id),
        )
        self.conn.commit()

    def append_assignment_event(
        self, *, assignment_id: str, seq: int, kind: str, payload: dict[str, Any]
    ) -> None:
        self.conn.execute("""
            INSERT INTO assignment_events (assignment_id, seq, kind, payload)
            VALUES (%s, %s, %s, %s)
        """, (assignment_id, seq, kind, json.dumps(payload)))
        self.conn.commit()

    def create_deliverable(self, data: dict[str, Any]) -> dict[str, Any]:
        deliverable_id = str(uuid.uuid4())
        self.conn.execute("""
            INSERT INTO deliverables
              (id, assignment_id, workspace_id, desk_id,
               title, body, format, created_by_agent_id)
            VALUES
              (%s, %s, %s, %s, %s, %s, %s, %s)
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


def main() -> None:
    print("=== Mibusy: Real assignment → DB ===\n")

    with psycopg.connect(DB_URL, row_factory=dict_row) as conn:
        store = PostgresAssignmentStore(conn)
        orch  = Orchestrator(store)

        print("1. Creating assignment...")
        assignment = orch.create_assignment(
            workspace_id=WORKSPACE_ID,
            desk_id=CEO_DESK_ID,
            agent_id=ATLAS_ID,
            title="K-12 Robotics Market Briefing",
            prompt=(
                "Write a 3-bullet executive briefing on K-12 robotics market "
                "opportunities in California for 2026. Include market size, "
                "top segments, and the one CEO decision needed."
            ),
            budget_limit=1.0,
        )
        print(f"   Assignment ID: {assignment['id']}")
        print(f"   Status: {assignment['status']}\n")

        print("2. Running assignment via Hermes AIAgent (this takes ~15–30s)...")
        result = orch.run_assignment(assignment["id"])

        print(f"\n3. Result:")
        print(f"   Status:       {result['status']}")
        print(f"   Events saved: {result['events_count']}")
        if result["deliverable"]:
            d = result["deliverable"]
            print(f"   Deliverable:  {d.get('id', '?')}")
            print(f"\n{'='*60}")
            print(d["body"][:800])
            print(f"{'='*60}")
        else:
            print("   No deliverable (agent may have failed)")

        print("\n4. Verifying DB rows...")
        rows = conn.execute(
            "SELECT seq, kind FROM assignment_events WHERE assignment_id = %s ORDER BY seq",
            (assignment["id"],),
        ).fetchall()
        print(f"   assignment_events: {[r['kind'] for r in rows]}")

        d_count = conn.execute(
            "SELECT COUNT(*) as n FROM deliverables WHERE assignment_id = %s",
            (assignment["id"],),
        ).fetchone()
        print(f"   deliverables:      {d_count['n']} row(s)")

        a_status = conn.execute(
            "SELECT status FROM assignments WHERE id = %s",
            (assignment["id"],),
        ).fetchone()
        print(f"   assignments:       status = {a_status['status']}")

    print("\n=== Done ===")


if __name__ == "__main__":
    main()
