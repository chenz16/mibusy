# V3 Peer Network — Status (2026-05-14)

## Where we are

| Milestone | Status | Notes |
|---|---|---|
| **M0** Multi-instance basics | ✅ DONE | env-driven desk_id, dev:peer script, peer desk seed |
| **M1** Peer protocol core | ✅ DONE | outbound dispatch + inbound auth + callback, **E2E roundtrip verified** |
| **M2** UI + LLM tool | 🟡 partial | FacadeConfig UI live in AgentSheet; `configure_peer_agent` chat tool live |
| **M2** UI polish | ⬜ TODO | `🔗` indicator on task cards, online/heartbeat status |
| **M2** Robustness | ⬜ TODO | retry queue, peer ping endpoint |
| **M3** Demo polish | 🟡 partial | one-shot script ready (`scripts/v3_demo.sh`), still single-machine |
| **M4** Production | ⬜ TODO | HTTPS, rate limit, CORS, org-map view |

## Replaying the demo

```bash
cd /home/chenzhang/Downloads/mibusy/mibusy
./scripts/v3_demo.sh
```

This will:
1. Sync `apps/web-peer/` from `apps/web/`
2. Stop any running dev servers
3. Start A (port 3000, default desk) — dev mode
4. Start B (port 3001, peer desk) — dev mode (clone dir workaround for Next.js lock)
5. Run `scripts/v3_e2e.sh` which exercises full A→B→A roundtrip
6. Leave both instances running for UI exploration

After it completes, you can:
- Visit `http://localhost:3000` to see A's CEO (飞翔)
- Visit `http://localhost:3001` to see B's CEO (对端 CEO)
- Click 小王 in A's team page → manage drawer → "模式" section shows façade config
- Try natural language: in A's main chat say "让小王变成对端 URL=http://localhost:3001 token=<B's token>"

## What works end-to-end (verified)

```
[A] CEO 飞翔 → 派任务给小王 (facade)
    ↓ POST /api/v2/missions (auth: peer_token)
[B] 对端 CEO 收到 mission in inbox
    ↓ CEO 接受 + 写述职报告
    ↓ POST /api/v2/peer/done (callback)
[A] 小王's task history gets B's deliverable
    status: completed ✓
```

E2E test script: `scripts/v3_e2e.sh` (exits 0 on success)

## What's NOT yet in M2

- **UI indicator on cards**: TaskSheet/AgentTaskStrip doesn't show a 🔗 badge when an assignment was routed via facade. Currently relies on opening the agent's manage drawer to see mode.
- **Heartbeat**: agent_connections.last_seen_at exists in schema but not updated. M2 needs a periodic ping endpoint and a status pill.
- **Retry queue**: if peer is offline, dispatch silently fails. Need a re-attempt tick.
- **Org graph view**: visual rendering of "my agents → peers → their agents → their peers".

## Known limits

- **Next.js dev lock**: cannot run two `next dev` from the same project dir. Workaround: `apps/web-peer/` is a clone of `apps/web/` (symlinked node_modules). The demo script keeps them in sync via rsync.
- **Same-DB isolation**: both instances point at the same Postgres but use different `MIBUSY_DESK_ID`. All queries filter by desk_id. For production isolation, point at different DBs.
- **Token rotation**: peer_token is generated once and reused. No expiry / rotation yet.
- **Auth model**: single token per peer connection. No per-action permissions.

## Files of interest

| File | Purpose |
|---|---|
| `packages/db/migrations/0018_v3_peer_network.sql` | agent_mode + peer fields |
| `packages/db/migrations/0019_peer_desk_seed.sql` | second CEO desk + system agents |
| `apps/web/app/api/v2/missions/route.ts` | POST = inbound peer dispatch (auth via peer_token) |
| `apps/web/app/api/v2/peer/done/route.ts` | downstream callback handler |
| `apps/web/app/api/v2/agents/[id]/peer/route.ts` | configure agent as façade |
| `apps/web/components/FacadeConfig.tsx` | UI in AgentSheet manage drawer |
| `apps/web/lib/v2-data.ts` | `dispatchToPeer` + `setAgentPeerConfig` + callback wiring |
| `scripts/v3_demo.sh` | one-shot demo orchestrator |
| `scripts/v3_e2e.sh` | the 9-step end-to-end test |

## Suggested next sessions

1. **UI polish first** (M2 complete): 🔗 indicators on task cards, peer status pill.
2. **Robustness**: heartbeat tick + retry queue. Without these, network failures silently lose tasks.
3. **3-instance demo**: add C instance, chain A→B→C, verify multi-hop routing works (it should already, since each hop is independent).
4. **Production hardening**: HTTPS, secrets in env (not DB), token rotation API.
