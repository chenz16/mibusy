# Completion Audit

Objective: use `agent-platform-stage1-spec.md` as the active goal, implement the requested Stage 1 / Week 0 spike work in this repository, and verify the result.

Current verdict: not complete. Week 0 still requires runtime verification for DB-backed checks and Fly/Vercel deployment checks.

## Deliverable Checklist

| Requirement | Evidence | Status |
|---|---|---|
| Monorepo skeleton with `apps/web` | `apps/web/package.json`, `apps/web/app/page.tsx` | Done |
| Monorepo skeleton with `apps/worker` | `apps/worker/pyproject.toml`, worker source files | Done |
| Monorepo skeleton with `apps/spike` | `apps/spike/claude_sdk_spike.py`, `apps/spike/db_spike.py` | Done |
| Docker Compose Postgres + pgvector | `docker-compose.yml` | Artifact done; runtime blocked locally |
| W0 migration | `packages/db/migrations/0001_init.sql` | Done; parser check passed |
| Seed templates | Five global templates and initial DAG edges in `0001_init.sql`; static DAG audit checks acyclic edges | Done; runtime DB insert blocked locally |
| Spike report | `docs/spike-report.md` | In progress |
| Artifact verifier | `apps/spike/artifact_audit.py` | Done |
| Next SSE route | `apps/web/app/api/sessions/[id]/events/route.ts` | Done; build/typecheck passed |
| Stage 1 UI shell | `/chat`, `/tasks`, `/schedules`, `/inbox`, `/memory`, `/templates`, `/observe`, `/settings` routes | Done; static shell only |
| Shared TypeScript contracts | `packages/shared-types/src/index.ts`; web SSE route imports shared event payload types | Done; typecheck passed |
| Signup bootstrap routes | `apps/web/app/api/invite/[code]/route.ts`, `apps/web/app/api/auth/bootstrap/route.ts` | Done; runtime DB E2E blocked |
| Worker long process skeleton | `apps/worker/src/solo_agent_worker/main.py` | Done |
| Worker jobs table pickup | `apps/worker/src/solo_agent_worker/db.py` uses `FOR UPDATE SKIP LOCKED` | Done; runtime DB E2E blocked |
| Worker SDK runner | `apps/worker/src/solo_agent_worker/sdk_runner.py` | Done; unit covered |
| Fly single-machine volume config | `apps/worker/fly.toml.example` | Artifact done; deploy/reboot blocked |

## Verification Checklist

| Check | Command / Evidence | Status |
|---|---|---|
| Web typecheck | `pnpm --filter web typecheck` | Passed |
| Web production build | `pnpm --filter web build` | Passed; 12 routes generated |
| Artifact audit | `pnpm spike:audit` | Passed |
| SQL parser audit | `. .venv/bin/activate && python apps/spike/artifact_audit.py` | Passed, 59 statements |
| Worker compile | `PYTHONPATH=apps/worker/src python -m py_compile $(find apps/worker/src apps/spike -name '*.py')` | Passed |
| Worker unit tests | `PYTHONPATH=apps/worker/src python -m pytest apps/worker/tests` | Passed, 7 tests |
| Offline verification bundle | `pnpm verify:offline` | Passed; runs web build, TS typecheck, artifact audit, worker tests. SQL parser check is optional unless `pglast` is installed |
| DB runtime CI | `.github/workflows/db-spike.yml` runs pgvector Postgres service, `db:preflight`, `db:migrate`, `spike:db-all` | Added; not observed on GitHub yet |
| SDK V1 | `python apps/spike/claude_sdk_spike.py v1` with clean `HOME` and API key | Passed |
| SDK V2 | `python apps/spike/claude_sdk_spike.py v2`, `v2hook` | Failed; fallback required |
| SDK V3 | `python apps/spike/claude_sdk_spike.py v3` | Partial |
| SDK V4 | `python apps/spike/claude_sdk_spike.py v4` | Partial |
| SDK V5 | `python apps/spike/claude_sdk_spike.py v5` | Partial |
| SDK V6 local resume | `python apps/spike/claude_sdk_spike.py v6` | Partial; Fly volume not tested |
| DB V7 | `python apps/spike/db_spike.py v7` | Blocked locally |
| DB V8 | `python apps/spike/db_spike.py v8` | Blocked locally |
| DB V9 | `python apps/spike/db_spike.py v9` | Blocked locally; Vercel Pro optional check not run |
| DB V10 | `python apps/spike/db_spike.py v10` | Blocked locally |
| DB V11 | `python apps/spike/db_spike.py v11` | Blocked locally |

## Current Blockers

- Local Docker daemon is not accessible to the current user.
- Local `postgres` / `psql` binaries are not installed.
- Fly deployment/reboot test has not been run.
- Vercel LISTEN/NOTIFY test has not been run.

## Next Commands Once Postgres Is Available

```bash
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/solo_agent'
export APP_DATABASE_URL='postgresql://app_user:app_password@localhost:5432/solo_agent'
pnpm db:preflight
pnpm db:migrate
pnpm spike:db-all
```
