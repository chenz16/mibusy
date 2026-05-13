# Week 0 Spike Report

Status: in progress for full Stage 1; W0 DB runtime, Fly volume reboot, and Vercel preview deployment checks passed in GitHub Actions

## Environment

- Repo scaffold: created
- Local Postgres + pgvector: blocked in this environment because Docker daemon access is denied and local `postgres`/`psql` binaries are not installed. Runtime DB verification was run in GitHub Actions instead.
- DB runner: `pnpm db:preflight` checks Postgres/pgcrypto/pgvector/role permissions; `pnpm db:migrate` uses Python/psycopg instead of requiring local `psql`; `pnpm spike:db-all` runs V7-V11 once a Postgres URL is available
- Anthropic API key: available for this test run, used only as a temporary environment variable
- Claude Code CLI: installed locally via `@anthropic-ai/claude-code@2.1.129`
- Python SDK: installed in `.venv`
- Web typecheck: `pnpm --filter web typecheck` passed
- Web production build: `pnpm --filter web build` passed on Next.js 16.2.4, including `/chat`, `/tasks`, `/schedules`, `/inbox`, `/memory`, `/templates`, `/observe`, `/settings`
- UI shell: Stage 1 control-plane navigation and 8 route skeletons implemented from `agent-platform-ui-design.md`
- Shared types: `packages/shared-types` defines session status, session event payloads, job payload, and template contracts; web SSE route imports the shared `SessionEventPayloadByKind` contract
- Artifact audit: `pnpm spike:audit` passed
- Migration parser check: `. .venv/bin/activate && python apps/spike/artifact_audit.py` parsed `0001_init.sql` as 59 statements
- Seed templates: `0001_init.sql` inserts five global templates (`general_assistant`, `research_agent`, `writer_agent`, `notifier_agent`, `scheduler_agent`) plus initial DAG edges
- Seed DAG audit: `apps/spike/artifact_audit.py` statically checks seeded template invocation edges are acyclic
- Templates page DB read: `/templates` reads `agent_templates` and `template_invocation_edges` when `DATABASE_URL` is configured, with static fallback otherwise. DB Spike run `25440165924` verified the DB-backed page rendered `Live DB`, `general_assistant`, and `scheduler_agent`.
- Worker compile/import check: `PYTHONPATH=apps/worker/src python -m py_compile $(find apps/worker/src apps/spike -name '*.py')` passed
- Worker policy check: friend role strips `Bash` from requested tools; owner role can retain it
- Worker unit tests: `PYTHONPATH=apps/worker/src python -m pytest apps/worker/tests` passed, 7 tests
- Worker Fly config: `apps/worker/fly.toml.example` pins one VM, immediate deploy strategy, and `/var/agent-workspaces` persistent mount
- Deployment verification: `.github/workflows/deploy-verify.yml` Fly target passed in run `25436592363`, including verification-mode deploy, volume stamp write, machine restart, and stamp read after restart. Vercel target passed in run `25440680723`, including protected preview automation bypass, Next 16 preview deploy, `/chat` probe, and `/templates` probe; see `docs/deployment-verification.md`
- Offline verification bundle: `pnpm verify:offline` runs web build, TS typecheck, artifact audit, and worker tests. SQL parser audit runs when `pglast` is installed; strict parser evidence is tracked separately via `. .venv/bin/activate && python apps/spike/artifact_audit.py`. GitHub Actions Offline Verify run `25416607958` passed on branch `stage1-agent-platform-verify`.
- DB runtime CI: `.github/workflows/db-spike.yml` provisions `pgvector/pgvector:pg16` and runs `db:preflight`, `db:migrate`, `spike:db-all` for V7-V11, a Next.js invite/bootstrap HTTP E2E, and a DB-backed `/templates` page check. Run `25440165924` passed on branch `stage1-agent-platform-verify`.
- Dev server: running at `http://localhost:3000`; Next reported file watcher `ENOSPC` warnings, but the page rendered successfully via `curl`

## V1 SDK 创建 session + streaming events

- Status: passed
- Command: `HOME=/tmp/solo-agent-sdk-home ANTHROPIC_API_KEY=... PATH="$PWD/node_modules/.bin:$PATH" .venv/bin/python apps/spike/claude_sdk_spike.py v1`
- Expected: assistant/tool_use/tool_result event stream
- Test code snippet: see `apps/spike/claude_sdk_spike.py`
- Observed output: `SystemMessage` init included `session_id`; stream included `AssistantMessage`, `ToolUseBlock(name='Bash')`, `ToolResultBlock`, and `ResultMessage(subtype='success')` with `total_cost_usd` and `usage`.
- Architecture impact: session ID, cost, and usage are observable. Running with a clean `HOME` is required; otherwise user-level Claude Code MCP/plugins/skills are loaded and pollute tool surface/cost.

## V2 Tool permission callback

- Status: failed with fallback required
- Command: `HOME=/tmp/solo-agent-sdk-home ANTHROPIC_API_KEY=... PATH="$PWD/node_modules/.bin:$PATH" .venv/bin/python apps/spike/claude_sdk_spike.py v2`
- Expected: dangerous tool call can be intercepted before execution
- Observed output: callback was not called in either tested configuration. With `Bash` in `allowed_tools`, Bash executed directly. With `allowed_tools=[]` and `can_use_tool` returning deny for Bash, Bash still executed and `PERMISSION_DECISIONS []` was printed. Additional `PreToolUse` hook probe in streaming mode also failed to block Bash: CLI printed `Error in hook callback ... Stream closed`, `PRETOOL_HOOK_INPUTS []`, and Bash still executed.
- Architecture impact: do not rely on SDK `can_use_tool` or Python SDK hooks as the Stage 1 security boundary until this is resolved upstream or with a different SDK configuration. Fallback: run SDK with a minimal isolated `HOME` and use an external wrapper/allowlist plus filesystem sandboxing; dangerous tools must be absent from the execution environment for friend sessions.
- Implementation note: worker config now applies this fallback by stripping dangerous tools from friend sessions before invoking the SDK.

## V3 AskUserQuestion + resume

- Status: partial
- Command: `python apps/spike/claude_sdk_spike.py v3`
- Expected: resume preserves session identity and cost accumulation; expired resume rejected
- Observed output: `AskUserQuestion` tool is discoverable and callable. In headless SDK run it returned an error tool result (`Answer questions?`) instead of entering a durable awaiting-input state. Result still ended with `subtype='success'`; one retry event had `error_status=429`.
- Architecture impact: native AskUserQuestion does not yet prove the `awaiting_input` FSM. Fallback likely needed: mirror `AskUserQuestion` tool_use into `inbox_items`, stop worker ownership, then resume using explicit SDK session ID after external answer.

## V4 max_budget_usd

- Status: partial
- Command: `python apps/spike/claude_sdk_spike.py v4`
- Expected: identifiable budget exception or hook-readable usage fallback
- Observed output: stream emitted `ResultMessage(subtype='error_max_budget_usd', is_error=True, session_id=..., total_cost_usd=0.080988)`, then Python SDK raised generic `Exception('Command failed with exit code 1 ...')`.
- Architecture impact: budget exceeded is identifiable from `ResultMessage.subtype`, but not from a typed Python exception. Worker must inspect result messages and treat generic exceptions as secondary signal.
- Implementation note: worker SDK runner now treats `ResultMessage(subtype='error_max_budget_usd')` as terminal `failed` with reason `budget_exceeded`.

## V5 Subagent tracing

- Status: partial
- Command: `HOME=/tmp/solo-agent-sdk-home ANTHROPIC_API_KEY=... PATH="$PWD/node_modules/.bin:$PATH" .venv/bin/python apps/spike/claude_sdk_spike.py v5`
- Expected: child session ID and child cost/tokens are observable
- Observed output: parent emitted `ToolUseBlock(name='Agent')`; system emitted `task_started` with `task_id` and parent `session_id`; `task_notification` included child usage (`total_tokens`, `tool_uses`, `duration_ms`); tool result included `agentId: <task_id>` plus usage text. `SubagentStop` hook did not fire.
- Architecture impact: subagent identity is observable as `task_id`/`agentId`, not as an independent SDK session ID in this run. Cost/tokens are partly observable from task notification/tool result, but USD cost split must be derived by the platform. Mirror subagents into DB using platform-side child rows keyed by SDK `task_id`; `0001_init.sql` now includes `agent_sessions.sdk_task_id`.
- Implementation note: worker event normalization preserves `task_started` / `task_notification` system events in `session_events` so task usage can be mirrored later.

## V6 Session resume(volume 持久化)

- Status: partial
- Command: `HOME=/tmp/solo-agent-sdk-home ANTHROPIC_API_KEY=... PATH="$PWD/node_modules/.bin:$PATH" .venv/bin/python apps/spike/claude_sdk_spike.py v6`
- Expected: same-machine reboot resume works; cross-machine failure is documented
- Observed output: first run returned session id `527d2f19-471b-4539-acda-34834b8447d8`; second run with `ClaudeCodeOptions(resume=<session_id>)` initialized with the same session id and correctly recalled `resume-alpha-7319`. Fly volume persistence was separately verified in Deploy Verify run `25436592363` by writing a stamp under `/var/agent-workspaces`, restarting the machine, and reading the stamp back.
- Architecture impact: Python SDK `resume` takes the SDK session ID, not an explicit filesystem path. `sdk_session_path` should store the Claude Code project/memory root as supporting metadata; `sdk_session_id` is the primary resume handle and is now included in `0001_init.sql`.
- Implementation note: worker stores `sdk_session_id` from SDK init events and passes `resume=<sdk_session_id>` when present in job payload.

## V7 Signup bootstrap

- Status: passed in GitHub Actions; blocked locally
- Command: `pnpm spike:db-all` plus `pnpm spike:web-api` in DB Spike workflow run `25440165924`
- Expected: new invited user reaches dashboard within 30 seconds
- Observed output: V7 passed on real `pgvector/pgvector:pg16`: tenant created, user created as tenant owner, platform role inherited from invitation, invitation consumed. HTTP E2E also passed: `/api/invite/:code` returned the invite, `/api/auth/bootstrap` created the tenant/user, cleared the cookie, and consumed the invitation.
- Architecture impact: bootstrap data model matches Stage 1: a friend invitation creates a new tenant where the user is tenant `owner` and platform-level `friend`.

## V8 Bootstrap 异常路径

- Status: passed in GitHub Actions; blocked locally
- Command: `pnpm spike:db-all` in DB Spike workflow run `25440165924`
- Expected: expired/used/invalid invites are rejected without dirty data
- Observed output: expired, used, and missing invitation paths all rejected; tenant/user row counts remained clean.
- Architecture impact: bootstrap transaction boundaries are adequate for invalid invitation paths.

## V9 LISTEN/NOTIFY on Vercel

- Status: local DB semantics passed in GitHub Actions; Vercel-managed database runtime not tested
- Command: `pnpm spike:db-all` in DB Spike workflow run `25440165924`
- Expected: polling replay semantics pass; LISTEN/NOTIFY can be compared later on Vercel Pro
- Observed output: LISTEN/NOTIFY delivered five notifications and since replay returned seq `[1, 2, 3, 4, 5]`.
- Architecture impact: DB event log and replay semantics are sound. Vercel deployment behavior remains a separate runtime check.

## V10 jobs 表 SKIP LOCKED 多 worker 拉取

- Status: passed in GitHub Actions; blocked locally
- Command: `pnpm spike:db-all` in DB Spike workflow run `25440165924`
- Expected: no duplicate job consumption under concurrent workers
- Observed output: 8 workers claimed 50 jobs; all 50 claimed and no duplicate consumption.
- Architecture impact: Postgres `FOR UPDATE SKIP LOCKED` is viable for Stage 1 queue semantics.

## V11 RLS 跨租户隔离 E2E

- Status: passed in GitHub Actions; blocked locally
- Command: `pnpm spike:db-all` in DB Spike workflow run `25440165924`
- Expected: read/write/list/aggregate/JWT claim switch checks pass
- Observed output: read isolation, own-tenant write, cross-tenant write rejection, list isolation, aggregate isolation, and JWT claim switch all passed.
- Architecture impact: JWT custom claim RLS policy shape is viable for Stage 1 tenant isolation.

## DeepSeek V4 Pro backend smoke

- Status: passed locally
- Direct API path: set `AGENT_LLM_PROVIDER=deepseek`, `DEEPSEEK_API_KEY`, and optionally `DEEPSEEK_MODEL=deepseek-v4-pro`. The worker uses DeepSeek's OpenAI-compatible `/chat/completions` endpoint and records normal `status`, `message_chunk`, and terminal session result events.
- Claude Code SDK path: set `AGENT_LLM_PROVIDER=claude_code_deepseek`, `DEEPSEEK_API_KEY`, and `DEEPSEEK_MODEL=deepseek-v4-pro`. The worker routes the Claude Code SDK through DeepSeek's Anthropic-compatible endpoint.
- Observed output: direct DeepSeek API returned API model `deepseek-v4-pro`; Claude Code SDK path completed a one-turn response with a persisted SDK session id. Treat the response body's self-identified model text as untrusted; use the API model field and request/session metadata instead.
