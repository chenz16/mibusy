from __future__ import annotations

import uuid
from typing import Any, Callable, Iterator, Protocol

from .hermes_runner import HermesEvent, run_hermes_assignment


class AssignmentStore(Protocol):
    def create_assignment(self, data: dict[str, Any]) -> dict[str, Any]: ...
    def get_assignment(self, assignment_id: str) -> dict[str, Any] | None: ...
    def update_assignment_status(self, assignment_id: str, status: str) -> None: ...
    def clear_assignment_events(self, assignment_id: str) -> None: ...
    def append_assignment_event(
        self, *, assignment_id: str, seq: int, kind: str, payload: dict[str, Any]
    ) -> None: ...
    def create_deliverable(self, data: dict[str, Any]) -> dict[str, Any]: ...


class Orchestrator:
    """Manages the assignment lifecycle: create → run → events → deliverable → terminal status."""

    def __init__(self, store: AssignmentStore) -> None:
        self.store = store

    def create_assignment(
        self,
        *,
        workspace_id: str,
        desk_id: str,
        agent_id: str,
        title: str,
        prompt: str,
        user_id: str | None = None,
        budget_limit: float = 1.0,
        parent_id: str | None = None,
        root_id: str | None = None,
    ) -> dict[str, Any]:
        assignment_id = str(uuid.uuid4())
        data: dict[str, Any] = {
            "id": assignment_id,
            "workspace_id": workspace_id,
            "desk_id": desk_id,
            "title": title,
            "prompt": prompt,
            "assigned_to_agent_id": agent_id,
            "created_by_user_id": user_id,
            "parent_assignment_id": parent_id,
            "root_assignment_id": root_id or assignment_id,
            "status": "queued",
            "budget_limit": budget_limit,
        }
        return self.store.create_assignment(data)

    def run_assignment(
        self,
        assignment_id: str,
        *,
        runner: Callable[..., Iterator[HermesEvent]] | None = None,
    ) -> dict[str, Any]:
        assignment = self.store.get_assignment(assignment_id)
        if assignment is None:
            raise ValueError(f"Assignment {assignment_id!r} not found")

        self.store.update_assignment_status(assignment_id, "running")
        self.store.clear_assignment_events(assignment_id)

        effective_runner: Callable[..., Iterator[HermesEvent]] = runner or run_hermes_assignment

        seq = 0
        final_status = "failed"
        deliverable: dict[str, Any] | None = None

        for event in effective_runner(
            assignment_id=assignment_id,
            desk_id=str(assignment.get("desk_id") or ""),
            agent_id=str(assignment.get("assigned_to_agent_id") or ""),
            prompt=str(assignment.get("prompt") or ""),
        ):
            self.store.append_assignment_event(
                assignment_id=assignment_id,
                seq=seq,
                kind=event.kind,
                payload=event.payload,
            )
            seq += 1

            if event.kind == "final":
                final_status = "completed"
                summary = event.payload.get("summary") or ""
                if summary:
                    deliverable = self.store.create_deliverable({
                        "assignment_id": assignment_id,
                        "workspace_id": assignment.get("workspace_id") or None,
                        "desk_id": assignment.get("desk_id") or None,
                        "title": str(assignment.get("title") or "Deliverable"),
                        "body": summary,
                        "format": "markdown",
                        "created_by_agent_id": assignment.get("assigned_to_agent_id") or None,
                    })
            elif event.kind == "error":
                final_status = "failed"

        self.store.update_assignment_status(assignment_id, final_status)
        return {"status": final_status, "deliverable": deliverable, "events_count": seq}
