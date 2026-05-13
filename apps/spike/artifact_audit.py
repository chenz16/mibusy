#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

try:
    from pglast import parse_sql
except ModuleNotFoundError:
    parse_sql = None


ROOT = Path(__file__).resolve().parents[2]

REQUIRED_PATHS = [
    "apps/web/package.json",
    "apps/web/app/page.tsx",
    "apps/web/app/chat/page.tsx",
    "apps/web/app/tasks/page.tsx",
    "apps/web/app/schedules/page.tsx",
    "apps/web/app/inbox/page.tsx",
    "apps/web/app/memory/page.tsx",
    "apps/web/app/templates/page.tsx",
    "apps/web/app/observe/page.tsx",
    "apps/web/app/settings/page.tsx",
    "apps/web/app/globals.css",
    "apps/web/components/AppShell.tsx",
    "apps/web/components/PageScaffold.tsx",
    "apps/web/components/StatusBadge.tsx",
    "apps/web/lib/ui-data.ts",
    "apps/web/app/api/sessions/[id]/events/route.ts",
    "apps/web/app/api/invite/[code]/route.ts",
    "apps/web/app/api/auth/bootstrap/route.ts",
    "apps/web/lib/db.ts",
    "apps/worker/pyproject.toml",
    "apps/worker/Dockerfile",
    "apps/worker/fly.toml.example",
    "apps/worker/src/solo_agent_worker/config.py",
    "apps/worker/src/solo_agent_worker/db.py",
    "apps/worker/src/solo_agent_worker/sdk_runner.py",
    "apps/worker/src/solo_agent_worker/main.py",
    "apps/worker/tests/test_config.py",
    "apps/worker/tests/test_sdk_runner.py",
    "apps/spike/claude_sdk_spike.py",
    "apps/spike/db_spike.py",
    "apps/spike/web_api_e2e.py",
    "apps/spike/requirements.txt",
    "packages/db/migrations/0001_init.sql",
    "packages/shared-types/package.json",
    "packages/shared-types/tsconfig.json",
    "packages/shared-types/src/index.ts",
    "docs/implementation/sdk/spike-report.md",
    "docs/implementation/sdk/completion-audit.md",
    "docs/implementation/deployment/deployment-verification.md",
    "docker-compose.yml",
    "pnpm-workspace.yaml",
    ".github/workflows/offline-verify.yml",
    ".github/workflows/db-spike.yml",
    ".github/workflows/deploy-verify.yml",
]

REQUIRED_TABLES = [
    "tenants",
    "users",
    "agent_templates",
    "template_invocation_edges",
    "agent_sessions",
    "inbox_items",
    "session_summaries",
    "topic_digests",
    "persona_facts",
    "schedules",
    "billing_events",
    "jobs",
    "session_events",
    "invitations",
]

REQUIRED_REPORT_SECTIONS = [f"## V{index}" for index in range(1, 12)]


def assert_contains(name: str, haystack: str, needle: str) -> None:
    if needle not in haystack:
        raise AssertionError(f"{name} is missing `{needle}`")


def main() -> None:
    missing = [path for path in REQUIRED_PATHS if not (ROOT / path).exists()]
    if missing:
        raise SystemExit(f"Missing required paths: {missing}")

    migration = (ROOT / "packages/db/migrations/0001_init.sql").read_text()
    parsed_count: int | None = None
    if parse_sql is not None:
        parsed_statements = parse_sql(migration)
        parsed_count = len(parsed_statements)
        if parsed_count < 1:
            raise AssertionError("migration parser returned no statements")

    for table in REQUIRED_TABLES:
        assert_contains("migration", migration, f"CREATE TABLE IF NOT EXISTS {table}")

    for required in [
        "ENABLE ROW LEVEL SECURITY",
        "CREATE POLICY",
        "public.add_tenant_claim",
        "notify_session_event",
        "sdk_session_id",
        "sdk_task_id",
    ]:
        assert_contains("migration", migration, required)

    for template_name in [
        "general_assistant",
        "research_agent",
        "writer_agent",
        "notifier_agent",
        "scheduler_agent",
    ]:
        assert_contains("migration seed templates", migration, template_name)

    edge_matches = re.findall(r"\('([^']+)',\s*'([^']+)'\)", migration)
    template_edges = [
        edge for edge in edge_matches if edge[0].endswith("_agent") and edge[1].endswith("_agent")
    ]
    assert_acyclic_template_edges(template_edges)

    report = (ROOT / "docs/implementation/sdk/spike-report.md").read_text()
    for section in REQUIRED_REPORT_SECTIONS:
        assert_contains("spike report", report, section)

    sdk_harness = (ROOT / "apps/spike/claude_sdk_spike.py").read_text()
    for command in ['"v1"', '"v2"', '"v2hook"', '"v3"', '"v4"', '"v5"', '"v6"']:
        assert_contains("SDK harness", sdk_harness, command)

    db_harness = (ROOT / "apps/spike/db_spike.py").read_text()
    for command in ['"preflight"', '"migrate"', '"all"', '"v7"', '"v8"', '"v9"', '"v10"', '"v11"']:
        assert_contains("DB harness", db_harness, command)
    assert_contains("DB harness", db_harness, "FOR UPDATE SKIP LOCKED")
    web_api_harness = (ROOT / "apps/spike/web_api_e2e.py").read_text()
    assert_contains("web API harness", web_api_harness, "/api/invite/")
    assert_contains("web API harness", web_api_harness, "/api/auth/bootstrap")

    worker_db = (ROOT / "apps/worker/src/solo_agent_worker/db.py").read_text()
    assert_contains("worker DB", worker_db, "FOR UPDATE SKIP LOCKED")
    worker_config = (ROOT / "apps/worker/src/solo_agent_worker/config.py").read_text()
    assert_contains("worker config", worker_config, "FRIEND_TOOLS")
    assert_contains("worker config", worker_config, "DANGEROUS_TOOLS")
    worker_runner = (ROOT / "apps/worker/src/solo_agent_worker/sdk_runner.py").read_text()
    assert_contains("worker SDK runner", worker_runner, "error_max_budget_usd")
    assert_contains("worker SDK runner", worker_runner, "sdk_session_id")
    fly_config = (ROOT / "apps/worker/fly.toml.example").read_text()
    assert_contains("Fly config", fly_config, "count = 1")
    assert_contains("Fly config", fly_config, 'destination = "/var/agent-workspaces"')
    assert_contains("Fly config", fly_config, 'strategy = "immediate"')
    web_sse_route = (ROOT / "apps/web/app/api/sessions/[id]/events/route.ts").read_text()
    assert_contains("web SSE route", web_sse_route, "SessionEventPayloadByKind")
    shared_types = (ROOT / "packages/shared-types/src/index.ts").read_text()
    assert_contains("shared types", shared_types, "SessionStatus")
    assert_contains("shared types", shared_types, "AgentSessionJobPayload")

    if parsed_count is None:
        print("artifact audit passed (install apps/spike/requirements.txt to enable SQL parser check)")
    else:
        print(f"artifact audit passed ({parsed_count} SQL statements parsed)")


def assert_acyclic_template_edges(edges: list[tuple[str, str]]) -> None:
    graph: dict[str, list[str]] = {}
    for caller, callee in edges:
        graph.setdefault(caller, []).append(callee)
        graph.setdefault(callee, [])

    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node: str, path: list[str]) -> None:
        if node in visiting:
            cycle = " -> ".join([*path, node])
            raise AssertionError(f"template invocation seed edges contain a cycle: {cycle}")
        if node in visited:
            return
        visiting.add(node)
        for next_node in graph[node]:
            visit(next_node, [*path, node])
        visiting.remove(node)
        visited.add(node)

    for node in graph:
        visit(node, [])


if __name__ == "__main__":
    main()
