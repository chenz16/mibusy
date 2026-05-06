from claude_code_sdk import ResultMessage, SystemMessage

from solo_agent_worker.sdk_runner import normalize_message, summarize_usage


def test_summarize_usage_counts_known_token_fields() -> None:
    usage = {
        "input_tokens": 2,
        "output_tokens": 3,
        "cache_creation_input_tokens": 5,
        "cache_read_input_tokens": 7,
        "ignored": 100,
    }

    assert summarize_usage(usage) == 17


def test_normalize_init_message_preserves_sdk_session_id() -> None:
    message = SystemMessage(
        subtype="init",
        data={"session_id": "sdk-session-123", "cwd": "/tmp/workspace"},
    )

    assert normalize_message(message) == (
        "status",
        {"status": "started", "sdk_session_id": "sdk-session-123"},
    )


def test_normalize_task_notification_preserves_subagent_usage() -> None:
    message = SystemMessage(
        subtype="task_notification",
        data={
            "task_id": "child-task-1",
            "tool_use_id": "toolu_123",
            "usage": {"total_tokens": 42, "duration_ms": 10},
            "session_id": "parent-session",
        },
    )

    kind, payload = normalize_message(message)

    assert kind == "status"
    assert payload["status"] == "task_notification"
    assert payload["task_id"] == "child-task-1"
    assert payload["usage"]["total_tokens"] == 42


def test_budget_result_becomes_error_event() -> None:
    message = ResultMessage(
        subtype="error_max_budget_usd",
        duration_ms=1,
        duration_api_ms=1,
        is_error=True,
        num_turns=1,
        session_id="sdk-session-123",
        total_cost_usd=0.12,
        usage={"input_tokens": 10, "output_tokens": 5},
        result=None,
    )

    assert normalize_message(message) == (
        "error",
        {
            "reason": "budget_exceeded",
            "recoverable": False,
            "cost_total": 0.12,
            "tokens_total": 15,
        },
    )

