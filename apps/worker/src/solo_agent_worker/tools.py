from __future__ import annotations

import uuid
from typing import Any

ALLOWED_DELEGATE_TARGETS: frozenset[str] = frozenset({"Nova", "Ledger", "Quill"})
ALLOWED_DELEGATE_CALLER_KINDS: frozenset[str] = frozenset({"chief_of_staff"})


def mibusy_write_deliverable(
    *,
    assignment_id: str,
    title: str,
    body: str,
    format: str = "markdown",
    agent_id: str,
    db: Any = None,
) -> dict[str, Any]:
    """Write a durable deliverable record linked to an assignment.

    Returns the deliverable dict including generated id and assignment_id.
    db is optional; if provided, create_deliverable(data) is called.
    """
    deliverable: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "assignment_id": assignment_id,
        "title": title,
        "body": body,
        "format": format,
        "created_by_agent_id": agent_id,
    }
    if db is not None:
        db.create_deliverable(deliverable)
    return deliverable


def mibusy_delegate_task(
    *,
    caller_agent: dict[str, Any],
    target_agent_name: str,
    task_prompt: str,
    budget: float = 0.5,
    db: Any = None,
) -> dict[str, Any]:
    """Request controlled delegation to a target virtual agent.

    Only chief_of_staff agents may delegate. Temporary agents may not.
    Only Nova, Ledger, and Quill are valid targets for MVP.
    """
    caller_kind: str = str(caller_agent.get("kind") or "")

    if caller_kind == "temporary":
        return {
            "accepted": False,
            "reason": "temporary agents cannot delegate tasks",
        }

    if caller_kind not in ALLOWED_DELEGATE_CALLER_KINDS:
        return {
            "accepted": False,
            "reason": f"caller kind '{caller_kind}' is not permitted to delegate",
        }

    if target_agent_name not in ALLOWED_DELEGATE_TARGETS:
        return {
            "accepted": False,
            "reason": f"target '{target_agent_name}' is not in the allowed delegation list",
        }

    child_id = str(uuid.uuid4())
    result: dict[str, Any] = {
        "accepted": True,
        "child_assignment_id": child_id,
        "target": target_agent_name,
        "task_prompt": task_prompt,
        "budget": budget,
    }

    if db is not None:
        db.create_child_assignment(result)

    return result


def mibusy_create_permanent_staff(
    *,
    caller_agent: dict[str, Any],
    **_kwargs: Any,
) -> dict[str, Any]:
    """Permanent staff can only be created by a human user — never by an agent."""
    _ = caller_agent
    return {
        "accepted": False,
        "reason": "permanent staff can only be created by a human user",
    }
