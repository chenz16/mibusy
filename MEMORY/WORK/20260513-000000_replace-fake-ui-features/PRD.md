---
task: Replace all fake UI features with real functionality
slug: 20260513-000000_replace-fake-ui-features
effort: extended
phase: complete
progress: 24/24
mode: interactive
started: 2026-05-13T00:00:00Z
updated: 2026-05-13T00:00:01Z
---

## Context

The Mibusy CEO dashboard has four tabs (今日/待审/团队/会议室). After the UI redesign, multiple interactive buttons and displayed metrics show hardcoded fake data from `ui-data.ts`. The user's explicit rule: "功能不能fake" — no fake features. This task replaces every hardcoded metric and every no-op button with real DB-backed data or real actions.

Fake items identified:
- Chat page: 4 hardcoded `operatingMetrics` values; "继续推进" button no-ops
- Inbox page: 3 hardcoded `decisionItems`; all action buttons (批准/看草稿/改写/拒绝) no-op
- Team page: staff cards show fake salary/tenure/trust/kpi from hardcoded `employees` array
- Observe page: entire meeting list and live thread are hardcoded mock data; "批准" buttons no-op

## Criteria

- [ ] ISC-1: Chat metrics "Active staff" reads from virtual_agents DB count
- [ ] ISC-2: Chat metrics "Needs decision" reads from awaiting assignments DB count
- [ ] ISC-3: Chat metrics "Delivered today" reads from deliverables created today DB count
- [ ] ISC-4: Chat metrics "Today spend" removed (no cost table) or shows real zero
- [ ] ISC-5: "继续推进" button opens real task assignment modal, not a no-op
- [ ] ISC-6: Inbox decision items pull from DB assignments with status awaiting/running
- [ ] ISC-7: Inbox shows empty state when no awaiting assignments in DB
- [ ] ISC-8: Inbox "批准" button calls PATCH /api/v2/assignments/[id] status=completed
- [ ] ISC-9: Inbox "拒绝" button calls PATCH /api/v2/assignments/[id] status=cancelled
- [ ] ISC-10: Inbox "批准"/"拒绝" do router.refresh() after success
- [ ] ISC-11: Inbox "看草稿" shows deliverable body (navigates to or expands inline)
- [ ] ISC-12: PATCH /api/v2/assignments/[id] endpoint exists and updates status
- [ ] ISC-13: Team page staff cards show only real DB fields (name, role, kind, status)
- [ ] ISC-14: Team page removes fake salary/tenure/trust/kpi/nowDoing from display
- [ ] ISC-15: Team page shows real assignment count per agent from DB
- [ ] ISC-16: Observe page meeting list shows real assignments from DB instead of hardcoded
- [ ] ISC-17: Observe page live thread shows real assignment_events from most recent assignment
- [ ] ISC-18: Observe page removes hardcoded "批准 top 6"/"先免费源" buttons
- [ ] ISC-19: Observe page shows empty state when no assignments exist
- [ ] ISC-20: getDashboardMetrics() function added to v2-data.ts
- [ ] ISC-21: getAssignmentEvents() function added to v2-data.ts
- [ ] ISC-22: TypeScript typecheck passes with 0 errors after all changes
- [ ] ISC-23: pnpm verify:offline passes (build + typecheck + audit)
- [ ] ISC-24: No hardcoded mock data from ui-data.ts shown as if it were real operational data

## Decisions

- "Today spend" removed entirely: no cost tracking table exists in DB yet
- Team page trust bar removed: trust % has no real source
- Observe page repurposed: shows assignment execution traces (real) instead of multi-agent meeting (not yet built)
- "继续推进" reuses AssignTaskButton component (same action, honest label mismatch acceptable until full workflow exists)
- Inbox falls back to empty state (not mock data) when DB unavailable

## Verification

- TypeScript: 0 errors
- Screenshots confirm: no hardcoded salary/monthly values visible on team page
- Screenshots confirm: chat metrics match DB row counts
- Screenshots confirm: inbox shows empty "等你拍板" when no awaiting assignments
- Screenshots confirm: observe page shows real assignment list and event log
