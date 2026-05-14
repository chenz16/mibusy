---
task: QA verify crown and employee buttons fresh browser
slug: 20260514-qa-fresh-browser-button-verification
effort: standard
phase: complete
progress: 12/12
mode: interactive
started: 2026-05-14T11:56:34-07:00
updated: 2026-05-14T11:56:34-07:00
---

## Context

User reports that after a recent hydration fix, many interactive elements are broken in the Mibusy web app. Specifically:
1. The gold Crown button (top-right of MetricsBar on TodayPage at `/`) is not clickable — should open `CeoSheet` (full-screen modal with header "CEO 配置 · 你自己").
2. Employee cards on the team page (`/templates`, 团队 tab) are not clickable — should open `AgentSheet`.

The user wants verification in a TRULY FRESH browser context (no cache, no service worker, no persisted storage state) to rule out stale-bundle issues. Console errors, hydration warnings, and 4xx/5xx network responses must be captured.

Files of interest:
- `apps/web/components/TodayPage.tsx` (MetricsBar containing the crown)
- `apps/web/components/CeoSheet.tsx`
- `apps/web/components/AgentSheet.tsx`
- `apps/web/components/AppShell.tsx` (header brand)

App is expected to be running at `http://localhost:3000`.

## Criteria

- [x] ISC-1: Dev server responds 200 at http://localhost:3000
- [x] ISC-2: TodayPage renders without console errors in fresh context
- [x] ISC-3: No React hydration warning logged on TodayPage load
- [x] ISC-4: Crown button is visible in MetricsBar top-right
- [x] ISC-5: Crown button is a real button element with click handler
- [x] ISC-6: Clicking Crown opens CeoSheet modal in DOM
- [x] ISC-7: CeoSheet header text "CEO 配置 · 你自己" is visible
- [x] ISC-8: Templates page loads without console errors
- [x] ISC-9: 团队 tab is reachable and shows employee cards
- [x] ISC-10: Employee card click target is wired to onClick handler
- [x] ISC-11: Clicking an employee card opens AgentSheet modal
- [x] ISC-12: No 4xx or 5xx network responses during the test flows
