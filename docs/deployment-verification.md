# Deployment Verification

Local `flyctl` / `vercel` CLIs are not required for deployment verification. The workaround is to run the manual GitHub Actions workflow `.github/workflows/deploy-verify.yml` with repository secrets.

## Required Secrets

Fly worker verification:

- `FLY_API_TOKEN`
- `FLY_APP_NAME`
- `FLY_DATABASE_URL`
- `FLY_REGION` optional, defaults to `sjc`

Vercel web verification:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_DATABASE_URL`

`VERCEL_DATABASE_URL` should point to a database where the migration has been applied. The Vercel project also needs its `DATABASE_URL` environment variable configured to the same database or another migrated database.

## What The Workflow Verifies

- Fly: creates/uses the app, ensures the `agent_workspaces` volume exists, deploys the worker, writes a stamp under `/var/agent-workspaces`, restarts the machine, and confirms the stamp remains.
- Vercel: deploys a preview build, checks `/chat`, then runs `apps/spike/web_api_e2e.py` against the deployed URL to verify invite lookup and auth bootstrap over HTTP.

## Current Status

This repo has verified DB/runtime behavior in GitHub Actions, but has not completed deployed Fly/Vercel verification because the required cloud credentials are not configured in this environment.
