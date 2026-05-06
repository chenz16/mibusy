from __future__ import annotations

import asyncio
import os
import signal

from .config import load_config
from .db import Database, Job
from .sdk_runner import run_agent, workspace_for


class Worker:
    def __init__(self) -> None:
        self.config = load_config()
        self.db = Database(self.config.database_url)
        self.stopping = asyncio.Event()

    async def run_forever(self) -> None:
        while not self.stopping.is_set():
            job = self.db.claim_job(self.config.worker_id)
            if job is None:
                await asyncio.sleep(self.config.poll_interval_seconds)
                continue

            try:
                await self.handle_job(job)
                self.db.complete_job(job.id)
            except Exception as exc:
                self.db.fail_job(job, str(exc))

    async def handle_job(self, job: Job) -> None:
        if job.kind != "agent_session":
            self.db.complete_job(job.id)
            return

        prompt = str(job.payload.get("prompt") or "")
        if not prompt:
            raise ValueError("agent_session job payload requires prompt")

        session_id = self.db.create_session_if_needed(
            tenant_id=job.tenant_id,
            session_id=job.payload.get("session_id"),
            initial_prompt=prompt,
            template_id=job.payload.get("template_id"),
            template_revision=int(job.payload.get("template_revision", 1)),
        )
        workspace = workspace_for(self.config, job.tenant_id, session_id)
        self.db.set_session_running(
            session_id,
            sdk_session_id=job.payload.get("sdk_session_id"),
            sdk_session_path=str(workspace),
        )
        self.db.append_event(
            tenant_id=job.tenant_id,
            session_id=session_id,
            kind="status",
            payload={"status": "started", "job_id": job.id},
        )

        result = None
        async for event, maybe_result in run_agent(
            config=self.config,
            tenant_id=job.tenant_id,
            session_id=session_id,
            prompt=prompt,
            user_role=str(job.payload.get("user_role", "friend")),
            requested_tools=job.payload.get("allowed_tools"),
            resume_sdk_session_id=job.payload.get("sdk_session_id"),
            max_budget_usd=job.payload.get("max_budget_usd"),
        ):
            if event is not None:
                kind, payload = event
                self.db.append_event(
                    tenant_id=job.tenant_id,
                    session_id=session_id,
                    kind=kind,
                    payload=payload,
                )
                if kind == "status" and payload.get("sdk_session_id"):
                    self.db.set_session_running(
                        session_id,
                        sdk_session_id=payload["sdk_session_id"],
                        sdk_session_path=str(workspace),
                    )
            if maybe_result is not None:
                result = maybe_result

        if result is None:
            raise RuntimeError("SDK runner ended without a terminal result")

        self.db.set_session_terminal(
            session_id=session_id,
            status=result.status,
            summary=result.summary,
            error=result.error,
            cost_usd=result.cost_usd,
            tokens=result.tokens,
        )


async def async_main() -> None:
    if os.environ.get("WORKER_VERIFY_ONLY") == "1":
        root = os.environ.get("AGENT_WORKSPACE_ROOT", "/var/agent-workspaces")
        os.makedirs(root, exist_ok=True)
        await asyncio.Event().wait()

    worker = Worker()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, worker.stopping.set)
    await worker.run_forever()


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()
