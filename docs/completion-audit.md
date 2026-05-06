# Completion Audit

Objective: use `agent-platform-stage1-spec.md` as the active goal, implement the requested Stage 1 / Week 0 spike work in this repository, and verify the result.

Current verdict: not complete for the full Stage 1 product. Week 0 spike/runtime evidence is now green across DB Spike, Fly Deploy Verify, and Vercel Deploy Verify; remaining gaps are product-complete Stage 1 behavior such as real deployed DB-backed invite/bootstrap, Vercel LISTEN/NOTIFY comparison, and non-skeleton UI workflows.

## Deliverable Checklist

| Requirement | Evidence | Status |
|---|---|---|
| Monorepo skeleton with `apps/web` | `apps/web/package.json`, `apps/web/app/page.tsx` | Done |
| Monorepo skeleton with `apps/worker` | `apps/worker/pyproject.toml`, worker source files | Done |
| Monorepo skeleton with `apps/spike` | `apps/spike/claude_sdk_spike.py`, `apps/spike/db_spike.py` | Done |
| Docker Compose Postgres + pgvector | `docker-compose.yml`; GitHub Actions uses `pgvector/pgvector:pg16` | Artifact done; runtime verified in CI |
| W0 migration | `packages/db/migrations/0001_init.sql` | Done; parser check passed |
| Seed templates | Five global templates and initial DAG edges in `0001_init.sql`; static DAG audit checks acyclic edges; migration applied and `/templates` DB page verified in DB Spike run `25440165924` | Done |
| Spike report | `docs/spike-report.md` | Updated |
| Artifact verifier | `apps/spike/artifact_audit.py` | Done |
| Next SSE route | `apps/web/app/api/sessions/[id]/events/route.ts` | Done; build/typecheck passed |
| Stage 1 UI shell | `/chat`, `/tasks`, `/schedules`, `/inbox`, `/memory`, `/templates`, `/observe`, `/settings` routes | Done; mostly static shell, with `/templates` reading DB when `DATABASE_URL` is configured |
| Shared TypeScript contracts | `packages/shared-types/src/index.ts`; web SSE route imports shared event payload types | Done; typecheck passed |
| Signup bootstrap routes | `apps/web/app/api/invite/[code]/route.ts`, `apps/web/app/api/auth/bootstrap/route.ts`; V7/V8 DB harness and `pnpm spike:web-api` passed in run `25440165924` | Done |
| Worker long process skeleton | `apps/worker/src/solo_agent_worker/main.py` | Done |
| Worker jobs table pickup | `apps/worker/src/solo_agent_worker/db.py` uses `FOR UPDATE SKIP LOCKED`; V10 DB harness passed in run `25416814966` | Done |
| Worker SDK runner | `apps/worker/src/solo_agent_worker/sdk_runner.py` | Done; unit covered |
| Fly single-machine volume config | `apps/worker/fly.toml.example`; Deploy Verify run `25436592363` | Passed |

## Verification Checklist

| Check | Command / Evidence | Status |
|---|---|---|
| Web typecheck | `pnpm --filter web typecheck` | Passed |
| Web production build | `pnpm --filter web build` | Passed; 12 routes generated |
| Artifact audit | `pnpm spike:audit` | Passed |
| SQL parser audit | `. .venv/bin/activate && python apps/spike/artifact_audit.py` | Passed, 59 statements |
| Worker compile | `PYTHONPATH=apps/worker/src python -m py_compile $(find apps/worker/src apps/spike -name '*.py')` | Passed |
| Worker unit tests | `PYTHONPATH=apps/worker/src python -m pytest apps/worker/tests` | Passed, 7 tests |
| Offline verification bundle | Local `pnpm verify:offline`; GitHub Actions Offline Verify run `25416607958` | Passed; runs web build, TS typecheck, artifact audit, worker tests. SQL parser check is optional unless `pglast` is installed |
| DB runtime CI | `.github/workflows/db-spike.yml` run `25440165924` on branch `stage1-agent-platform-verify` | Passed |
| Deployment verification workflow | `.github/workflows/deploy-verify.yml`; `docs/deployment-verification.md`; Fly target run `25436592363`; Vercel target run `25440680723` | Passed for Fly and Vercel |
| SDK V1 | `python apps/spike/claude_sdk_spike.py v1` with clean `HOME` and API key | Passed |
| SDK V2 | `python apps/spike/claude_sdk_spike.py v2`, `v2hook` | Failed; fallback required |
| SDK V3 | `python apps/spike/claude_sdk_spike.py v3` | Partial |
| SDK V4 | `python apps/spike/claude_sdk_spike.py v4` | Partial |
| SDK V5 | `python apps/spike/claude_sdk_spike.py v5` | Partial |
| SDK V6 local resume | `python apps/spike/claude_sdk_spike.py v6`; Deploy Verify run `25436592363` | Partial SDK resume; Fly volume reboot verified |
| DB V7 | `pnpm spike:db-all` in DB Spike run `25440165924` | Passed |
| DB V8 | `pnpm spike:db-all` in DB Spike run `25440165924` | Passed |
| DB V9 | `pnpm spike:db-all` in DB Spike run `25440165924` | Passed for local Postgres LISTEN/NOTIFY and replay; Vercel Pro runtime not run |
| DB V10 | `pnpm spike:db-all` in DB Spike run `25440165924` | Passed |
| DB V11 | `pnpm spike:db-all` in DB Spike run `25440165924` | Passed |
| Web API invite/bootstrap E2E | `pnpm spike:web-api` in DB Spike run `25440165924` | Passed |
| Templates page DB read | DB Spike run `25440165924`; Vercel Deploy Verify run `25440680723` | DB-backed in DB Spike; fallback rendered on Vercel without DB |

## Current Blockers

- Local Docker daemon is not accessible to the current user.
- Local `postgres` / `psql` binaries are not installed.
- Vercel LISTEN/NOTIFY test has not been run against a Vercel-managed database.
- HTTP-level invite/bootstrap E2E passed against `next start` in CI; deployed Vercel invite/bootstrap DB E2E is skipped until `VERCEL_DATABASE_URL` is configured.
- Fly deployment/reboot test passed in Deploy Verify run `25436592363`.
- Vercel deployment/protected-preview probing passed in Deploy Verify run `25440680723`.

## DB Runtime Evidence

- GitHub Actions DB Spike run: `25440165924`
- Branch: `stage1-agent-platform-verify`
- Commit: `3fbe7ab`
- Steps passed: `db:preflight`, `db:migrate`, `spike:db-all`
- V7-V11 output passed: invitation bootstrap happy path, invite exception paths, LISTEN/NOTIFY + replay, SKIP LOCKED queue consumption, RLS cross-tenant isolation.
- Web API E2E output passed: invite lookup, bootstrap response, cookie clearing, user persistence, platform role persistence, invitation consumption.
- Templates page check passed after restoring seed templates: `/templates` rendered `Live DB`, `general_assistant`, and `scheduler_agent`.

## Offline Runtime Evidence

- GitHub Actions Offline Verify run: `25416607958`
- Branch: `stage1-agent-platform-verify`
- Commit: `12001c4`
- Steps passed: dependency installation and `pnpm verify:offline`.

## Fly Runtime Evidence

- GitHub Actions Deploy Verify run: `25436592363`
- Branch: `stage1-agent-platform-verify`
- Commit: `0e1b83a`
- Target: `fly`
- Steps passed: app/volume check, verification-mode deploy, volume stamp write, machine restart, stamp read after restart.

## Vercel Runtime Evidence

- GitHub Actions Deploy Verify run: `25440680723`
- Branch: `stage1-agent-platform-verify`
- Commit: `40cb372`
- Target: `vercel`
- Steps passed: Vercel secret check, project link, automation bypass configuration, Next 16 preview build/deploy, `/chat` probe, `/templates` probe for `general_assistant`.
- Limitation: `VERCEL_DATABASE_URL` is not configured, so deployed invite/bootstrap DB E2E is intentionally skipped.
