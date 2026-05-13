import asyncio
from claude_code_sdk import ResultMessage, SystemMessage

from pathlib import Path

import pytest

from solo_agent_worker.config import WorkerConfig
from solo_agent_worker.deepseek_runner import DeepSeekResponse
from solo_agent_worker import sdk_runner
from solo_agent_worker.sdk_runner import clean_claude_env, normalize_message, run_agent, summarize_usage


def worker_config(tmp_path: Path) -> WorkerConfig:
    return WorkerConfig(
        database_url="postgresql://example",
        worker_id="worker-test",
        workspace_root=tmp_path / "workspaces",
        claude_home=tmp_path / "claude-home",
        poll_interval_seconds=1,
        max_turns=2,
        llm_provider="deepseek",
        deepseek_api_key="test-key",
        deepseek_base_url="https://api.deepseek.com",
        deepseek_model="deepseek-v4-pro",
    )


def test_claude_code_deepseek_env_sets_anthropic_endpoint(tmp_path: Path) -> None:
    config = worker_config(tmp_path)
    config = WorkerConfig(
        **{
            **config.__dict__,
            "llm_provider": "claude_code_deepseek",
            "deepseek_api_key": "deepseek-key",
        }
    )

    env = clean_claude_env(config)

    assert env["ANTHROPIC_BASE_URL"] == "https://api.deepseek.com/anthropic"
    assert env["ANTHROPIC_API_KEY"] == "deepseek-key"


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


def test_run_agent_can_use_deepseek_provider(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    def fake_completion(config: WorkerConfig, *, prompt: str) -> DeepSeekResponse:
        assert config.deepseek_model == "deepseek-v4-pro"
        assert prompt == "summarize"
        return DeepSeekResponse(text="done", model="deepseek-v4-pro", request_id="req-1", tokens=9)

    monkeypatch.setattr(sdk_runner, "run_deepseek_completion", fake_completion)

    async def collect():
        events = []
        result = None
        async for event, maybe_result in run_agent(
            config=worker_config(tmp_path),
            tenant_id="tenant",
            session_id="session",
            prompt="summarize",
            user_role="owner",
            requested_tools=None,
        ):
            events.append(event)
            if maybe_result is not None:
                result = maybe_result
        return events, result

    events, result = asyncio.run(collect())

    assert events[0] == (
        "status",
        {"status": "started", "sdk_session_id": "deepseek:tenant:session", "provider": "deepseek"},
    )
    assert ("message_chunk", {"text": "done", "chunk_seq": 0}) in events
    assert result is not None
    assert result.status == "completed"
    assert result.summary == "done"
    assert result.tokens == 9
