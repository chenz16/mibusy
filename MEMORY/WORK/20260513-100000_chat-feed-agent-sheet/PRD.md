---
task: CEO feed, universal chat, agent profile sheet
slug: 20260513-100000_chat-feed-agent-sheet
effort: advanced
phase: build
progress: 0/20
mode: interactive
started: 2026-05-13T00:00:00Z
updated: 2026-05-13T00:01:00Z
---

## Context
Redesign entry to be CEO-first: unified activity feed (deliveries + decisions) + universal text input.
Agent cards become clickable showing a bottom sheet with real DB data.
Hiring also goes through natural language in the universal input.

## Criteria
- [ ] ISC-1: Nav reduced from 4 to 3 tabs (inbox tab removed)
- [ ] ISC-2: Today page shows unified activity feed (deliverables + awaiting combined)
- [ ] ISC-3: Feed sorted by date, decisions/awaiting shown above deliveries
- [ ] ISC-4: Universal text input at bottom of Today page
- [ ] ISC-5: Input sends task to Atlas (POST /api/v2/assignments, assigned to Atlas)
- [ ] ISC-6: Input detects hire keywords (雇/招) and creates staff directly
- [ ] ISC-7: Input shows loading state and clears on success
- [ ] ISC-8: Feed awaiting items have inline ✓ ✗ icon-only action buttons
- [ ] ISC-9: Feed deliverable items show agent name, preview, expandable
- [ ] ISC-10: 雇人 form button remains on team page as alternative
- [ ] ISC-11: Agent cards in team page are clickable
- [ ] ISC-12: Clicking agent card opens bottom sheet
- [ ] ISC-13: Agent sheet shows real recent deliverables from DB
- [ ] ISC-14: Agent sheet shows real assignment stats from DB
- [ ] ISC-15: Agent sheet has "分配任务给 [Name]" button pre-selecting that agent
- [ ] ISC-16: GET /api/v2/agents/[id] endpoint exists
- [ ] ISC-17: getAgentDetail() function in v2-data.ts
- [ ] ISC-18: TypeScript typecheck 0 errors
- [ ] ISC-19: Today badge count reflects real awaiting count from DB
- [ ] ISC-20: No fake button grids remain on Today page
