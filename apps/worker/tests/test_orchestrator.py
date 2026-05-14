from __future__ import annotations

from typing import Any, Iterator

from solo_agent_worker.hermes_runner import HermesEvent
from solo_agent_worker.orchestrator import Orchestrator


class FakeStore:
    def __init__(self) -> None:
        self._assignments: dict[str, dict[str, Any]] = {}
        self._events: list[dict[str, Any]] = []
        self._deliverables: list[dict[str, Any]] = []

    def create_assignment(self, data: dict[str, Any]) -> dict[str, Any]:
        self._assignments[data["id"]] = dict(data)
        return self._assignments[data["id"]]

    def get_assignment(self, assignment_id: str) -> dict[str, Any] | None:
        return self._assignments.get(assignment_id)

    def update_assignment_status(self, assignment_id: str, status: str) -> None:
        if assignment_id in self._assignments:
            self._assignments[assignment_id]["status"] = status

    def append_assignment_event(
        self, *, assignment_id: str, seq: int, kind: str, payload: dict[str, Any]
    ) -> None:
        self._events.append(
            {"assignment_id": assignment_id, "seq": seq, "kind": kind, "payload": payload}
        )

    def create_deliverable(self, data: dict[str, Any]) -> dict[str, Any]:
        row = {**data, "id": f"del-{len(self._deliverables) + 1}"}
        self._deliverables.append(row)
        return row


def _success_runner(**kwargs: Any) -> Iterator[HermesEvent]:
    yield HermesEvent(kind="status", payload={"status": "started"})
    yield HermesEvent(kind="message_chunk", payload={"text": "CEO summary here", "chunk_seq": 0})
    yield HermesEvent(kind="final", payload={"summary": "CEO summary here", "tokens": 50})


def _failure_runner(**kwargs: Any) -> Iterator[HermesEvent]:
    yield HermesEvent(kind="status", payload={"status": "started"})
    yield HermesEvent(kind="error", payload={"reason": "api timeout", "recoverable": False})


def test_assignment_lifecycle_queued_to_completed() -> None:
    store = FakeStore()
    orc = Orchestrator(store)

    assignment = orc.create_assignment(
        workspace_id="ws1",
        desk_id="d1",
        agent_id="ag1",
        title="Research K-12 robotics",
        prompt="Research the K-12 robotics market and give me a CEO summary.",
        user_id="user1",
    )

    assert assignment["status"] == "queued"

    result = orc.run_assignment(assignment["id"], runner=_success_runner)

    assert result["status"] == "completed"
    stored = store.get_assignment(assignment["id"])
    assert stored is not None
    assert stored["status"] == "completed"

    kinds_seen = [e["kind"] for e in store._events]
    assert "status" in kinds_seen
    assert "final" in kinds_seen


def test_assignment_lifecycle_queued_to_failed() -> None:
    store = FakeStore()
    orc = Orchestrator(store)

    assignment = orc.create_assignment(
        workspace_id="ws1",
        desk_id="d1",
        agent_id="ag1",
        title="Research K-12 robotics",
        prompt="Research the K-12 robotics market.",
    )

    result = orc.run_assignment(assignment["id"], runner=_failure_runner)

    assert result["status"] == "failed"
    stored = store.get_assignment(assignment["id"])
    assert stored is not None
    assert stored["status"] == "failed"


def test_deliverable_links_to_assignment() -> None:
    store = FakeStore()
    orc = Orchestrator(store)

    assignment = orc.create_assignment(
        workspace_id="ws1",
        desk_id="d1",
        agent_id="ag1",
        title="Research K-12 robotics",
        prompt="Research the K-12 robotics market.",
    )

    result = orc.run_assignment(assignment["id"], runner=_success_runner)

    assert result["deliverable"] is not None
    assert result["deliverable"]["assignment_id"] == assignment["id"]
    assert len(store._deliverables) == 1
    assert store._deliverables[0]["assignment_id"] == assignment["id"]
