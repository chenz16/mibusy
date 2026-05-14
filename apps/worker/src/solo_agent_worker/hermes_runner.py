from __future__ import annotations

import os
import pathlib
import sys
from dataclasses import dataclass
from typing import Any, Callable, Iterator

_HERMES_AGENT_SRC = (
    pathlib.Path(__file__).parents[4] / "frameworks/hermes/hermes-agent"
)


@dataclass(frozen=True)
class HermesEvent:
    kind: str
    payload: dict


def _build_agent() -> Any:
    """Lazily import and return a configured AIAgent.

    Tries the installed package first; falls back to the framework source tree
    so any Python environment can run the real Hermes agent.
    """
    try:
        from run_agent import AIAgent  # type: ignore[import-not-found]  # noqa: PLC0415
    except ImportError:
        if str(_HERMES_AGENT_SRC) not in sys.path:
            sys.path.insert(0, str(_HERMES_AGENT_SRC))
        from run_agent import AIAgent  # type: ignore[import-not-found]  # noqa: PLC0415, F811

    return AIAgent(
        provider=os.getenv("HERMES_PROVIDER", "deepseek"),
        api_key=os.getenv("DEEPSEEK_API_KEY"),
        base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/"),
        model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        max_iterations=10,
        quiet_mode=True,
        skip_memory=True,
        skip_context_files=True,
    )


def run_hermes_assignment(
    *,
    assignment_id: str,
    desk_id: str,
    agent_id: str,
    prompt: str,
    runtime_profile: str = "hermes_deepseek_v4_pro",
    budget_limit: float = 1.0,  # reserved: Hermes budget enforcement
    context_pack: dict | None = None,  # reserved: Desk context injection
    _runner: Callable[[str], str] | None = None,
) -> Iterator[HermesEvent]:
    """Run one assignment through Hermes AIAgent.

    Yields: status → message_chunk → final  (or status → error on failure).
    _runner is injectable for unit tests — receives the full prompt, returns text.
    Production path instantiates a real AIAgent via run_agent.AIAgent.
    """
    yield HermesEvent(
        kind="status",
        payload={
            "status": "started",
            "runtime_profile": runtime_profile,
            "assignment_id": assignment_id,
            "desk_id": desk_id,
            "agent_id": agent_id,
        },
    )

    system_prefix = (
        "You are a virtual staff member in a CEO's Boardroom. "
        f"Assignment ID: {assignment_id}. "
        "Be concise, action-oriented, and produce a clear deliverable. "
        "Call out decisions the CEO must make."
    )
    full_prompt = f"{system_prefix}\n\nTask: {prompt}"

    try:
        if _runner is not None:
            text = _runner(full_prompt)
            model = "injected"
            tokens = 0
        else:
            agent = _build_agent()
            result = agent.run_conversation(full_prompt)
            text = result.get("final_response") or ""
            model = result.get("model") or runtime_profile
            tokens = result.get("total_tokens") or 0

        yield HermesEvent(
            kind="message_chunk",
            payload={"text": text, "chunk_seq": 0},
        )
        yield HermesEvent(
            kind="final",
            payload={
                "summary": text,
                "model": model,
                "tokens": tokens,
                "runtime_profile": runtime_profile,
            },
        )
    except Exception as exc:
        yield HermesEvent(
            kind="error",
            payload={"reason": str(exc), "recoverable": False},
        )
