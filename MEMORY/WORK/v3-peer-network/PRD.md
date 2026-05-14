# Mibusy V3 — Peer Network ("延长线"架构)

**Status:** Draft v0.1
**Created:** 2026-05-14
**Author:** chen.zhang6@gmail.com
**Codename:** 延长线 (Extension Cord)

---

## 1. 核心洞察 (The "Why")

**v2 的世界：** 一个 app instance = 一个 CEO + N 个虚拟员工（AI agent）。员工是叶子节点，干完活就结束。

**v3 的世界：** 每个员工是**延长线的一个接口**，可能是叶子（AI），也可能是另一个真人 CEO 实例的代理（façade）。组织通过**真人**扩展，纯 AI 链没意义。

**为什么 AI 不延长：**
- AI 链下去 = 一个大模型套娃，没有新增信息 / 判断 / 责任
- 管理复杂度爆炸：每一级 AI agent 都要维护它的子员工状态
- 没有外部世界的接入点

**为什么真人延长有价值：**
- 真人 = 判断 + 责任 + 外部世界接入点（他认识的人、能做的事）
- 真人下面又可以有自己的 AI 助理 + 再延长到下一个真人
- 形成天然的**多级组织结构**，每级是真人节点

**类比：** MLM / 传销组织结构 — 但不是为了卖货圈钱，是为了**任务委托 + 责任传递 + 知识沉淀**的分布式网络。

---

## 2. 用户故事

**作为 CEO，我想：**
- 我招的"小王"实际是另一个真人朋友的 CEO 实例的代理
- 我说"小王 做 X" → X 进了他的 mission inbox
- 他在自己的 Mibusy 里看到 → 他可以亲自做 / 派给他的 AI 员工 / 再派给他下面的真人
- 他完成了 → X 的交付物回流到我这里小王的任务历史
- 我看到的过程跟普通 AI 员工没区别，只是慢一点（真人时间）+ 质量更高

**作为下游真人 CEO，我想：**
- 上游派来的任务在我的 mission inbox（已有，v2 已实现）
- 我接 / 拒 / 递交都是熟悉的 v2 流程
- 我自己也有 AI 员工 + 我下面也可能再延长到下一级真人
- 整个网络递归同构

**作为系统：**
- 一个虚拟员工有两种 mode：**AI mode**（默认 Hermes 执行）或 **Façade mode**（peer 转发）
- 切换 mode 是配置项（不是新建员工类型）
- 网络拓扑可以任意深度 + 任意分支

---

## 3. 架构 / Topology

```
                       ┌─────────────────────┐
                       │   Instance A: 我     │
                       │   CEO: 陈飞翔         │
                       └─────────────────────┘
                                │
        ┌───────────────────┬───┴────────────┬──────────────────┐
        ▼                   ▼                ▼                  ▼
  Nova (AI)         Ledger (AI)        小王 (Façade)       林姐 (AI)
   [leaf]            [leaf]              │                  [leaf]
                                         │ peer connection
                                         ▼
                              ┌─────────────────────┐
                              │  Instance B: 朋友A   │
                              │  CEO: 王某           │
                              └─────────────────────┘
                                    │
                        ┌───────────┼───────────┐
                        ▼           ▼           ▼
                     Quill (AI)  自己干    阿木 (Façade)
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ Instance C: 阿木  │
                                    │ CEO: 阿木        │
                                    └─────────────────┘
                                        ...
```

**关键不变量：**
- 每个 instance 都是完整的 v2 Mibusy（CEO desk + agents + missions + ...）
- "Façade agent" 在 CEO 视角下跟 AI agent 长得一样，差别仅在 transport
- 上游 CEO 看不到下游 CEO 内部结构（黑盒），只看到入口 façade
- 责任传导：上游的 mission → 下游的 mission（递归）

---

## 4. 数据模型变更

### 4.1 `virtual_agents` 加 mode 字段

```sql
ALTER TABLE virtual_agents
  ADD COLUMN agent_mode TEXT NOT NULL DEFAULT 'ai'
    CHECK (agent_mode IN ('ai', 'facade'));
```

### 4.2 `agent_connections` 已有 transport='peer'，补字段使其真用起来

```sql
ALTER TABLE agent_connections
  ADD COLUMN peer_url TEXT,
  ADD COLUMN peer_token UUID;   -- token of the peer instance's downstream-receiving endpoint
```

`peer_url` 形如 `https://friend-mibusy.example.com` 或开发环境 `http://localhost:3001`
`peer_token` 是对端发给我的"以这个 token 派任务给我"的工作令牌（对端 `ceo_integrations` 视角的 work_token）

### 4.3 Desk-level isolation (multi-tenancy)

v2 全局写死 `CEO_DESK_ID`。v3 改成环境变量：

```bash
MIBUSY_DESK_ID=00000000-0000-0000-0000-000000000001   # default
```

每个实例启动时读自己的 desk_id。两个实例同 DB 可以，desk_id 不同；或者两个实例不同 DB（推荐）。

### 4.4 跨实例任务追踪

```sql
ALTER TABLE assignments
  ADD COLUMN peer_origin_id UUID,        -- 对端的 mission/assignment id
  ADD COLUMN peer_connection_id UUID REFERENCES agent_connections(id);
```

派出去时记下对端 id，回流匹配。

---

## 5. 协议

### 5.1 出站：派任务给 façade agent

```
当 CEO/系统 派任务给 agent X，且 X.agent_mode = 'facade'：
  1. 拿到 X 的 peer connection（peer_url + peer_token）
  2. POST {peer_url}/api/v2/missions
     Authorization: Bearer {peer_token}
     body: {
       topic: assignment.title,
       prompt: assignment.prompt,
       initiator_kind: "peer",
       initiator_label: "{CEO name}@{instance label}",
       peer_origin_id: assignment.id,
       peer_callback_token: <our_token_for_them>,
     }
  3. 对端写入自己的 missions 表（origin='inbound', peer_origin_id=...）
  4. 我方 assignment 状态 = 'running'，peer_origin_id 记下对端返回的 mission id
```

### 5.2 入站：peer 派进来

复用现有 `/api/v2/missions` POST 端点（v2 mission inbox 已有）+ 加 peer_token 鉴权 + 写 peer_origin_id

### 5.3 完成回流

```
对端 CEO 递交 mission（v2 流程）：
  → 对端调 finalizeMeetingSummary / submitMissionReport
  → 触发对端"我有 peer_callback_token，派出去时来自上游" → POST 上游
  → POST {our_url}/api/v2/peer/done
     Authorization: Bearer {our_token_for_them}
     body: { peer_origin_id, deliverable: { title, body } }
  → 我方匹配 peer_origin_id 找到原 assignment
  → 写入 deliverables 表
  → 状态 → 'completed'
  → 出现在小王的任务历史里
```

### 5.4 健壮性

- **重试队列**：peer 不在线时入队，tick 时重试（指数退避）
- **心跳**：peer connection 定时 ping 对方 `/api/v2/peer/ping`，更新 `last_seen_at`
- **超时升级**：超过 N 天没响应 → CEO 收到通知"小王 peer 离线 N 天"，可重派给其他人

---

## 6. UI 改动

### 6.1 AgentSheet 加 Mode 切换

进任一员工配置，"agent_mode" 字段：
- **AI mode**（默认）：normal Hermes 执行
- **Façade mode**：弹出 peer 配置子面板
  - Peer URL
  - Peer token（对端给的）
  - Test connection 按钮
  - 状态：在线/离线/上次心跳

### 6.2 TodayPage / Tasks 标记

Façade agent 派出去的任务在卡片上加个小图标 `🔗` 表示"通过外部实例"。任务详情里显示 "由 [真人名字]@[他的实例] 执行中"。

### 6.3 网络全景图（v3.1 nice-to-have）

CEO 配置里加一页"组织图"：可视化我下面所有 façade 连接到了谁、对方又延伸到了谁（仅显示对方愿意公开的层级）。

---

## 7. 安全 / 信任

- 每对 peer 双向交换 token：A 给 B 一个 token 让 B 派任务给 A，B 给 A 一个 token 让 A 派任务给 B
- Token 存在 `agent_connections.peer_token`
- 撤销：删 connection 即令牌失效
- TLS：生产必须 HTTPS（开发 localhost 例外）
- Rate limit：每个 peer connection 限制 N 任务/小时（防滥用）

---

## 8. 里程碑

### M0 — 基础设施（1-2 天）

- [ ] migration 0018: virtual_agents.agent_mode, agent_connections.peer_url/peer_token, assignments.peer_origin_id
- [ ] CEO_DESK_ID → env var
- [ ] `npm run dev:peer` 跑 3001 端口 + 独立 DB schema 或不同 DB（脚本）
- [ ] 验证：两个浏览器开两个实例，互不干扰

### M1 — Peer 协议核心（2-3 天）

- [ ] AgentSheet 加 "Façade mode" 切换 + peer URL/token 配置
- [ ] Test connection 端点：`/api/v2/peer/ping`
- [ ] 出站：派 façade agent 任务时 POST 对端 missions
- [ ] 入站：missions POST 端点接受 peer_token 鉴权
- [ ] 回流：`/api/v2/peer/done` 端点
- [ ] 在 worker 流程里：façade agent 不走 Hermes，标记 'running' 等回流

### M2 — UI 完善（1-2 天）

- [ ] 任务卡片上 façade 标记 🔗
- [ ] 心跳 + 在线状态显示
- [ ] 失败重试队列
- [ ] 错误展示（peer 离线时 CEO 看到提示）

### M3 — 演示场景（半天）

- [ ] 一键脚本：起 3 个 instance（A/B/C），自动配好 peer 连接 A→B→C
- [ ] 录屏 demo：A 派任务 → B 接 → B 派给 C → C 完成 → 反向回流

### M4 — 安全 / 生产（暂缓，v3.1）

- HTTPS 强制 + 证书
- Rate limit
- 跨域 CORS 收紧
- 网络全景图

---

## 9. 非目标 (V3 不做)

- AI agent 之间的"延长" — 仍然只是 Hermes leaf 节点
- 上下游强一致 — 接受最终一致性（重试 + 幂等）
- 商业化用户 / 多租户计费
- 可视化组织图（推到 v3.1）

---

## 10. 风险 / 未决问题

| 风险 | 应对 |
|---|---|
| Peer URL 怎么发现 | M1 用手动配（用户互发 URL+token），未来可加 Discovery server（v3.x） |
| 网络分区时一致性 | At-least-once delivery + idempotency key (`peer_origin_id`) |
| AI 员工误标 façade | UI 上明显的 mode 标记 + 切换确认对话框 |
| Token 泄漏 | 每次轮换 token（POST /api/v2/peer/rotate_token） |
| 跨时区/语言 | mission payload 用 UTF-8 + ISO 8601；UI 在每端本地化 |

---

## 11. 出发点

立即开始 M0：建 migration 0018 + CEO_DESK_ID env 化 + dev:peer 脚本。

跑通 M0 后，UI 配置 façade mode 是 M1 的第一个任务。
