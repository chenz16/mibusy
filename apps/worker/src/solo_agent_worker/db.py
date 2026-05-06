from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

import psycopg
from psycopg.rows import dict_row


@dataclass(frozen=True)
class Job:
    id: str
    tenant_id: str
    kind: str
    payload: dict[str, Any]
    attempts: int


class Database:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    def connect(self, *, autocommit: bool = False):
        return psycopg.connect(self.database_url, row_factory=dict_row, autocommit=autocommit)

    def claim_job(self, worker_id: str) -> Job | None:
        with self.connect() as conn:
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
                RETURNING id, tenant_id, kind, payload, attempts
                """,
                (worker_id,),
            ).fetchone()
            conn.commit()

        if row is None:
            return None
        return Job(
            id=str(row["id"]),
            tenant_id=str(row["tenant_id"]),
            kind=str(row["kind"]),
            payload=dict(row["payload"]),
            attempts=int(row["attempts"]),
        )

    def complete_job(self, job_id: str) -> None:
        with self.connect() as conn:
            conn.execute(
                "UPDATE jobs SET state = 'completed', completed_at = NOW() WHERE id = %s",
                (job_id,),
            )
            conn.commit()

    def fail_job(self, job: Job, error: str) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                UPDATE jobs
                SET state = CASE WHEN attempts < max_attempts THEN 'pending' ELSE 'failed' END,
                    scheduled_for = CASE
                      WHEN attempts < max_attempts THEN NOW() + (INTERVAL '30 seconds' * attempts)
                      ELSE scheduled_for
                    END,
                    completed_at = CASE WHEN attempts >= max_attempts THEN NOW() ELSE completed_at END,
                    last_error = %s
                WHERE id = %s
                """,
                (error[:4000], job.id),
            )
            conn.commit()

    def create_session_if_needed(
        self,
        *,
        tenant_id: str,
        session_id: str | None,
        initial_prompt: str,
        template_id: str | None = None,
        template_revision: int = 1,
    ) -> str:
        if session_id:
            return session_id

        with self.connect() as conn:
            row = conn.execute(
                """
                INSERT INTO agent_sessions(tenant_id, template_id, template_revision, initial_prompt)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (tenant_id, template_id, template_revision, initial_prompt),
            ).fetchone()
            session_id = str(row["id"])
            conn.execute(
                "UPDATE agent_sessions SET root_session_id = id WHERE id = %s",
                (session_id,),
            )
            conn.commit()
            return session_id

    def set_session_running(self, session_id: str, sdk_session_id: str | None, sdk_session_path: str) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                UPDATE agent_sessions
                SET status = 'running',
                    sdk_session_id = COALESCE(%s, sdk_session_id),
                    sdk_session_path = %s,
                    last_activity_at = NOW()
                WHERE id = %s
                """,
                (sdk_session_id, sdk_session_path, session_id),
            )
            conn.commit()

    def set_session_terminal(
        self,
        *,
        session_id: str,
        status: str,
        summary: str | None = None,
        error: str | None = None,
        cost_usd: float | None = None,
        tokens: int | None = None,
    ) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                UPDATE agent_sessions
                SET status = %s,
                    final_summary = COALESCE(%s, final_summary),
                    error = %s,
                    cumulative_cost_usd = COALESCE(%s, cumulative_cost_usd),
                    cumulative_tokens = COALESCE(%s, cumulative_tokens),
                    terminated_at = NOW(),
                    last_activity_at = NOW()
                WHERE id = %s
                """,
                (status, summary, error, cost_usd, tokens, session_id),
            )
            conn.commit()

    def append_event(self, *, tenant_id: str, session_id: str, kind: str, payload: dict[str, Any]) -> None:
        with self.connect() as conn:
            seq_row = conn.execute(
                "SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM session_events WHERE session_id = %s",
                (session_id,),
            ).fetchone()
            conn.execute(
                """
                INSERT INTO session_events(session_id, tenant_id, seq, kind, payload)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (session_id, tenant_id, int(seq_row["seq"]), kind, json.dumps(payload)),
            )
            conn.commit()

