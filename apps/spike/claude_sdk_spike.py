#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import os
from pathlib import Path

from collections.abc import AsyncIterator
from typing import Any

from claude_code_sdk import (
    ClaudeCodeOptions,
    ClaudeSDKClient,
    HookContext,
    HookMatcher,
    PermissionResultAllow,
    PermissionResultDeny,
    ResultMessage,
    TextBlock,
    ToolPermissionContext,
    query,
)


WORKSPACE = Path(os.environ.get("AGENT_SPIKE_WORKSPACE", "/tmp/solo-agent-spike"))


def require_key() -> None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise SystemExit("ANTHROPIC_API_KEY is required for SDK spike checks.")


async def v1_streaming() -> None:
    require_key()
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    options = ClaudeCodeOptions(
        cwd=WORKSPACE,
        max_turns=2,
        allowed_tools=["Read", "Bash"],
        permission_mode="acceptEdits",
    )
    async for message in query(
        prompt="Reply with one short sentence, then run `pwd` with Bash.",
        options=options,
    ):
        print(type(message).__name__, message)


async def v2_permission_callback() -> None:
    require_key()
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    decisions: list[tuple[str, dict[str, Any]]] = []

    async def prompts() -> AsyncIterator[dict[str, Any]]:
        yield {
            "type": "user",
            "message": {
                "role": "user",
                "content": "Use Bash to run `echo permission-test`. Do not choose a safer substitute.",
            },
        }

    async def can_use_tool(
        tool_name: str,
        tool_input: dict[str, Any],
        _context: ToolPermissionContext,
    ):
        decisions.append((tool_name, tool_input))
        if tool_name == "Bash":
            return PermissionResultDeny(message="Bash is denied by the W0 permission callback.")
        return PermissionResultAllow()

    options = ClaudeCodeOptions(
        cwd=WORKSPACE,
        max_turns=2,
        allowed_tools=[],
        permission_mode="default",
        can_use_tool=can_use_tool,
    )
    async for message in query(prompt=prompts(), options=options):
        print(type(message).__name__, message)

    print("PERMISSION_DECISIONS", decisions)


async def v2_pretool_hook_block() -> None:
    require_key()
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    hook_inputs: list[dict[str, Any]] = []

    async def block_bash(
        hook_input: dict[str, Any],
        tool_use_id: str | None,
        _context: HookContext,
    ):
        hook_inputs.append({"tool_use_id": tool_use_id, "input": hook_input})
        return {
            "decision": "block",
            "systemMessage": "Bash is blocked by the W0 PreToolUse hook.",
        }

    options = ClaudeCodeOptions(
        cwd=WORKSPACE,
        max_turns=2,
        allowed_tools=["Bash"],
        permission_mode="acceptEdits",
        hooks={"PreToolUse": [HookMatcher(matcher="Bash", hooks=[block_bash])]},
    )
    async def prompts() -> AsyncIterator[dict[str, Any]]:
        yield {
            "type": "user",
            "message": {
                "role": "user",
                "content": "Use Bash to run `echo pretool-hook-test`. Do not choose a safer substitute.",
            },
        }

    async for message in query(prompt=prompts(), options=options):
        print(type(message).__name__, message)

    print("PRETOOL_HOOK_INPUTS", hook_inputs)


async def v4_budget_probe() -> None:
    require_key()
    options = ClaudeCodeOptions(
        cwd=WORKSPACE,
        max_turns=10,
        extra_args={"max-budget-usd": "0.01"},
    )
    try:
        async for message in query(
            prompt="Think carefully and write a detailed implementation plan for a SaaS agent platform.",
            options=options,
        ):
            print(type(message).__name__, message)
    except Exception as exc:  # The spike is explicitly checking the concrete exception shape.
        print("EXCEPTION_TYPE", type(exc).__name__)
        print("EXCEPTION", repr(exc))
        raise


async def v5_subagent_tracing_probe() -> None:
    require_key()
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    subagent_hook_inputs: list[dict[str, Any]] = []

    async def subagent_stop(
        hook_input: dict[str, Any],
        tool_use_id: str | None,
        _context: HookContext,
    ):
        subagent_hook_inputs.append({"tool_use_id": tool_use_id, "input": hook_input})
        return {}

    options = ClaudeCodeOptions(
        cwd=WORKSPACE,
        max_turns=3,
        allowed_tools=["Task"],
        permission_mode="acceptEdits",
        hooks={"SubagentStop": [HookMatcher(matcher=None, hooks=[subagent_stop])]},
    )
    async for message in query(
        prompt=(
            "Use the Task tool exactly once. Ask a subagent to reply with "
            "`child-ok-1842`, then summarize the subagent result in one sentence."
        ),
        options=options,
    ):
        print(type(message).__name__, message)

    print("SUBAGENT_STOP_HOOK_INPUTS", subagent_hook_inputs)


async def interactive_resume_probe() -> None:
    require_key()
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    async with ClaudeSDKClient(
        options=ClaudeCodeOptions(
            cwd=WORKSPACE,
            max_turns=3,
            allowed_tools=["Read"],
            permission_mode="acceptEdits",
        )
    ) as client:
        await client.query(
            "Use the AskUserQuestion tool to ask: What color should the dashboard accent be?"
        )
        async for message in client.receive_response():
            print(type(message).__name__, message)


async def v6_session_resume_probe() -> None:
    require_key()
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    first_session_id: str | None = None

    first_options = ClaudeCodeOptions(
        cwd=WORKSPACE,
        max_turns=1,
        permission_mode="acceptEdits",
    )
    async for message in query(
        prompt="Remember this exact token for the next turn: resume-alpha-7319. Reply OK.",
        options=first_options,
    ):
        print("FIRST", type(message).__name__, message)
        if isinstance(message, ResultMessage):
            first_session_id = message.session_id

    if not first_session_id:
        raise SystemExit("First query did not return a session_id.")

    print("RESUME_SESSION_ID", first_session_id)

    second_options = ClaudeCodeOptions(
        cwd=WORKSPACE,
        max_turns=1,
        resume=first_session_id,
        permission_mode="acceptEdits",
    )
    async for message in query(
        prompt="What exact token did I ask you to remember? Reply with only the token.",
        options=second_options,
    ):
        print("SECOND", type(message).__name__, message)
        if hasattr(message, "content"):
            for block in getattr(message, "content", []):
                if isinstance(block, TextBlock):
                    print("SECOND_TEXT", block.text)


def main() -> None:
    parser = argparse.ArgumentParser(description="Claude Code SDK Week 0 spike harness")
    parser.add_argument("check", choices=["v1", "v2", "v2hook", "v3", "v4", "v5", "v6"])
    args = parser.parse_args()

    if args.check == "v1":
        asyncio.run(v1_streaming())
    elif args.check == "v2":
        asyncio.run(v2_permission_callback())
    elif args.check == "v2hook":
        asyncio.run(v2_pretool_hook_block())
    elif args.check == "v3":
        asyncio.run(interactive_resume_probe())
    elif args.check == "v4":
        asyncio.run(v4_budget_probe())
    elif args.check == "v5":
        asyncio.run(v5_subagent_tracing_probe())
    elif args.check == "v6":
        asyncio.run(v6_session_resume_probe())


if __name__ == "__main__":
    main()
