# MiBusy

MiBusy is a boardroom-style virtual team platform for a solo owner, manager, or CEO. The product goal is not to expose a deep agent org chart. The owner manages trusted staff, tasks, decisions, deliverables, budgets, schedules, and shared context; the runtime can create short-lived lower-level agent work as needed.

The current product direction is V2: a Desk-based virtual company built on top of Hermes-style agent runtime concepts, with a mobile-first boardroom UI.

## What Is Here

- `apps/web`: Next.js app for the owner UI, chat, staff management, tasks, meetings, delivery center, schedules, and API routes.
- `apps/worker`: Python worker/runtime experiments for executing assignments through SDK/Hermes-style runners.
- `apps/spike`: verification scripts and SDK/database spikes.
- `packages/db/migrations`: PostgreSQL schema migrations.
- `packages/shared-types`: shared TypeScript contracts.
- `docs/product`: product requirements and UI specs. `v2-*` files are current; `v1-*` files are historical.
- `docs/implementation`: MVP build plan, Hermes implementation goal, deployment notes, SDK audit, and test standards.
- `frameworks/hermes/hermes-agent`: local reference checkout for Hermes. It is treated as upstream framework code and should not be modified or committed.

## Core Product Model

MiBusy organizes work around a small owner-facing team:

- **Staff**: persistent virtual or human-backed roles such as research, reporting, finance, scheduling, and writing.
- **Tasks**: owner-managed work units with status, decision points, budgets, and deliverables.
- **Meetings**: temporary boardroom discussions with CEO participation, agent responses, summaries, and reopenable discussion.
- **Delivery Center**: running work, scheduled future work, and completed deliverables.
- **Desks and Context**: shared workspace, files, skills, memory, and permission boundaries.

The system should stay shallow for the owner. More complexity should come from more humans, more Desks, and better shared context, not an infinite virtual management hierarchy.

## Quick Start

Install dependencies:

```bash
pnpm install
```

Start PostgreSQL:

```bash
pnpm db:up
```

Create local environment files from `.env.example` and set the secrets you need:

```bash
cp .env.example .env
cp .env.example apps/web/.env.local
```

Run database migrations:

```bash
pnpm db:migrate
```

Start the web app:

```bash
pnpm dev
```

Open:

```text
http://127.0.0.1:3000
```

Useful routes:

- `/chat`: owner boardroom chat
- `/observe`: delivery center
- `/meeting`: meeting room
- `/templates`: staff and template management

## Environment

Required for local DB-backed development:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/solo_agent
APP_DATABASE_URL=postgresql://app_user:app_password@localhost:5432/solo_agent
```

Optional provider secrets depend on the test path:

```bash
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
USE_LISTEN_NOTIFY=false
```

Do not commit real API keys, Fly tokens, Vercel tokens, recovery codes, or OAuth secrets.

## Verification

Typecheck the app:

```bash
pnpm --filter web typecheck
```

Run the broader repository typecheck:

```bash
pnpm typecheck
```

Run worker tests:

```bash
pnpm test:worker
```

Run offline verification:

```bash
pnpm verify:offline
```

Some verification paths require a running database and configured provider API keys.

## Development Notes

- Prefer the V2 docs in `docs/product` and `docs/implementation` as the current source of product truth.
- Keep Hermes framework code as a reference dependency. Build MiBusy integration around it rather than editing Hermes directly.
- Treat the owner-facing hierarchy as one level: owner to trusted staff. Runtime-only subagents may be created on demand, but they should not become a deep persistent org chart in the UI.
- For UI changes, test mobile first. The boardroom UI is designed around phone usage.
- For mixed worktrees, stage files explicitly and avoid committing generated artifacts such as screenshots, `.next`, logs, local env files, or framework checkouts.

## Deployment

The intended split is:

- Web app: deployable to Vercel or another Next.js host.
- Worker/runtime: deployable to Fly.io or another always-on worker host.
- Database: managed PostgreSQL with pgvector support.

Deployment notes live in `docs/implementation/deployment/deployment-verification.md`.
