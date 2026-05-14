from __future__ import annotations

from solo_agent_worker.hermes_runner import HermesEvent, run_hermes_assignment


def _fake_success(_prompt: str) -> str:
    return "K-12 robotics market overview: strong STEM growth in public school districts."


def _fake_failure(_prompt: str) -> str:
    raise RuntimeError("Provider API error 503: service unavailable")


def test_hermes_runner_success_emits_status_chunk_final() -> None:
    events = list(
        run_hermes_assignment(
            assignment_id="a1",
            desk_id="d1",
            agent_id="ag1",
            prompt="Research K-12 robotics market",
            _runner=_fake_success,
        )
    )

    kinds = [e.kind for e in events]
    assert kinds[0] == "status", f"first event should be status, got {kinds[0]}"
    assert events[0].payload["status"] == "started"
    assert events[0].payload["assignment_id"] == "a1"
    assert "message_chunk" in kinds, "should emit message_chunk on success"
    assert kinds[-1] == "final", f"last event should be final, got {kinds[-1]}"
    final = events[-1]
    assert final.payload["summary"] != ""
    assert isinstance(final.payload["tokens"], int)


def test_hermes_runner_failure_emits_status_then_error() -> None:
    events = list(
        run_hermes_assignment(
            assignment_id="a2",
            desk_id="d1",
            agent_id="ag1",
            prompt="Research K-12 robotics market",
            _runner=_fake_failure,
        )
    )

    kinds = [e.kind for e in events]
    assert kinds[0] == "status", "first event must be status even on failure"
    assert kinds[-1] == "error", f"last event should be error, got {kinds[-1]}"
    assert "reason" in events[-1].payload
    assert events[-1].payload["recoverable"] is False


def test_hermes_event_is_frozen() -> None:
    event = HermesEvent(kind="status", payload={"status": "started"})
    try:
        event.kind = "other"  # type: ignore[misc]
        assert False, "HermesEvent should be frozen"
    except (AttributeError, TypeError):
        pass
