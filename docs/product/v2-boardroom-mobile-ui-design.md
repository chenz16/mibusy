# Boardroom Mobile UI Design Spec v2

## Status

This is the current UI direction for Mibusy.

Supersedes:

- `docs/product/v1-agent-platform-ui-design.md`

Primary design reference:

- local design package: `ai_agent_design.zip`
- extracted prototype: `/tmp/mibusy-ai-agent-design/Boardroom-Mobile.html`
- design handoff: `/tmp/mibusy-ai-agent-design/HANDOFF.md`
- implementation reference files:
  - `/tmp/mibusy-ai-agent-design/board/mobile-app.jsx`
  - `/tmp/mibusy-ai-agent-design/board/data.jsx`
  - `/tmp/mibusy-ai-agent-design/board/ios-frame.jsx`

Related product model:

- `docs/product/v2-desk-based-virtual-company-requirements.md`

## Product Frame

The UI should feel like a mobile Boardroom for a CEO, manager, or operator who runs a small virtual team.

The user is not editing an agent graph. The user is managing:

- tasks
- decisions
- deliverables
- budgets
- trusted staff
- shared Desk context

The product must avoid exposing a deep virtual org chart. Agents may call other agents through controlled tools, but the visible structure remains shallow:

```text
Human owner / manager
  -> Desk
      -> default system staff
      -> customized permanent staff
      -> temporary task helpers
```

## Core Mental Model

### Boardroom

The first screen is not a marketing page and not a generic chat app. It is a work cockpit.

The Boardroom answers:

- what is happening today
- what requires my decision
- who is working on what
- what meeting or handoff needs attention

### Desk

A Desk is a shared role workspace. In Stage 1, the user mainly sees a CEO Desk. Future versions can add Sales Desk, Product Desk, Ops Desk, etc.

UI implication:

- do not show a complex company tree by default
- show the active Desk context near the top of the app
- route memory, skills, tasks, and staff through the Desk

### Staff

Staff includes:

- default system staff
- customized permanent staff
- temporary helpers
- Beacon QA

Default system staff are like company tools. Examples:

- Research Specialist
- Report Summarizer
- Analyst
- Writer
- Scheduler
- Meeting Note Taker
- Inbox Triage
- Follow-up Assistant

The UI should let the user enable, disable, rename, customize, or duplicate these staff members. It should not force the user to create common roles from scratch.

### Temporary Helpers

Temporary helpers are runtime-created, assignment-scoped workers.

UI rules:

- never present them as permanent employees
- use generated IDs such as `tmp-4831`
- show parent agent or parent assignment
- show TTL or completed state
- fold them under task details by default
- never let them appear in the main staff roster as standing employees

### Skills

Skills are reusable assets created from human instruction and runtime experience.

UI rules:

- skill confidence and probation are shown on skill cards
- task traces may propose skill improvements
- skill promotion should go through Beacon or review
- skills reduce the need to add more visible staff

## Mobile Information Architecture

Use the Boardroom Mobile prototype as the primary navigation model.

Bottom tabs:

| Tab | Purpose |
|---|---|
| 今日 | task stream and CEO summary |
| 待审 | decisions, approvals, draft review |
| 团队 | staff, Beacon, skills, temporary helpers |
| 会议室 | task-driven multi-agent discussion and handoffs |

Secondary routes may exist, but the mobile product should prioritize these four tabs.

## Screens

### 今日

Purpose: show the manager what needs attention now.

Required sections:

1. Chief of Staff headline
2. decision highlight
3. running tasks
4. recent deliverables
5. "assign new task" CTA

The Chief of Staff card should speak like an operating lead:

```text
今天有 3 个判断点，团队其余工作继续推进。
```

Task cards should show:

- task title
- owner
- status
- next step
- budget or token spend
- assignment mode: auto / override / self
- linked meeting if active

### 待审

Purpose: compress all user judgment into one queue.

Card fields:

- who is asking
- question
- recommendation
- context
- urgency
- age
- budget impact
- actions

Required actions:

- approve
- reject
- edit response
- view draft / source

UI should make the recommended action visible, but not hide alternatives.

### 团队

Purpose: manage a small, trusted staff set without exposing an org-chart product.

Use a segmented control:

```text
员工 | Beacon | 技能池 | 临时
```

#### 员工

Show permanent staff.

Include default system staff and customized staff in the same list, but label default staff as system-provided templates or built-ins.

Staff card fields:

- name
- title
- type: default system staff / customized permanent staff
- trust score
- current task
- monthly token budget or spend
- key KPI
- enabled / disabled state

Actions:

- chat
- assign task
- customize
- disable
- duplicate role

#### Beacon

Beacon is the system QA agent.

UI rules:

- show Beacon separately from employee count
- explain through state and labels, not long onboarding copy
- show active test cases and results

Beacon validates:

- typical input
- edge input
- empty input
- hostile prompt injection
- conflicting context

#### 技能池

Show reusable skills.

Filters:

- all
- company public
- my Desk
- probation

Skill card fields:

- skill name
- owner / source agent
- visibility
- reuse mode: template / instance
- runs
- trust
- probation state
- used by
- last improved from task

Actions:

- try
- install
- publish
- duplicate
- promote
- send to Beacon

#### 临时

Show runtime-created temporary helpers.

Fields:

- generated ID
- parent agent
- parent task
- current action
- TTL
- cost
- state

If a temporary helper pattern repeats often, show a suggestion:

```text
This helper pattern ran 23 times this week. Turn it into a skill?
```

Do not suggest turning it directly into a permanent employee unless the recurring need is broad enough and the user explicitly confirms.

### 会议室

Purpose: task-driven multi-agent discussion and human intervention.

Meeting cards show:

- meeting title
- linked task
- owner
- participants
- status: live / awaiting / scheduled
- current decision needed

Thread view should show:

- agent messages
- tool or task references
- proposed decision
- handoff request if another human or Desk is needed

Actions:

- approve recommendation
- redirect
- ask for alternatives
- create handoff
- close meeting

## Agent Profile

Agent profile tabs:

```text
总览 | 任务 | 技能 | 战报
```

### 总览

Show:

- role
- trust
- current task
- budget
- enabled state
- Desk membership
- system default vs custom role

### 任务

Show:

- active assignments
- completed assignments
- temporary helpers spawned
- handoffs requested

### 技能

Show:

- installed skills
- probation state
- trust score
- Beacon status
- suggested improvements

### 战报

Show:

- weekly impact
- delivered work
- budget spent
- decisions escalated
- skill improvements

## Task Detail

Task detail should be task-first, not agent-hierarchy-first.

Required sections:

- title
- owner
- deadline
- status
- progress
- budget
- assignment mode
- status summary
- collaboration tree
- skills used
- deliverables
- linked meeting

Collaboration tree rules:

- show permanent staff subtasks
- fold temporary helpers by default
- show temporary helpers only after explicit expand
- preserve parent-child trace for audit
- do not imply temporary helpers are staff roster members

Assignment mode:

- `auto`: recommended, Chief of Staff / Orchestrator assigned
- `override`: human directly assigned a specific staff member
- `self`: staff initiated within allowed scope

Override should be visually flagged because it bypasses automatic scheduling.

## New Task Flow

The new task flow should offer two primary paths:

### Auto Assign

Recommended.

The Chief of Staff interprets the goal, proposes a plan, and calls Orchestrator-backed tools such as `delegate_task`.

UI copy should make clear:

```text
Atlas will break down the task, pick the right staff, and ask you only when policy requires approval.
```

### Direct Assign

For cases where the user knows exactly who should do the work.

UI should warn:

```text
Direct assignment bypasses automatic scheduling and may interrupt current work.
```

Direct assignment is still allowed because the human is the accountability holder.

## Visual System

Use the Boardroom Mobile warm-paper style.

Design tokens from prototype:

```css
--paper: #F6F3EC;
--paper-2: #EFEBE1;
--card: #FFFFFF;
--line: #E4DFD2;
--line-2: #CCC6B5;
--ink: #1A1A18;
--ink-2: #4A4A45;
--ink-3: #8B8A83;
--ink-4: #B5B2A8;
--gold: oklch(0.62 0.14 70);
--gold-soft: oklch(0.62 0.14 70 / 0.12);
--green: oklch(0.55 0.14 145);
--red: oklch(0.58 0.19 25);
--blue: oklch(0.52 0.13 240);
```

Typography:

- serif display: Fraunces or compatible serif for large headings and key numbers
- sans: Inter / system for work UI
- mono: JetBrains Mono for IDs, budgets, token counts, trace values

Style constraints:

- avoid blue/purple SaaS default feel
- use gold for attention and decision emphasis
- keep cards warm and tactile
- no decorative gradient blobs
- no marketing hero screen as first experience
- no dense desktop table as the primary mobile pattern
- cards should support scanning in one hand

## Desktop Direction

Desktop can expand the same model, but should not reintroduce the v1 dark sidebar control-plane as the primary product.

Desktop should become a wider Boardroom:

- left or top Desk switcher
- center task stream
- right decision / staff context
- meeting and handoff side panels

The product should remain task-first and Desk-first.

## Hermes Runtime UI Implications

Hermes is an execution runtime, not the visible organization model.

The UI should show normalized Mibusy events:

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

Do not show raw Hermes internals as the primary UI. Map them into product concepts:

| Runtime concept | UI concept |
|---|---|
| Hermes tool call | staff action |
| `delegate_task` | delegation request |
| runtime temp helper | temporary helper |
| skill creation | skill proposal / improvement |
| final answer | deliverable |
| runtime failure | blocked task / inbox escalation |

If Hermes auto-creates subagents or helpers, the UI should show them as temporary task helpers unless a human explicitly promotes or creates a permanent role.

## Implementation Notes

Stage 1 web implementation should prioritize:

- `/chat` as 今日
- `/inbox` as 待审
- `/templates` as 团队
- `/observe` as 会议室

Naming can be improved later, but product language should avoid:

- template
- session
- job
- agent graph
- org chart

Prefer:

- staff
- Desk
- assignment
- decision
- deliverable
- skill
- meeting
- handoff

## Acceptance Criteria

The v2 UI is acceptable when:

1. A new user can understand that they are managing a virtual team, not chatting with one bot.
2. The first mobile screen shows today's work and decisions.
3. Permanent staff, default system staff, Beacon, skills, and temporary helpers are visually distinct.
4. Temporary helpers never look like permanent employees.
5. Agent-to-agent delegation is visible as task trace, not as a deep org chart.
6. The user can manually dispatch work or allow auto assignment.
7. Skills can be shown as reusable assets that reduce management overhead.
8. Hermes execution details are mapped into product-level events.
9. The UI works as a one-hand mobile cockpit.
10. The old v1 dark control-plane layout is not treated as the current target.
