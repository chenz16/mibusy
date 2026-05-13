# Hermes-Based v2 Implementation Goal

## Goal

Use the v2 product documents as the current implementation target:

- `docs/product/v2-desk-based-virtual-company-requirements.md`
- `docs/product/v2-boardroom-mobile-ui-design.md`
- `docs/product/v2-folder-sharing-and-context-permissions.md`

Executable MVP slice:

- `docs/implementation/v2-mvp-build-plan.md`

Build Mibusy as a product control plane on top of Hermes Agent as the execution foundation.

The product should not become a fork of Hermes. Hermes remains the runtime layer. Mibusy owns the company model, Desk model, staff roster, assignments, approvals, budgets, event log, and UI.

## Architectural Decision

```text
Mibusy Product Control Plane
  - users
  - workspaces
  - Desks
  - default system staff
  - customized permanent staff
  - assignments
  - handoffs
  - inbox approvals
  - deliverables
  - budget ledger
  - skill library
  - folder/context permissions
  - session event log

Runtime Adapter Layer
  - hermes_runner
  - deepseek_direct_runner
  - claude_code_runner

Hermes Agent Runtime
  - AIAgent
  - provider routing
  - tools runtime
  - skills
  - memory
  - delegate_task / subagents
  - gateway / cron surfaces if needed later
```

Mibusy is the source of truth. Hermes executes bounded work.

## Why Hermes Fits

From the local Hermes docs:

- `AIAgent` is the main conversation loop.
- It supports provider resolution across API modes, including OpenAI-compatible and Anthropic-style providers.
- It has a tool registry and dispatch runtime.
- It has skills and memory primitives.
- It supports `delegate_task` for isolated subagents.
- It has depth controls and default flat delegation.
- It has cron, gateway, and session persistence that can be used or wrapped later.

This maps well to Mibusy's needs:

| Mibusy Need | Hermes Capability |
|---|---|
| run one staff assignment | `AIAgent.run_conversation()` |
| use DeepSeek V4 Pro or other models | provider/runtime resolution |
| call tools | tools registry |
| create temporary helpers | `delegate_task` / subagents |
| skill accumulation | Hermes skills + Mibusy skill records |
| scheduled work | Hermes cron or Mibusy scheduler with Hermes runner |
| chat surfaces | Hermes gateway can inform future messaging integrations |

## Non-Goals

Do not make Hermes the product database.

Do not let Hermes directly own:

- permanent staff creation
- Desk permissions
- human memberships
- budget policy
- approval policy
- cross-human handoffs
- product-visible assignment tree
- final deliverable records
- raw Workspace or Desk folder access

Do not expose raw Hermes internals in the Boardroom UI.

Do not commit or modify the local `frameworks/hermes/hermes-agent/` clone. Treat it as a read-only reference until a deliberate integration strategy is chosen.

## Control Boundary

### Mibusy Controls

Mibusy controls durable product facts:

```text
workspace
Desk
human user
permanent virtual agent
default system staff template
assignment
assignment edge
handoff
inbox item
deliverable
skill record
memory item
folder
file
context pack
budget ledger entry
session event
```

### Hermes Controls

Hermes controls execution mechanics for one runtime turn or one bounded assignment:

```text
prompt assembly
model call
tool call
temporary runtime helper
skill execution
runtime memory
context compression
provider fallback
final response
```

Hermes receives a scoped assignment workspace, not the raw company filesystem.

Recommended runtime mount shape:

```text
/workspace
  /context       read-only materialized context pack
  /work          writable assignment scratch
  /deliverables  files intended for Mibusy ingestion
```

### Shared Contract

Hermes returns normalized events to Mibusy:

```text
status
message_chunk
tool_use
tool_result
delegate_request
handoff_request
approval_request
memory_proposal
skill_proposal
deliverable
final
error
```

The UI reads Mibusy events, not Hermes raw session files.

## Staff Model

### Default System Staff

New workspaces or Desks should start with default system staff templates:

```text
Chief of Staff
Research Specialist
Report Summarizer
Analyst
Writer
Scheduler
Meeting Note Taker
Inbox Triage
Follow-up Assistant
Beacon QA
```

These are product-level templates in Mibusy. A runtime profile determines how each role is executed.

Example:

```text
Research Specialist
  product identity: virtual_agents row
  runtime profile: hermes_deepseek_v4_pro
  tool policy: web + memory read + deliverable write
```

### Customized Permanent Staff

Humans can customize or duplicate default staff.

Customized copies belong to the workspace or Desk. Hermes does not create them silently.

### Temporary Runtime Helpers

Hermes can create temporary helpers while executing a task. In Mibusy they must be represented as assignment-scoped runtime artifacts:

```text
tmp-4831
  parent_assignment_id
  parent_agent_id
  ttl
  budget
  status
  trace
```

Temporary helpers:

- are not standing employees
- do not appear in the permanent staff roster
- cannot spawn further helpers by default
- can contribute to skill proposals after completion

## Delegation Model

There are two delegation paths.

### Manual Dispatch

The human directly assigns work:

```text
Human -> Staff
```

Mibusy creates an assignment and runs the target staff through Hermes.

### Automatic Dispatch

A staff agent requests delegation during execution:

```text
Hermes AIAgent
  -> tool call: delegate_task
  -> Mibusy Orchestrator
  -> policy decision
  -> child assignment or approval item
```

Important rule:

Hermes may request delegation; Mibusy approves and records it.

## Hermes Tool Bridge

Mibusy should expose a small set of Orchestrator-backed tools to Hermes.

### Required Tools

```text
mibusy_delegate_task
mibusy_request_handoff
mibusy_request_approval
mibusy_write_deliverable
mibusy_propose_memory
mibusy_propose_skill
mibusy_search_desk_memory
mibusy_search_company_memory
mibusy_read_context_pack
mibusy_request_folder_access
```

### Tool Behavior

`mibusy_delegate_task`:

- validates caller agent
- validates target staff
- validates Desk scope
- validates budget
- creates a child assignment or approval item
- returns structured result to Hermes

`mibusy_request_handoff`:

- creates a handoff proposal
- never directly commands another human

`mibusy_propose_skill`:

- creates a pending skill record
- links to task trace
- can route through Beacon QA

`mibusy_write_deliverable`:

- writes a durable deliverable record
- links to assignment, staff, Desk, context, and budget

## Skill Accumulation

After assignments complete, Mibusy should run a skill extraction pass.

Inputs:

- assignment prompt
- final deliverable
- tool trace
- human feedback
- repeated temporary helper patterns
- Beacon result if available

Outputs:

- new skill proposal
- existing skill improvement
- skill confidence update
- probation state update

Hermes may help generate or revise the skill. Mibusy owns skill approval, visibility, trust score, and installation.

## Runtime Profiles

Use runtime profiles to keep product identity separate from execution engine.

```text
runtime_profiles
  id
  name
  provider: hermes | deepseek_direct | claude_code
  model
  base_url
  tool_policy
  memory_policy
  max_iterations
  delegation_policy
```

Example profiles:

```text
hermes_deepseek_v4_pro
hermes_openrouter_fast
deepseek_direct_v4_pro
claude_code_deepseek
```

The same staff member can switch runtime profiles without changing product identity.

## Data Model Additions

The existing Stage 1 database can evolve toward these tables:

```text
desks
desk_memberships
virtual_agents
default_staff_templates
runtime_profiles
agent_permissions
assignments
assignment_edges
handoffs
deliverables
skills
skill_versions
context_packs
context_pack_items
budget_ledger
session_events
folders
files
folder_permissions
```

Minimum first migration for Hermes-first v2:

```text
desks
virtual_agents
runtime_profiles
assignments
assignment_edges
session_events
deliverables
skills
folders
files
context_packs
```

## UI Mapping

The Boardroom Mobile UI should read the Mibusy product model:

| UI | Product Data | Runtime Data |
|---|---|---|
| 今日 | assignments, inbox_items, deliverables | normalized session_events |
| 待审 | inbox_items | approval_request events |
| 团队 | virtual_agents, default_staff_templates, skills | runtime profile status |
| Beacon | skill tests, QA events | Hermes execution traces |
| 技能池 | skills, skill_versions | skill_proposal events |
| 临时 | temporary helper assignment artifacts | delegate_task traces |
| 会议室 | meetings, handoffs, assignment threads | message/tool events |

## Implementation Phases

### Phase 0: Keep Current App Working

Goal: preserve current UI and DeepSeek smoke path.

Tasks:

- keep existing Next app routes
- keep existing worker tests
- keep existing DeepSeek direct runner
- do not modify Hermes clone

### Phase 1: Hermes Runner Spike

Goal: run one Mibusy assignment through Hermes.

Deliverables:

- `apps/worker/src/solo_agent_worker/hermes_runner.py`
- a smoke probe under `apps/spike/`
- event normalization into current `session_events`
- tests for success and failure

Input:

```json
{
  "assignment_id": "...",
  "desk_id": "...",
  "agent_id": "...",
  "prompt": "...",
  "runtime_profile": "hermes_deepseek_v4_pro"
}
```

Output:

```text
status
message_chunk
final
error
```

No tool bridge yet.

### Phase 2: Product Schema v2 Thin Slice

Goal: create the minimum Desk/staff/assignment model.

Deliverables:

- migration for Desks
- migration for virtual agents
- migration for runtime profiles
- migration for assignments
- seed default system staff
- Boardroom UI reads real rows where available

### Phase 3: Hermes Tool Bridge

Goal: let Hermes request delegation without owning scheduling.

Deliverables:

- Mibusy tool module or MCP server for Hermes
- `mibusy_delegate_task`
- `mibusy_write_deliverable`
- `mibusy_request_approval`
- policy checks in Orchestrator
- tests for accepted / rejected / approval_required

### Phase 4: Temporary Helpers

Goal: expose runtime helpers as task artifacts, not employees.

Deliverables:

- child assignment creation for helper traces
- temp helper UI under 团队 -> 临时
- folded temp helper display in task detail
- budget and TTL tracking

### Phase 5: Skill Extraction

Goal: turn repeated work into skills.

Deliverables:

- post-assignment skill extraction job
- skill proposal records
- Beacon QA flow
- skill probation UI
- promote / reject actions

### Phase 6: Handoffs and Multi-Desk

Goal: support real humans and multiple Desks.

Deliverables:

- handoff records
- target user inbox
- accept / reject handoff
- context pack transfer
- target Desk assignment creation

## Key Engineering Risks

### Risk: Hermes Becomes the Product Authority

Mitigation:

- never write product facts directly from Hermes internals
- force all product mutations through Mibusy tools
- keep normalized events as the contract

### Risk: Deep Agent Hierarchy Leaks into UI

Mitigation:

- default Hermes delegation depth stays flat
- temporary helpers are folded under tasks
- permanent staff creation requires human action

### Risk: Skills and Memory Split-Brain

Mitigation:

- Mibusy owns skill records and visibility
- Hermes skills can be generated artifacts or execution assets
- Mibusy records provenance and approval state

### Risk: Runtime Lock-In

Mitigation:

- use runtime profiles
- keep deepseek_direct and claude_code runners available
- make Hermes an adapter, not a replacement for product contracts

## Near-Term Build Order

1. Add `hermes_runner.py` as a read-only integration spike.
2. Add `v2` schema tables for Desk, virtual staff, runtime profile, assignment.
3. Seed default system staff.
4. Point Boardroom UI mock data toward product-shaped records.
5. Implement `mibusy_write_deliverable`.
6. Implement `mibusy_delegate_task`.
7. Add temporary helper tracking.
8. Add skill proposal extraction.

## Acceptance Criteria

The Hermes-based v2 goal is on track when:

1. A Boardroom task can run through Hermes and produce a normalized event trace.
2. Permanent staff are Mibusy rows, not Hermes subagents.
3. Default system staff are seeded and visible in the 团队 tab.
4. Hermes-requested delegation creates Mibusy assignments or approval items.
5. Temporary helpers appear as task artifacts, not staff roster entries.
6. Completed task traces can propose skills.
7. The user can understand the system without seeing a deep agent org chart.
8. The code can still run a non-Hermes runner through the same assignment contract.

## Test Standards

These are the gates for keeping v2 development stable. A change should not be considered complete unless the relevant gates pass.

Visual review version: `docs/implementation/hermes-v2-test-standards.html`.

### Gate 1: Product Model Invariants

Purpose: prevent the product from drifting back into a confusing agent-org-chart model.

Required checks:

- permanent staff can only be created, enabled, disabled, duplicated, or customized by a human action
- runtime-created helpers are always temporary and assignment-scoped
- temporary helpers cannot become permanent staff without explicit human approval
- agents can request delegation, but only Orchestrator can create child assignments
- agents cannot directly command another human
- cross-human work always becomes a handoff
- skills can be proposed automatically, but promotion/publication requires policy or human approval

Test form:

- unit tests for Orchestrator policy decisions
- schema constraints where possible
- regression fixtures for forbidden transitions

Minimum cases:

```text
agent -> create permanent staff: rejected
agent -> spawn temp helper within budget: accepted
temp helper -> spawn helper: rejected
agent -> delegate to permitted staff: accepted
agent -> delegate to unpermitted staff: rejected
agent -> request another human's work: handoff proposal, not direct assignment
completed task -> skill proposal: pending, not auto-published
```

### Gate 2: Runtime Adapter Contract

Purpose: keep Hermes swappable and prevent runtime lock-in.

Every runner must conform to the same assignment contract:

```text
input:
  assignment_id
  desk_id
  agent_id
  prompt
  context_pack
  runtime_profile
  budget_limit

output events:
  status
  message_chunk
  tool_use
  tool_result
  delegate_request
  approval_request
  handoff_request
  memory_proposal
  skill_proposal
  deliverable
  final
  error
```

Required checks:

- Hermes runner emits normalized events, not raw Hermes-only records
- DeepSeek direct runner still works through the same event contract
- runner failures become `error` events and terminal failed assignments
- budget or iteration limit is visible in events
- no runner writes product state except through Orchestrator tools

Test form:

- unit tests for event normalization
- fake Hermes response fixtures
- fake failure fixtures
- one smoke test for real provider when API key is present

### Gate 3: Orchestrator Tool Bridge

Purpose: make agent self-dispatch useful but bounded.

Tools exposed to Hermes must be tested as product tools, not runtime shortcuts.

Required tools:

```text
mibusy_delegate_task
mibusy_request_handoff
mibusy_request_approval
mibusy_write_deliverable
mibusy_propose_skill
```

Required checks:

- each tool validates caller identity
- each tool validates Desk scope
- each tool validates assignment status
- each tool validates budget where applicable
- each tool writes an auditable event
- each tool returns structured JSON to Hermes

Minimum cases:

```text
delegate_task accepted -> child assignment created
delegate_task over budget -> approval item created or rejected
delegate_task forbidden target -> rejected
write_deliverable -> deliverable linked to assignment
request_handoff -> target user's inbox item created
propose_skill -> pending skill linked to trace
```

### Gate 4: UI Product Semantics

Purpose: make sure the Boardroom UI reflects v2, not v1 control-plane language.

Required checks:

- bottom tabs remain 今日 / 待审 / 团队 / 会议室
- default system staff, customized permanent staff, Beacon, skills, and temporary helpers are visually distinct
- temporary helpers never appear as standing employees
- task detail is task-first, not org-chart-first
- delegation is shown as task trace or assignment tree
- Hermes internals are not exposed as primary UI labels
- user-facing copy avoids `session`, `template`, `job`, `agent graph` unless in developer/debug surfaces

Test form:

- component/page tests where available
- Playwright screenshot checks for mobile viewport
- text audit for forbidden product terms in main user routes

Minimum routes:

```text
/chat       今日
/inbox      待审
/templates  团队
/observe    会议室
```

### Gate 5: Skill and Memory Safety

Purpose: let experience compound without corrupting shared knowledge.

Required checks:

- task completion may create a skill proposal
- skill proposal records source assignment and trace
- Beacon or review can approve/reject skill promotion
- default system skills cannot be overwritten by runtime output
- Desk memory writes can be pending before approval
- company memory visibility follows workspace policy

Minimum cases:

```text
runtime proposes new skill -> pending skill version
Beacon passes skill -> eligible for promotion
Beacon fails skill -> remains probation/rejected
agent proposes memory -> pending or scoped write
private Desk memory -> not visible to unrelated Desk
```

### Gate 6: Regression Baseline

Purpose: keep existing Stage 1 work from breaking while v2 is added.

Required command:

```bash
pnpm verify:offline
```

This must continue to pass unless the command is intentionally replaced by a v2 verification command in the same PR.

Required checks inside or beside the baseline:

- web build
- TypeScript typecheck
- artifact audit
- worker tests
- DeepSeek direct runner tests
- Hermes runner tests once added

### Gate 7: Real Smoke Tests

Purpose: catch integration failures that unit tests miss.

Run when credentials are available:

```text
DeepSeek direct V4 Pro smoke
Hermes + DeepSeek V4 Pro smoke
Hermes runner one-assignment smoke
delegate_task tool bridge smoke
```

Smoke tests should not print secrets. They may print:

- provider
- API model field
- request/session id
- token count
- normalized event kinds
- final short response

### Gate 8: Migration Safety

Purpose: avoid breaking existing data as v2 schema appears.

Required checks:

- migrations are additive until a cutover is explicitly planned
- v1 tables can coexist with v2 tables
- seeds create default system staff idempotently
- no destructive migration without backup plan
- old UI fallback works if v2 rows are absent

Minimum cases:

```text
fresh DB -> seeds default staff
existing DB -> migration preserves existing sessions/templates
re-run seed -> no duplicate default staff
missing runtime profile -> assignment fails with clear error
```

### Gate 9: Observability

Purpose: make failures debuggable.

Every assignment should expose:

- runner provider
- runtime profile
- model
- assignment id
- Desk id
- staff id
- parent assignment id if any
- event sequence
- budget/tokens if available
- terminal status
- error reason if failed

Minimum cases:

```text
successful Hermes run -> status/message/final events
failed Hermes run -> status/error/terminal failed
delegated task -> parent and child assignment ids linked
temporary helper -> parent assignment and TTL visible
```

### Gate 10: Definition of Done for a v2 Feature

A v2 feature is done only when:

1. It preserves the product invariants.
2. It uses Mibusy as the source of truth.
3. It exposes Hermes through an adapter or tool bridge.
4. It has unit tests for policy and event mapping.
5. It has at least one smoke path or mocked integration fixture.
6. It does not modify the Hermes clone.
7. `pnpm verify:offline` passes.
8. The UI language matches Boardroom v2 semantics.
