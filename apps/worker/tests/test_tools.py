from __future__ import annotations

from solo_agent_worker.tools import (
    mibusy_create_permanent_staff,
    mibusy_delegate_task,
    mibusy_write_deliverable,
)

ATLAS = {"id": "ag1", "name": "Atlas", "kind": "chief_of_staff"}
NOVA = {"id": "ag2", "name": "Nova", "kind": "specialist"}
TEMP_HELPER = {"id": "tmp1", "name": "tmp-4831", "kind": "temporary"}
SPECIALIST = {"id": "ag3", "name": "Ledger", "kind": "specialist"}


def test_delegate_task_atlas_to_nova_accepted() -> None:
    result = mibusy_delegate_task(
        caller_agent=ATLAS,
        target_agent_name="Nova",
        task_prompt="Find K-12 district robotics funding signals",
        budget=0.5,
    )
    assert result["accepted"] is True
    assert result["target"] == "Nova"
    assert "child_assignment_id" in result


def test_delegate_task_atlas_to_ledger_accepted() -> None:
    result = mibusy_delegate_task(
        caller_agent=ATLAS,
        target_agent_name="Ledger",
        task_prompt="Score district fit",
        budget=0.3,
    )
    assert result["accepted"] is True


def test_delegate_task_atlas_to_quill_accepted() -> None:
    result = mibusy_delegate_task(
        caller_agent=ATLAS,
        target_agent_name="Quill",
        task_prompt="Draft follow-up email for principal",
        budget=0.2,
    )
    assert result["accepted"] is True


def test_delegate_task_unknown_target_rejected() -> None:
    result = mibusy_delegate_task(
        caller_agent=ATLAS,
        target_agent_name="UnknownBot",
        task_prompt="Do something",
        budget=0.5,
    )
    assert result["accepted"] is False
    assert "reason" in result
    assert "not in the allowed delegation list" in result["reason"]


def test_temp_helper_cannot_delegate() -> None:
    result = mibusy_delegate_task(
        caller_agent=TEMP_HELPER,
        target_agent_name="Nova",
        task_prompt="Do research",
        budget=0.5,
    )
    assert result["accepted"] is False
    assert "temporary" in result["reason"]


def test_non_chief_of_staff_cannot_delegate() -> None:
    result = mibusy_delegate_task(
        caller_agent=SPECIALIST,
        target_agent_name="Nova",
        task_prompt="Do research",
        budget=0.5,
    )
    assert result["accepted"] is False
    assert "not permitted" in result["reason"]


def test_agent_cannot_create_permanent_staff() -> None:
    result = mibusy_create_permanent_staff(
        caller_agent=ATLAS, name="NewAgent", role="Assistant"
    )
    assert result["accepted"] is False
    assert "human" in result["reason"]


def test_write_deliverable_returns_with_assignment_id() -> None:
    result = mibusy_write_deliverable(
        assignment_id="a1",
        title="K-12 CEO Summary",
        body="# K-12 Robotics Market\n\nStrong STEM growth in public districts.",
        format="markdown",
        agent_id="ag1",
    )
    assert result["assignment_id"] == "a1"
    assert "id" in result
    assert result["title"] == "K-12 CEO Summary"


def test_write_deliverable_calls_db_when_provided() -> None:
    created: list[dict] = []

    class FakeDb:
        def create_deliverable(self, data: dict) -> None:
            created.append(data)

    mibusy_write_deliverable(
        assignment_id="a2",
        title="Test",
        body="body",
        format="text",
        agent_id="ag1",
        db=FakeDb(),
    )

    assert len(created) == 1
    assert created[0]["assignment_id"] == "a2"
