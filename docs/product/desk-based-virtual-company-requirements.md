# Desk-Based Virtual Company Requirements

## Summary

Mibusy should model a company as real humans plus virtual staff working through shared role workspaces called **Desks**.

The product should not expose a deep virtual org chart where agents manage agents. The owner should manage tasks, decisions, deliverables, budgets, and a small set of trusted staff. Company complexity should grow through more humans, more Desks, and more shared context, not through infinite agent hierarchy.

If a CEO or manager needs more permanent staff, they should explicitly hire or create those staff members in the product. If they do not create permanent staff, the underlying runtime may still create short-lived task helpers on demand, but those helpers are not standing members of the organization. They are temporary execution artifacts with a parent assignment, TTL, budget, and audit trail.

The system may automatically extract reusable skills after tasks complete. This lets runtime experience compound without forcing the user to manage more agent layers. The product should simplify hierarchy for real users: agents may call each other through controlled tools, but the visible staff structure remains shallow.

Core principle:

> Humans own accountability. Virtual agents execute within a human-owned Desk. Cross-person collaboration happens through handoffs and shared artifacts.

## Ideal Product Model

### Workspace

A workspace represents one company or operating unit.

It contains:

- real users
- role Desks
- virtual agents
- assignments
- handoffs
- context packs
- shared memory
- skill library
- deliverables
- approval records
- budget ledger

### Desk

A Desk is a role workspace, not a person and not an agent.

Examples:

- CEO Desk
- Sales Desk
- Product Desk
- Ops Desk
- Finance Desk

A Desk can contain both real humans and virtual agents:

```text
Sales Desk
  Human members:
    - Alice, Sales Manager

  Virtual staff:
    - Sales Chief of Staff
    - Outreach Writer
    - CRM Researcher

  Shared assets:
    - lead lists
    - outreach playbooks
    - pricing constraints
    - customer objections
    - meeting notes
    - approved deliverables
```

This solves the case where one job function needs both a human and virtual staff. The human and virtual agents remain separate identities, but they share the same Desk context according to permissions.

### Human User

A human user is the accountability holder.

Humans can:

- create permanent virtual agents
- enable or customize default system staff
- approve high-risk actions
- change Desk permissions
- accept or reject handoffs
- own deliverables
- delegate work to their own virtual staff
- delegate work to another human through a handoff

Each human acts like a small CEO inside their allowed scope.

### Virtual Agent

A virtual agent is a permanent AI staff member attached to one Desk.

Some virtual agents are default system staff. They behave like company tools that are available when a workspace or Desk is created. Examples:

- report summarizer
- research specialist
- analyst
- writer
- scheduler
- follow-up assistant
- meeting note taker
- inbox triage assistant

Default system staff should feel like built-in company capabilities, not like a complex org chart. A human can enable, disable, rename, customize, or duplicate them, but the product should not force the human to design every common role from scratch.

Virtual agents can:

- receive assignments from their human owner
- receive assignments from the Desk's Chief of Staff agent if permitted
- use Desk memory and skills
- create deliverables
- propose new memory
- request delegation through a tool
- spawn temporary helpers if allowed
- call other permitted agents through Orchestrator-controlled tools

Virtual agents cannot:

- create permanent agents without human approval
- change Desk permissions
- directly command another human
- directly control another user's agents
- recursively build a deep permanent org chart
- convert temporary helpers into permanent staff without human approval

### Default System Staff

Default system staff are permanent staff templates provided by Mibusy.

They are similar to company tools:

```text
Research Specialist
Report Summarizer
Analyst
Writer
Scheduler
Meeting Note Taker
Inbox Triage
Follow-up Assistant
```

Default system staff give a new user a useful team immediately. They also reduce management burden because the user only customizes exceptions.

Rules:

- default staff are created from trusted templates
- they can be enabled by default for a new Desk
- the user can disable roles they do not need
- the user can rename or customize a role
- the user can duplicate a default role into a specialized role
- system templates are maintained by Mibusy
- customized copies belong to the user's workspace

This creates a simple path:

```text
Start with default staff
  -> customize a few roles
  -> create new permanent staff only when recurring work justifies it
  -> use temporary helpers for occasional subwork
```

### Chief of Staff / Super Agent

Each Desk may have one Chief of Staff agent.

For the CEO Desk this is the main chat entry point, for example Atlas.

Responsibilities:

- understand the human's high-level goals
- break goals into assignments
- suggest which virtual staff should handle each part
- call `delegate_task` when automatic delegation is needed
- summarize progress and decision points
- escalate to the human when policy requires approval

The Chief of Staff is a product-visible agent. It is not the system authority.

### Orchestrator

The Orchestrator is the system authority.

It does not chat. It enforces policy and records facts.

Responsibilities:

- check agent permissions
- check Desk scope
- check budget
- create assignments
- create child assignments
- create handoffs
- create inbox approval items
- record event traces
- route work to the correct runtime adapter
- prevent unauthorized recursive delegation

Agent runtimes may recommend or request delegation, but the Orchestrator decides whether it actually happens.

## Dispatch Model

There are two dispatch modes.

### 1. Manual Dispatch

A human directly assigns work.

Examples:

```text
CEO -> Atlas:
"Research the K-12 robotics market."

CEO -> Nova:
"Find funding signals for these districts."

Sales Manager -> Outreach Writer:
"Draft a follow-up email for this lead list."
```

Manual dispatch creates an assignment immediately, subject to budget and workspace safety rules.

### 2. Automatic Dispatch

A virtual agent requests delegation during a task.

Example:

```json
{
  "tool": "delegate_task",
  "to": "Nova",
  "task": "Find 20 K-12 districts with public robotics funding signals",
  "reason": "Atlas needs source-backed research before Ledger can score district fit",
  "budget": 0.8,
  "mode": "async"
}
```

This tool calls the Orchestrator. It does not directly spawn another agent.

The Orchestrator checks:

- caller agent permission
- target agent availability
- budget
- Desk scope
- task risk
- whether human approval is required

Then it either:

- creates a child assignment
- creates an inbox approval item
- rejects the delegation request
- asks the caller to narrow the task

## Handoff Model

Agents do not manage humans.

When work crosses from one real person's scope to another, the product creates a handoff.

Example:

```text
CEO's Atlas completes a market brief.

Atlas cannot directly control Sales Manager's agents.

Atlas creates a handoff:
  to: Sales Manager
  request: Validate these 20 districts and begin outreach
  context: market brief + source pack + suggested email angle

Sales Manager accepts.

Sales Manager's Sales Desk creates assignments for its own virtual staff.
```

This keeps accountability human-readable:

- the CEO asked for a business outcome
- Atlas prepared the request
- Sales Manager accepted ownership
- Sales Manager's agents executed inside Sales scope

## Recursion Rules

The system can be recursive in data shape, but constrained in product behavior.

### Allowed Recursion

Assignments can form a tree:

```text
Root assignment: Launch K-12 outreach
  - Research: Nova
  - Scoring: Ledger
  - Email draft: Quill
  - Sales handoff: Alice
```

Handoffs can reference previous assignments and create new assignments in another Desk.

Context packs can derive from other context packs.

Skills can improve through repeated task traces.

### Disallowed Recursion

Permanent virtual agents should not form a deep management tree.

Stage 1 rule:

```text
Human
  -> one-layer permanent virtual staff
       -> temporary helpers only
```

Temporary helpers cannot spawn more helpers.

Permanent agents cannot create permanent agents. They can only propose a new permanent role to a human.

If the human decides the recurring need is real, they can create a new permanent staff member. Until then, the runtime can satisfy occasional needs by creating temporary helpers under a specific assignment.

This gives the system two kinds of expansion:

```text
Visible organization expansion:
  Human explicitly creates a permanent staff member.

Runtime execution expansion:
  Agent runtime creates temporary helpers for one task.
  Helpers disappear or archive when the task ends.
```

The first changes the user's staff roster. The second only changes the task trace.

### Why This Constraint Exists

The user wants to manage tasks and outcomes, not maintain a virtual corporate hierarchy.

Deep agent org charts create avoidable complexity:

- unclear responsibility
- hard-to-debug delegation
- budget leaks
- UI overload
- recursive permission problems
- runtime lock-in

Company complexity should come from real users and shared workspaces, not from nested agents.

## Growth Path

### Phase 0: Single Human, Single Desk

Goal: simplest useful product.

Model:

```text
One user
One CEO Desk
One Chief of Staff agent
Several specialist agents
Shared Desk memory
Task inbox
```

Must support:

- direct chat with Chief of Staff
- direct chat with specialist agents
- one-layer permanent virtual staff
- assignments
- decision inbox
- simple deliverables
- Desk memory
- skill records
- budget tracking

No multi-human workflow yet.

### Phase 1: One Human, Multiple Desks

Goal: let one owner separate functions without creating a company account mess.

Model:

```text
CEO user
  CEO Desk
  Sales Desk
  Product Desk
  Ops Desk
```

Each Desk has its own:

- virtual staff
- memory
- skills
- deliverables
- budget

The same human owns all Desks.

Must support:

- desk switching
- desk-scoped memory
- desk-scoped virtual staff
- handoff-like transfer between owned Desks
- company memory visible across Desks

### Phase 2: Multiple Humans, One Workspace

Goal: real company collaboration.

Model:

```text
Company Workspace
  CEO user -> CEO Desk
  Sales Manager user -> Sales Desk
  Product Lead user -> Product Desk
```

Must support:

- user invitations
- role-based permissions
- each human owning their own Desk
- handoffs between humans
- shared company memory
- shared deliverables
- shared skill library
- private Desk memory
- approval routing

The core user experience remains the same for each human:

```text
My Boardroom
  Today
  Inbox
  Staff
  Meetings / Handoffs
```

### Phase 3: Organization Policy

Goal: make the workspace safe for teams.

Must support:

- company-level policy
- high-risk action approvals
- budget caps by Desk and user
- skill promotion workflow
- audit logs
- cross-Desk search
- reusable approved playbooks
- admin view for CEO / workspace owner

### Phase 4: Skill and Memory Network

Goal: make the company smarter over time.

Must support:

- skill reuse across Desks
- skill ownership and approval
- skill probation
- memory provenance
- context pack lineage
- deliverable lineage
- performance metrics by skill, Desk, and agent

This is where the system starts to feel like an operating system for a virtual company.

## Data Model Draft

### Core Tables

```text
workspaces
users
workspace_memberships
desks
desk_memberships
virtual_agents
agent_permissions
assignments
assignment_edges
handoffs
context_packs
context_pack_items
skills
skill_versions
deliverables
inbox_items
session_events
budget_ledger
```

### Desk

```text
desks
- id
- workspace_id
- name
- function
- owner_user_id
- status
- created_at
```

### Desk Membership

```text
desk_memberships
- desk_id
- user_id
- role: owner | collaborator | reviewer
```

### Virtual Agent

```text
virtual_agents
- id
- workspace_id
- desk_id
- owner_user_id
- name
- role
- kind: chief_of_staff | specialist | temporary
- status
- default_budget
- can_spawn_temp_agents
- runtime_profile_id
```

### Agent Permission

```text
agent_permissions
- caller_agent_id
- callee_agent_id
- mode: manual_only | auto_allowed | approval_required
- max_budget_per_task
- allowed_task_types
```

### Assignment

```text
assignments
- id
- workspace_id
- desk_id
- title
- prompt
- assigned_to_type: user | virtual_agent
- assigned_to_id
- created_by_type: user | virtual_agent | system
- created_by_id
- source: direct_chat | auto_delegate | schedule | handoff
- status
- budget_limit
- parent_assignment_id
- root_assignment_id
```

### Handoff

```text
handoffs
- id
- workspace_id
- from_user_id
- to_user_id
- from_desk_id
- to_desk_id
- from_agent_id nullable
- source_assignment_id
- context_pack_id
- status: proposed | accepted | rejected | completed
- request
```

## Hermes-Based Implementation

Hermes should be used as an execution runtime, not as the product authority.

Mibusy owns:

- user accounts
- Desks
- permanent virtual agents
- permissions
- assignments
- handoffs
- approval inbox
- budget ledger
- event log
- deliverable records

Hermes owns or helps with:

- single-assignment agent loop
- tool use
- skill execution
- procedural memory inside a runtime profile
- subagent-like parallel work inside a bounded task
- gateway-style chat surfaces if useful later
- model provider abstraction

### Adapter Boundary

Create a Hermes adapter with this shape:

```text
Mibusy Assignment
  -> hermes_runner.run(...)
  -> normalized session events
  -> Mibusy assignment state
```

Adapter input:

```json
{
  "workspace_id": "...",
  "desk_id": "...",
  "assignment_id": "...",
  "agent_id": "...",
  "role_prompt": "...",
  "task_prompt": "...",
  "context_pack": [],
  "allowed_tools": [],
  "budget_limit": 1.0,
  "runtime_profile": "hermes-deepseek-v4-pro"
}
```

Adapter output:

```text
status
message_chunk
tool_use
tool_result
delegate_request
handoff_request
memory_proposal
final
error
```

### Required Tools Exposed to Hermes

Hermes should not directly mutate Mibusy state. It should call tools that are backed by the Orchestrator.

Minimum tools:

```text
delegate_task
request_handoff
request_approval
write_deliverable
propose_memory
read_context_pack
search_desk_memory
search_company_memory
```

Important behavior:

- `delegate_task` calls Orchestrator, not another agent directly.
- `request_handoff` creates a handoff proposal, not a command to another human.
- `propose_memory` writes pending memory unless policy allows direct write.
- `write_deliverable` records provenance and assignment link.

### Runtime Profiles

Each virtual agent should point to a runtime profile.

Examples:

```text
runtime_profiles
- claude_code_deepseek
- deepseek_direct
- hermes_deepseek_v4_pro
- hermes_openrouter
```

This keeps product identity separate from execution engine.

Nova remains Nova even if the runtime changes from Claude Code SDK to Hermes.

### Hermes Stage Plan

#### Hermes Spike 1: Direct Runner

Goal: prove Mibusy can run one assignment through Hermes without changing product state.

Tasks:

- create `hermes_runner.py`
- run one prompt with DeepSeek V4 Pro through Hermes
- capture stdout / event stream
- normalize final answer into `message_chunk` and `final`
- compare output against current DeepSeek direct runner

No delegation yet.

#### Hermes Spike 2: Tool Bridge

Goal: expose Mibusy tools to Hermes.

Tasks:

- implement `delegate_task` as a tool
- tool calls local Orchestrator endpoint/function
- Orchestrator validates policy
- Orchestrator returns accepted / approval_required / rejected
- Hermes continues based on tool result

#### Hermes Spike 3: Desk Context

Goal: make Hermes execution Desk-aware.

Tasks:

- inject Desk memory into task context
- expose `search_desk_memory`
- expose `read_context_pack`
- write deliverables back to Mibusy
- record provenance

#### Hermes Spike 4: Skill Mapping

Goal: use Hermes skills without making Hermes the source of truth.

Tasks:

- map Mibusy skills to Hermes skills or skill references
- record skill usage in Mibusy
- implement skill probation and approval in Mibusy
- allow Hermes to propose skill improvements

#### Hermes Spike 5: Handoffs

Goal: connect multiple human-owned Desks.

Tasks:

- implement `request_handoff`
- create handoff inbox item for target user
- accept handoff into target Desk
- pass source context pack to target Desk assignment

## Product Rules

1. Permanent virtual agents are created by humans only.
2. Virtual agents may request temporary helpers if allowed.
3. Temporary helpers cannot spawn helpers.
4. Chief of Staff agents may request cross-agent delegation.
5. Orchestrator is the final authority for delegation.
6. Agents do not command humans.
7. Cross-human work is always a handoff.
8. Desk context is shared by humans and agents attached to that Desk.
9. Company memory is shared only according to workspace policy.
10. Runtime engines are swappable; product identity lives in Mibusy.
11. More permanent staff must be created or enabled by humans, not silently by runtimes.
12. Runtime-created helpers are temporary, assignment-scoped, and non-standing.
13. Completed task traces may automatically propose or improve skills.
14. Common roles should exist as default system staff templates.

## Stage 1 Recommendation

Build the smallest recursive core, but expose a simple product:

```text
One user
One CEO Desk
One Chief of Staff
Several specialist agents
One-level delegation
Temporary helpers
Assignments as a tree
No multi-human handoffs yet
```

Internally, use IDs and parent relationships that can support future recursion:

```text
assignment.parent_assignment_id
assignment.root_assignment_id
handoff.source_assignment_id
context_pack.parent_context_pack_id
```

Externally, keep the UI task-first:

```text
What is running?
Who owns it?
What decision is needed?
What was delivered?
What context was used?
```

This keeps the first product understandable while preserving a path to a true virtual company workspace.
