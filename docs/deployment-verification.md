# Deployment Verification

Local `flyctl` / `vercel` CLIs are not required for deployment verification. The workaround is to run the manual GitHub Actions workflow `.github/workflows/deploy-verify.yml` with repository secrets.

## Required Secrets

Fly worker verification:

- `FLY_API_TOKEN`
- `FLY_APP_NAME`
- `FLY_REGION` optional, defaults to `sjc`

Vercel web verification:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_AUTOMATION_BYPASS_SECRET` exactly 32 alphanumeric characters, used to probe protected preview deployments from CI
- `VERCEL_DATABASE_URL` optional, only needed for deployed invite/bootstrap DB E2E

`VERCEL_DATABASE_URL` should point to a database where the migration has been applied. If it is not configured, the workflow still deploys Vercel and verifies `/chat` plus the `/templates` static fallback, but skips deployed invite/bootstrap DB E2E.

## What The Workflow Verifies

- Fly: creates/uses the app, ensures the `agent_workspaces` volume exists, deploys the worker in verification mode, writes a stamp under `/var/agent-workspaces`, restarts the machine, and confirms the stamp remains. Verification mode does not require a database URL.
- Vercel: enables the automation bypass secret for protected previews, deploys a preview build, checks `/chat`, checks `/templates` renders `general_assistant`, and runs `apps/spike/web_api_e2e.py` against the deployed URL only when `VERCEL_DATABASE_URL` is configured.

## Current Status

This repo has verified DB/runtime behavior, Fly volume reboot behavior, and Vercel preview deployment behavior in GitHub Actions. Latest successful runs:

- DB Spike: `25440165924`
- Fly Deploy Verify: `25436592363`
- Vercel Deploy Verify: `25440680723`
