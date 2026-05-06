from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from claude_code_sdk import (
    AssistantMessage,
    ClaudeCodeOptions,
    ResultMessage,
    SystemMessage,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
    query,
)

from .config import WorkerConfig, allowed_tools_for_role


@dataclass(frozen=True)
class AgentRunResult:
    status: str
    sdk_session_id: str | None
    summary: str | None
    error: str | None
    cost_usd: float | None
    tokens: int | None


def workspace_for(config: WorkerConfig, tenant_id: str, session_id: str) -> Path:
    return config.workspace_root / tenant_id / session_id


def clean_claude_env(config: WorkerConfig) -> dict[str, str]:
    env = dict(os.environ)
    env["HOME"] = str(config.claude_home)
    return env


def summarize_usage(usage: dict[str, Any] | None) -> int | None:
    if not usage:
        return None
    token_fields = [
        "input_tokens",
        "output_tokens",
        "cache_creation_input_tokens",
        "cache_read_input_tokens",
    ]
    total = 0
    for field in token_fields:
        value = usage.get(field)
        if isinstance(value, int):
            total += value
    return total


def normalize_message(message: object) -> tuple[str, dict[str, Any]] | None:
    if isinstance(message, SystemMessage):
        subtype = message.subtype
        data = message.data
        if subtype == "init":
            return "status", {"status": "started", "sdk_session_id": data.get("session_id")}
        if subtype in {"task_started", "task_notification", "api_retry"}:
            return "status", {"status": subtype, **data}
        return None

    if isinstance(message, AssistantMessage):
        text_chunks: list[str] = []
        for block in message.content:
            if isinstance(block, TextBlock):
                text_chunks.append(block.text)
            elif isinstance(block, ToolUseBlock):
                name = "Agent" if block.name == "Task" else block.name
                return "tool_use", {
                    "tool": name,
                    "tool_use_id": block.id,
                    "input_summary": str(block.input)[:1000],
                }
        if text_chunks:
            return "message_chunk", {"text": "\n".join(text_chunks), "chunk_seq": 0}
        return None

    if isinstance(message, UserMessage):
        for block in message.content:
            if isinstance(block, ToolResultBlock):
                return "tool_result", {
                    "tool_use_id": block.tool_use_id,
                    "output_summary": str(block.content)[:1000],
                    "is_error": block.is_error,
                }
        return None

    if isinstance(message, ResultMessage):
        if message.subtype == "error_max_budget_usd":
            return "error", {
                "reason": "budget_exceeded",
                "recoverable": False,
                "cost_total": message.total_cost_usd,
                "tokens_total": summarize_usage(message.usage),
            }
        if message.is_error:
            return "error", {
                "reason": message.subtype,
                "recoverable": False,
                "cost_total": message.total_cost_usd,
                "tokens_total": summarize_usage(message.usage),
            }
        return "final", {
            "summary": message.result,
            "cost_total": message.total_cost_usd,
            "tokens_total": summarize_usage(message.usage),
        }

    return None


async def run_agent(
    *,
    config: WorkerConfig,
    tenant_id: str,
    session_id: str,
    prompt: str,
    user_role: str,
    requested_tools: list[str] | None,
    resume_sdk_session_id: str | None = None,
    max_budget_usd: float | None = None,
):
    workspace = workspace_for(config, tenant_id, session_id)
    workspace.mkdir(parents=True, exist_ok=True)
    config.claude_home.mkdir(parents=True, exist_ok=True)

    extra_args: dict[str, str | None] = {}
    if max_budget_usd is not None:
        extra_args["max-budget-usd"] = str(max_budget_usd)

    options = ClaudeCodeOptions(
        cwd=workspace,
        max_turns=config.max_turns,
        allowed_tools=allowed_tools_for_role(user_role, requested_tools),
        permission_mode="acceptEdits",
        resume=resume_sdk_session_id,
        env=clean_claude_env(config),
        extra_args=extra_args,
    )

    sdk_session_id: str | None = resume_sdk_session_id
    final_summary: str | None = None
    final_cost: float | None = None
    final_tokens: int | None = None

    try:
        async for message in query(prompt=prompt, options=options):
            if isinstance(message, SystemMessage) and message.subtype == "init":
                sdk_session_id = message.data.get("session_id")
            if isinstance(message, ResultMessage):
                final_summary = message.result
                final_cost = message.total_cost_usd
                final_tokens = summarize_usage(message.usage)
                if message.subtype == "error_max_budget_usd":
                    yield normalize_message(message), AgentRunResult(
                        status="failed",
                        sdk_session_id=sdk_session_id,
                        summary=None,
                        error="budget_exceeded",
                        cost_usd=final_cost,
                        tokens=final_tokens,
                    )
                    return

            yield normalize_message(message), None

        yield None, AgentRunResult(
            status="completed",
            sdk_session_id=sdk_session_id,
            summary=final_summary,
            error=None,
            cost_usd=final_cost,
            tokens=final_tokens,
        )
    except Exception as exc:
        yield ("error", {"reason": str(exc), "recoverable": False}), AgentRunResult(
            status="failed",
            sdk_session_id=sdk_session_id,
            summary=None,
            error=str(exc),
            cost_usd=final_cost,
            tokens=final_tokens,
        )

