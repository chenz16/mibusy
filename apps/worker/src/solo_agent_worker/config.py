from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


OWNER_TOOLS = ["Read", "Bash", "Edit", "Write", "WebSearch", "WebFetch", "Task", "AskUserQuestion"]
FRIEND_TOOLS = ["Read", "WebSearch", "WebFetch", "Task", "AskUserQuestion"]
DANGEROUS_TOOLS = {"Bash", "Edit", "Write", "MultiEdit", "NotebookEdit"}


@dataclass(frozen=True)
class WorkerConfig:
    database_url: str
    worker_id: str
    workspace_root: Path
    claude_home: Path
    poll_interval_seconds: float
    max_turns: int
    llm_provider: str
    deepseek_api_key: str | None
    deepseek_base_url: str
    deepseek_model: str


def load_config() -> WorkerConfig:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required")

    return WorkerConfig(
        database_url=database_url,
        worker_id=os.environ.get("WORKER_ID", f"worker-{os.getpid()}"),
        workspace_root=Path(os.environ.get("AGENT_WORKSPACE_ROOT", "/var/agent-workspaces")),
        claude_home=Path(os.environ.get("CLAUDE_HOME", "/var/agent-claude-home")),
        poll_interval_seconds=float(os.environ.get("WORKER_POLL_INTERVAL_SECONDS", "2")),
        max_turns=int(os.environ.get("AGENT_MAX_TURNS", "10")),
        llm_provider=os.environ.get("AGENT_LLM_PROVIDER", "claude_code").strip().lower(),
        deepseek_api_key=os.environ.get("DEEPSEEK_API_KEY"),
        deepseek_base_url=os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/"),
        deepseek_model=os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-pro"),
    )


def allowed_tools_for_role(role: str, requested_tools: list[str] | None = None) -> list[str]:
    baseline = OWNER_TOOLS if role == "owner" else FRIEND_TOOLS
    if requested_tools is None:
        requested = baseline
    else:
        requested = requested_tools

    allowed = [tool for tool in requested if tool in baseline]
    if role != "owner":
        allowed = [tool for tool in allowed if tool not in DANGEROUS_TOOLS]
    return allowed
