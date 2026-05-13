# Folder Sharing and Context Permissions v2

## Purpose

Mibusy needs a way for real humans and virtual staff to share working files, context, skills, and deliverables without exposing the whole filesystem to every agent runtime.

The product should treat folders as controlled **context spaces**, not as raw OS directories.

Core rule:

> Humans and Desks own folders. Agents receive scoped access through assignments, context packs, and Orchestrator-approved tools.

## Mental Model

Use three layers:

```text
Workspace Library
  Company-wide approved files, policies, source packs, playbooks

Desk Library
  Files and context owned by one Desk, such as Sales, Product, CEO

Assignment Workspace
  A temporary working area for one task, including runtime scratch files
```

Agents should normally work inside an assignment workspace. They can read from approved Workspace or Desk libraries only through scoped context packs or search tools.

## Folder Types

### Workspace Library

Company-level shared knowledge.

Examples:

- company profile
- brand guidelines
- pricing rules
- approved customer facts
- shared source packs
- published playbooks
- approved skills

Access:

- CEO / owner: read-write
- manager: according to role
- virtual staff: read through policy
- Hermes runtime: only via context pack or approved search tool

### Desk Library

Function-level shared knowledge.

Examples:

- Sales lead lists
- Product research notes
- Ops runbooks
- CEO strategy memos
- Desk-specific prompt preferences
- Desk-specific skill drafts

Access:

- Desk owner: read-write
- Desk collaborators: scoped read/write
- agents attached to Desk: scoped read, proposed write
- other Desks: no access unless handoff/context pack grants it

### Assignment Workspace

Task-level working area.

Examples:

- temporary files
- intermediate summaries
- scraped source snippets
- generated draft versions
- runtime logs
- Hermes scratch outputs

Access:

- assignment owner: read-write
- assigned agent runtime: read-write within sandbox
- child helpers: scoped read/write if delegated
- other agents: no access unless Orchestrator adds them to the assignment

Assignment workspace files should be archived or summarized into deliverables/context packs when the task completes. They should not automatically become shared memory.

### Deliverable Folder

Approved outputs.

Examples:

- final report
- source-backed memo
- outreach draft
- meeting notes
- analysis table

Access:

- follows Workspace or Desk visibility
- always linked to source assignment
- can be used in handoffs
- can become part of a context pack

### Skill Folder

Reusable procedures and examples.

Examples:

- skill instructions
- input/output examples
- test cases
- Beacon results
- version history

Access:

- private skill: owner Desk only
- public workspace skill: workspace-readable
- system skill: read-only template from Mibusy
- runtime-generated improvement: pending proposal until approved

## Sharing Primitives

### Folder

A durable container.

```text
folders
- id
- workspace_id
- desk_id nullable
- parent_folder_id nullable
- name
- type: workspace_library | desk_library | assignment_workspace | deliverable | skill
- owner_type: user | desk | system
- owner_id
- visibility: private | desk | workspace | handoff | system
- created_at
```

### File

A file inside a folder.

```text
files
- id
- folder_id
- name
- content_type
- storage_uri
- checksum
- created_by_type: user | agent | system
- created_by_id
- source_assignment_id nullable
- approval_status: draft | pending | approved | rejected
```

### Folder Permission

Explicit access grant.

```text
folder_permissions
- folder_id
- principal_type: user | desk | virtual_agent | assignment | runtime_profile
- principal_id
- access: read | write | propose | admin
- expires_at nullable
- granted_by_user_id nullable
```

### Context Pack

A curated set of files, memories, deliverables, and instructions passed to an assignment or handoff.

```text
context_packs
- id
- workspace_id
- desk_id nullable
- name
- source_assignment_id nullable
- created_by_type: user | agent | system
- created_by_id
- visibility
```

```text
context_pack_items
- context_pack_id
- item_type: file | folder | deliverable | memory | skill | note
- item_id
- access_mode: read | summarize | cite | transform
```

Context packs are the preferred way to share context across Desks and into Hermes.

## Permission Model

### Human Access

Humans get access through workspace membership and Desk membership.

Rules:

- workspace owner can see all workspace folders
- Desk owner can administer Desk folders
- collaborator can read/write according to membership
- reviewer can read and approve, but not freely mutate

### Agent Access

Agents inherit scope from:

- their Desk
- their assignment
- their runtime profile
- explicit context pack grants

Agents should not receive broad filesystem access by default.

Rules:

- permanent agent can read Desk context allowed by policy
- permanent agent can propose writes to Desk memory or skill folders
- assignment agent can write to assignment workspace
- temp helper only sees context explicitly passed by parent assignment
- Beacon can read skill proposal and test fixtures, not unrelated Desk files

### Hermes Runtime Access

Hermes should see a sandboxed view:

```text
/workspace
  /context        read-only context pack material
  /work           assignment scratch files
  /deliverables   files intended for Mibusy ingestion
```

Hermes should not mount raw Workspace Library or Desk Library directly unless the assignment explicitly grants it.

All durable writes should pass through Mibusy tools:

```text
mibusy_write_deliverable
mibusy_propose_memory
mibusy_propose_skill
mibusy_request_folder_access
```

## Handoff Sharing

Cross-human or cross-Desk work should use handoffs.

Example:

```text
CEO Desk creates a market brief.
Atlas requests handoff to Sales Desk.
Orchestrator creates context pack:
  - market brief
  - source pack
  - recommended outreach angle
Sales Manager accepts.
Sales Desk gets read access to the context pack.
Sales agents work in their own assignment workspace.
```

The source Desk does not grant blanket folder access. It grants a curated context pack.

## Runtime Write Flow

### Draft Output

```text
Hermes writes draft in assignment workspace
  -> Mibusy ingests as draft file
  -> human or policy approves
  -> file becomes deliverable or memory
```

### Memory Proposal

```text
Agent proposes memory
  -> Orchestrator checks scope
  -> pending memory item
  -> approval or automatic low-risk promotion
```

### Skill Proposal

```text
Completed task trace
  -> skill proposal
  -> Beacon test
  -> probation
  -> approved skill version
```

## UI Requirements

Folder sharing should appear in product language, not filesystem language.

Prefer labels:

- Company Library
- Desk Library
- Task Workspace
- Source Pack
- Context Pack
- Deliverables
- Skill Files

Avoid making users manage:

- raw mount paths
- agent filesystem roots
- runtime scratch directories

### Boardroom UI Placements

今日:

- show attached context pack on active tasks
- show deliverables produced today

待审:

- show folder access requests
- show memory/skill/deliverable approval cards

团队:

- staff profile shows what libraries the agent can access
- skill cards show source files and Beacon test files

会议室:

- handoff discussion can attach context packs
- meeting thread can produce a deliverable folder

Settings or Admin later:

- manage Workspace Library and Desk Library permissions

## Test Standards

Minimum policy tests:

```text
agent reads assigned context pack: allowed
agent reads unrelated Desk folder: rejected
temp helper reads parent context subset: allowed
temp helper reads full Desk library: rejected
Hermes writes assignment scratch file: allowed
Hermes writes Desk memory directly: rejected; must propose
handoff shares context pack: target Desk can read pack
handoff does not share source Desk library: rejected
Beacon reads skill test files: allowed
Beacon reads unrelated deliverables: rejected
```

Minimum migration tests:

```text
fresh workspace -> creates Workspace Library and CEO Desk Library
new assignment -> creates assignment workspace
completed assignment -> deliverable can be promoted out of workspace
re-run default seed -> no duplicate folders
```

## Stage 1 Recommendation

Implement the concept without overbuilding the UI.

Minimum product objects:

```text
folders
files
folder_permissions
context_packs
context_pack_items
```

Minimum runtime behavior:

- create an assignment workspace for every run
- materialize context pack into read-only runtime folder
- allow runtime scratch writes
- ingest final deliverables through Mibusy tool
- keep raw Hermes workspace out of the product UI

This gives agents enough shared context while preserving a simple, auditable permission model.
