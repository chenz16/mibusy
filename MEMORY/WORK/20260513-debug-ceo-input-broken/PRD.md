---
task: Debug CEO homepage universal input not working
slug: 20260513-debug-ceo-input-broken
effort: standard
phase: complete
progress: 2/2
mode: interactive
started: 2026-05-13T00:00:00Z
updated: 2026-05-13T00:00:00Z
---

## Context
User typed in CEO dashboard input box, nothing happened. Two root causes found:
1. PostgreSQL Docker container not running — all DB calls silently fail, API returns 503
2. TodayFeed had no error display — on API failure, `res.ok` was false but UI showed nothing

## Criteria
- [x] ISC-1: Root cause of input failure identified
- [x] ISC-2: Error feedback shown to user when API fails

## Verification
- Root cause: `sudo docker ps` shows no mibusy-db container; `pg_isready` returns not-ready
- Fix: Added `error` state + display in TodayFeed.tsx; catches both non-ok responses and network errors
