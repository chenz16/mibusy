---
task: unified worker protocol peer-to-peer node architecture
slug: 20260514-150000_unified-worker-protocol
effort: advanced
phase: complete
progress: 20/20
mode: interactive
started: 2026-05-14T15:00:00Z
updated: 2026-05-14T15:00:00Z
---

## Context

Every app instance is both a boss and a worker. Each node gets a work_token. Assignments flow between nodes using a universal protocol — same API for human, local computer, cloud AI, remote Boardroom instance.

## Criteria

- [ ] ISC-1: DB migration adds last_seen_at to virtual_agents
- [ ] ISC-2: getAgentByWorkToken returns agent or null
- [ ] ISC-3: updateWorkerHeartbeat updates last_seen_at
- [ ] ISC-4: getWorkerAssignments returns queued+running assignments for token
- [ ] ISC-5: startWorkerAssignment marks assignment running
- [ ] ISC-6: completeWorkerAssignment creates deliverable + sets completed
- [ ] ISC-7: generateWorkToken generates UUID, saves to DB
- [ ] ISC-8: getAgentTokenInfo returns work_token + last_seen_at
- [ ] ISC-9: GET /api/v2/work/next?token returns next queued assignment
- [ ] ISC-10: POST /api/v2/work/heartbeat updates last_seen
- [ ] ISC-11: POST /api/v2/work/start marks assignment running
- [ ] ISC-12: POST /api/v2/work/done creates deliverable + completes
- [ ] ISC-13: POST /api/v2/agents/[id]/token generates work_token
- [ ] ISC-14: /my/[token] page shows worker's pending assignments
- [ ] ISC-15: /my/[token] shows agent name + online status
- [ ] ISC-16: /my/[token] submission form creates deliverable via work/done
- [ ] ISC-17: AgentSheet 配置 tab shows "节点连接" section
- [ ] ISC-18: AgentSheet shows "生成令牌" when no token exists
- [ ] ISC-19: AgentSheet shows token + /my link + online status when token exists
- [ ] ISC-20: TypeScript clean, Next.js build passes

## Decisions
## Verification
