from pathlib import Path

import pytest

from solo_agent_worker.config import WorkerConfig
from solo_agent_worker.deepseek_runner import _extract_text, _token_total, run_deepseek_completion


def config(api_key: str | None = "test-key") -> WorkerConfig:
    return WorkerConfig(
        database_url="postgresql://example",
        worker_id="worker-test",
        workspace_root=Path("/tmp/workspaces"),
        claude_home=Path("/tmp/claude-home"),
        poll_interval_seconds=1,
        max_turns=2,
        llm_provider="deepseek",
        deepseek_api_key=api_key,
        deepseek_base_url="https://api.deepseek.com",
        deepseek_model="deepseek-v4-pro",
    )


def test_extract_text_from_openai_style_response() -> None:
    payload = {"choices": [{"message": {"content": "CEO-ready summary"}}]}

    assert _extract_text(payload) == "CEO-ready summary"


def test_token_total_prefers_total_tokens() -> None:
    assert _token_total({"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 20}) == 20


def test_deepseek_requires_api_key() -> None:
    with pytest.raises(RuntimeError, match="DEEPSEEK_API_KEY"):
        run_deepseek_completion(config(api_key=None), prompt="hello")
