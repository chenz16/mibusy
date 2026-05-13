# Mibusy v2 MVP Build Plan

## Purpose

This is the executable v2 plan.

The larger v2 documents describe the ideal product. This document defines the first implementation slice.

Goal:

> A CEO opens Boardroom, assigns work to default virtual staff, Hermes runs the assignment, and Mibusy records events, decisions, and deliverables.

## Current Source Documents

- Product model: `docs/product/v2-desk-based-virtual-company-requirements.md`
- UI model: `docs/product/v2-boardroom-mobile-ui-design.md`
- Folder/context model: `docs/product/v2-folder-sharing-and-context-permissions.md`
- Hermes implementation goal: `docs/implementation/hermes-v2-implementation-goal.md`
- Test standards: `docs/implementation/hermes-v2-test-standards.html`

## MVP Boundary

### In

```text
one workspace
one human user
one CEO Desk
default system staff
assignments
runtime profiles
Hermes runner
normalized session events
deliverables
simple context pack
Boardroom mobile UI
```

### Out

```text
multi-human workspace
multi-Desk handoff
full folder permission UI
public skill marketplace
full Beacon workflow
deep agent hierarchy
agent-created permanent staff
complex memory governance
billing
external messaging gateway
```

## First E2E

This is the first flow to make real.

```text
1. User opens Boardroom Today.
2. User types: "Research the K-12 robotics market and give me a CEO summary."
3. Mibusy creates assignment assigned to Atlas.
4. Atlas runs through Hermes runtime profile.
5. Hermes emits normalized events.
6. Mibusy stores status/message/final events.
7. Mibusy creates one deliverable.
8. Boardroom Today shows the assignment as completed.
9. Deliverable is visible from the task card.
```

No automatic delegation is required in the first E2E.

## Second E2E

Add controlled self-dispatch.

```text
1. User assigns a research task to Atlas.
2. Atlas calls mibusy_delegate_task for Research Specialist.
3. Orchestrator validates permission and budget.
4. Mibusy creates child assignment.
5. Research Specialist runs through Hermes.
6. Parent task shows child assignment trace.
7. Final deliverable references both assignments.
```

## Minimal Concepts

### Workspace

For MVP, create one default workspace.

No workspace switching yet.

### User

For MVP, assume one owner user.

No team invitation yet.

### Desk

Create one CEO Desk.

No multi-Desk UX yet.

### Default System Staff

Seed these as permanent virtual agents:

```text
Atlas                Chief of Staff
Nova                 Research Specialist
Ledger               Analyst
Quill                Writer
Scheduler            Scheduler
Beacon               QA / Skill Tester
```

Beacon can be present in UI but does not need full workflow in MVP.

### Assignment

Assignment is the main product object.

MVP fields:

```text
id
workspace_id
desk_id
title
prompt
assigned_to_agent_id
created_by_user_id
parent_assignment_id nullable
root_assignment_id
status: queued | running | awaiting_input | completed | failed
runtime_profile_id
budget_limit
created_at
updated_at
```

### Session Event

Events are the normalized contract.

MVP event kinds:

```text
status
message_chunk
tool_use
tool_result
delegate_request
deliverable
final
error
```

### Deliverable

MVP fields:

```text
id
assignment_id
workspace_id
desk_id
title
body
format: markdown | text | json
created_by_agent_id
created_at
```

### Context Pack

MVP context pack can be simple:

```text
id
assignment_id
summary
items_json
```

No full folder permission system yet.

## Minimal Schema

Add or adapt tables for:

```text
desks
virtual_agents
runtime_profiles
assignments
assignment_events
deliverables
context_packs
```

Keep existing v1 tables until replacement is explicit.

Migrations should be additive.

## Hermes Runner MVP

Implement:

```text
apps/worker/src/solo_agent_worker/hermes_runner.py
```

Input:

```json
{
  "assignment_id": "uuid",
  "desk_id": "uuid",
  "agent_id": "uuid",
  "prompt": "string",
  "context_pack": {},
  "runtime_profile": "hermes_deepseek_v4_pro",
  "budget_limit": 1.0
}
```

Output:

```text
status
message_chunk
final
error
```

Later output:

```text
tool_use
tool_result
delegate_request
deliverable
```

## Orchestrator MVP

The Orchestrator can start as a Python module, not a separate service.

Responsibilities:

- create assignment
- set assignment running
- append normalized events
- set terminal status
- create deliverable
- reject unsupported delegation

Do not build the full policy engine yet.

## Tool Bridge MVP

Do not expose all tools at once.

First tool:

```text
mibusy_write_deliverable
```

Second tool:

```text
mibusy_delegate_task
```

Everything else waits.

## UI MVP

Keep the current routes:

```text
/chat       今日
/inbox      待审
/templates  团队
/observe    会议室
```

MVP UI should show:

- default staff list
- active assignment
- completed deliverable
- event trace summary
- pending decision placeholder

Do not build:

- full agent profile
- full skills UI
- folder management UI
- multi-human handoff UI

## Test Gates for MVP

### Required Local Command

```bash
pnpm verify:offline
```

### New Unit Tests

Add tests for:

```text
Hermes runner normalizes success
Hermes runner normalizes failure
assignment lifecycle queued -> running -> completed
assignment lifecycle queued -> running -> failed
deliverable links to assignment
agent cannot create permanent staff
temp helper cannot spawn helper
```

### New Smoke Tests

When credentials are present:

```text
Hermes + DeepSeek V4 Pro one-prompt smoke
Mibusy assignment -> Hermes -> final event smoke
```

### UI Checks

At minimum:

```text
/chat renders 今日
/templates renders default staff
/observe renders event/meeting placeholder
no raw Hermes labels in main user routes
```

## Build Sequence

### Step 1: Schema

Add v2 additive tables and seeds:

```text
desks
virtual_agents
runtime_profiles
assignments
assignment_events
deliverables
context_packs
default CEO Desk
default system staff
default Hermes runtime profile
```

### Step 2: Hermes Runner Spike

Run one assignment through Hermes.

If direct Hermes library integration is too heavy, use the Hermes CLI/library smoke path first and normalize its output.

Do not modify Hermes clone.

### Step 3: Assignment Lifecycle

Wire worker:

```text
job -> assignment -> runner -> events -> deliverable -> terminal status
```

### Step 4: Boardroom Data

Read v2 rows into the existing Boardroom UI.

Fallback to mock data if DB is missing.

### Step 5: Delegate Task

Add controlled child assignment creation.

Flat only:

```text
Atlas -> Nova
Atlas -> Ledger
Atlas -> Quill
```

No nested permanent hierarchy.

### Step 6: Skill Proposal

After completed assignment, create a pending skill proposal from trace.

No full Beacon workflow yet.

## Stop Conditions

Pause and reassess if:

- Hermes integration requires modifying Hermes source
- runner cannot emit normalized events
- assignment lifecycle cannot be tested locally
- UI starts requiring a full org chart
- folder permission work blocks first E2E
- `pnpm verify:offline` cannot be restored quickly

## Definition of Done

The MVP is done when:

1. The first E2E works locally.
2. At least one assignment runs through Hermes.
3. Mibusy stores normalized events.
4. Mibusy stores a deliverable.
5. Boardroom Today shows the result.
6. Default staff are visible in Team.
7. The code does not modify Hermes clone.
8. `pnpm verify:offline` passes.
