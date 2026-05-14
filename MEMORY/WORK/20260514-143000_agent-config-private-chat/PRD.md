---
task: agent config editing and per-agent private chat
slug: 20260514-143000_agent-config-private-chat
effort: advanced
phase: complete
progress: 24/24
mode: interactive
started: 2026-05-14T14:30:00Z
updated: 2026-05-14T14:30:00Z
---

## Context

User wants three interconnected features in the Mibusy AI team dashboard:

1. **Agent config editing** — each agent can have their system_prompt edited directly via a UI textarea, or via a CEO chat conversation (rebuild flow). DB columns already added (linked_email, work_token, system_prompt).

2. **Rebuild via CEO chat** — a "重建" button in AgentSheet navigates to the CEO chat tab with a pre-filled message to configure the agent via conversation. This allows complex reconfigurations through natural language.

3. **Per-agent private chat** — each agent in the team gets their own private chat. User can message the agent directly; the system creates an assignment for that agent and shows the deliverable as a response.

The user also clarified: "hire real person" = a connect feature like email/Slack integration. The human gets a task inbox link and submits deliverables back.

### Risks

- Per-agent chat polling needs to track the specific assignment created, not all assignments for that agent
- Navigation from AgentSheet to CEO chat requires a shared state mechanism (localStorage-based prefill)
- AgentSheet currently has no tabs — adding tabs changes the entire layout structure
- PATCH API needs to be added to the existing agents/[id]/route.ts
- The worker needs a tool to update agent configs so CEO chat can trigger reconfiguration

## Criteria

- [ ] ISC-1: AgentSheet shows three tabs: 概览, 配置, 私聊
- [ ] ISC-2: 概览 tab shows existing stats, deliverables, assignments content
- [ ] ISC-3: 配置 tab shows editable system_prompt textarea
- [ ] ISC-4: system_prompt textarea shows current value from DB or empty state
- [ ] ISC-5: 配置 tab has Save button that calls PATCH /api/v2/agents/[id]
- [ ] ISC-6: Save success shows confirmation feedback to user
- [ ] ISC-7: Save error shows error message to user
- [ ] ISC-8: 配置 tab has "重建对话" button
- [ ] ISC-9: Clicking "重建对话" writes prefill to localStorage key "chat-prefill"
- [ ] ISC-10: Clicking "重建对话" navigates to /chat tab
- [ ] ISC-11: TodayPage reads "chat-prefill" on mount and pre-fills the input
- [ ] ISC-12: TodayPage clears "chat-prefill" from localStorage after reading it
- [ ] ISC-13: 私聊 tab shows a chat UI with message history
- [ ] ISC-14: 私聊 chat history persisted in localStorage per agent id
- [ ] ISC-15: 私聊 send message creates assignment directly for this agent
- [ ] ISC-16: 私聊 polls for assignment completion every 5 seconds
- [ ] ISC-17: 私聊 shows deliverable body as agent response bubble
- [ ] ISC-18: 私聊 shows "思考中..." loading indicator while waiting
- [ ] ISC-19: PATCH /api/v2/agents/[id] endpoint accepts system_prompt field
- [ ] ISC-20: PATCH endpoint saves system_prompt to virtual_agents table
- [ ] ISC-21: PATCH endpoint returns updated agent fields on success
- [ ] ISC-22: updateAgent function added to v2-data.ts
- [ ] ISC-23: AgentDetail type includes system_prompt field
- [ ] ISC-24: Agent detail GET API returns system_prompt

## Decisions

## Verification
