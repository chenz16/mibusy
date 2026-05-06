# Solo Agent Platform — Stage 1 Spec

> 1 人公司 Hobby Project · 基于 Anthropic Claude Agent SDK
> 路径定位:Hobby → 第二阶段商业化 SaaS

---

## 文档版本与状态(Status Banner)

**版本:** v1.1 — 开发就绪(Development-Ready)
**最后更新:** 2026-05-05
**当前阶段:** ✅ Spec 闭环完成,可启动 Week 0 spike

### 这个文档是什么

一份完整的产品 + 架构 + 工程规格,告诉你(或未来的你自己)**为什么做这件事 / 做什么 / 怎么做 / 信息从哪来**。

**不含**:可运行的代码、UI 设计稿、客户协议、商业模式。

### 闭环进度

| 轮次 | 内容 | 状态 |
|---|---|---|
| 第 1 轮 | Problem statement + 需求 + 架构 + 数据模型 + 路线图 | ✅ §0-§13 |
| 第 2 轮 | 开发前预设决策(15 条 PD-XXX,默认通过) | ✅ 附录 D |
| 第 3 轮 | 工程边界澄清(10 条 EB-XXX) | ✅ 附录 E |
| 第 4 轮 | 配置/状态来源唯一性(5 条 FB-XXX,SoT 规则) | ✅ 附录 F |
| 第 5 轮 | 开发层剩余问题 + 正文一致性清理(3 条 IO-XXX + 20 条 CL-XX) | ✅ 附录 G |
| 第 6 轮 | 文档细节漏洞清理(8 项,CL-21 至 CL-34) | ✅ 附录 G.4 末尾 |

**闭环判定:**
- ✅ 所有 reviewer 反馈已吸收(3 轮外部 review,共 30 项意见全部回应)
- ✅ 正文与附录无矛盾(grep 验证残留为零)
- ✅ Schema 分布说明清晰,W0 输出汇总 migration 为唯一权威
- ✅ Cost 归因双层模型完整(本 session 实时 + root 聚合)
- ✅ Role 语义拆清(tenant 内 / 平台级)
- ✅ SSE 优先级与成本路径绑定(默认 polling)
- ✅ Week 0 验证矩阵完备(V1-V11)
- ✅ Week 0 → Week 8 路线图明确

### 下一步该干什么

**不再修文档了。** 进入 Week 0 spike。

具体看本文档末尾的 **§"下一步行动" 章节**(在所有附录之后)。

### 如何阅读这个文档

- **第一次看:** 从 §0.1 开始顺读到 §13,跳过附录
- **要拍板决策:** 直接看 附录 D(预设决策)+ 附录 E(工程边界)
- **要写代码:** 重点看 §6(数据模型)+ §7(状态机)+ 附录 E.1-E.6
- **要写 prompt:** 看 §13.1(template 设计)+ 附录 D.7(prompt 风格)
- **不知道某个术语:** 翻到附录 C
- **想知道"为什么这么定":** 看 §0.5(决策日志)+ 各 PD/EB/FB/IO 条目的"推导"段

---

## 0. 阅读指南

本文档是 Stage 1 的**问题陈述 + 需求 + 功能 + 架构**规格,**不含代码实现**。

- 第 0.x 章:前因后果(背景 / 问题陈述 / 选型推理)
- 第 1-2 章:阶段定位与心智模型
- 第 3-4 章:用户能用到的功能
- 第 5-7 章:架构、数据模型、状态机
- 第 8-9 章:技术选型与集成
- 第 10-11 章:跨阶段演进与风险
- 第 12-13 章:路线图与待决策项
- 附录 A-C:技术选型 / SDK 依赖 / 术语
- 附录 D:开发前预设决策(15 条 PD-XXX,默认通过)
- 附录 E:工程边界澄清(10 条 EB-XXX,Week 0 spike 入口)
- 附录 F:配置与状态的来源唯一性(5 条 FB-XXX,SoT 规则)
- 附录 G:开发层剩余问题与一致性清理(3 条 IO-XXX + 20 条 CL-XX 修订日志)

---

## 0.1 背景(Background)

### 0.1.1 提出者背景

项目发起人当前在机器人公司从事后训练相关工作,日常涉及 VLA 模型、diffusion policy、sim-to-real 等机器人 ML 基础设施。同时在推进一条副业:利用中国供应链 + 美国实体身份,做面向美国 CTE / K-12 / 大学市场的机器人教育产品。

在这两条主线之外,过去几个月持续在做第三件事——**系统性评估 agent 系统的搭建路径**。这条评估线索包括:

- **运行时层**:Claude Code 的 subagent / hook / skill 编排模式,Cowork 的 scheduled tasks 与 dispatch 机制
- **模型层**:π₀.₇ 模型部署架构、GLM-5.1 (744B MoE) 性能与部署成本、SigLIP 双塔架构
- **路由与经济层**:Lobster Box 的 LLM token 经纪概念、prompt cache 经济学、API vs 订阅成本结构、Anthropic 对第三方订阅复用的封禁(2026 年 4 月)
- **架构层**:OpenClaw Gateway 的网关-模块解耦、agent 系统的四原语抽象(context / LLM call / tool execution / conditional route)
- **生态层**:MCP 服务器与连接器选型(Reddit / Google / 各类内部数据源)

这些看似散乱的研究指向同一个问题:**对于 1 人规模的开发者,用什么样的架构搭 agent 系统才能既现在能用、又不堵死未来商业化路径**。本项目就是这条评估线落地为代码的开始。

### 0.1.2 为什么是现在

三个外部条件的合流让这个项目的时机变成熟:

1. **Anthropic 推出 Agent SDK(原 Claude Code SDK)**,把 agent loop / 内置工具 / 上下文管理 / hook 机制抽出来做成可编程库,Python 与 TypeScript 双语言支持,Opus 4.7 在 ≥ 0.2.111 版本可用
2. **Anthropic 发布 Managed Agents(beta,2026-04)**,给出托管侧 REST API 形态,定价 $0.08/session-hour,作为 SDK 自部署的对应替代
3. **MCP 生态成熟**到可以靠"装 connector"完成大部分工具集成,不需要从零写 retriever / API client

意味着**底层 agent loop 不再需要自建**——这件事一年前还是研究问题,现在是工程问题。1 人开发者把精力放在 control plane(编排、状态、预算、人机交互)是合理的资源分配。

---

## 0.2 问题陈述(Problem Statement)

### 0.2.1 核心问题

> **作为一个 1 人开发者,如何搭建一个 agent 平台,使其在第一阶段能服务自己 + 1-2 个朋友的真实日常使用,且架构上不阻塞第二阶段演进为商业化 SaaS?**

这不是一个工具型问题(写个脚本能解决的事),也不是一个产品型问题(造一个新品类),而是一个**架构选择问题**:在已有的 agent 运行时基础上,如何设计 control plane,使得"现在好用"与"未来能扩"两个目标不冲突。

### 0.2.2 子问题分解

主问题拆成五个独立但相关的子问题,后续章节分别回应:

| 子问题 | 含义 | 落点章节 |
|---|---|---|
| **SP1. Runtime 选型** | Agent SDK / Managed Agents / 第三方框架(OpenClaw 等)如何取舍 | §0.3 |
| **SP2. Lifecycle 管理** | 谁创建 agent、谁追踪状态、谁回收资源、人机如何异步协作 | §7, §11 |
| **SP3. Agent 间协作模型** | Template 关系、调用语义(同步/异步)、上下文传递 | §2 |
| **SP4. 上下文与记忆** | 事实型知识 / 历史会话 / 当前状态分别用什么方式检索 | §2.4, §6.5 |
| **SP5. 多租户演进** | Stage 1 轻度隔离如何无缝升级为 Stage 2 商业级隔离 | §9, §10 |

### 0.2.3 反问题(明确不解决什么)

为避免范围蔓延,明确这些问题**不在本项目目标内**:

- ❌ "如何造一个比 ChatGPT 更好的 chat 产品" — 这是产品问题,不是架构问题
- ❌ "如何训练自己的 agent 模型" — 用现成 LLM,不做训练
- ❌ "如何做 LLM 路由 / token 经纪" — 单后端 Anthropic,LiteLLM 只作为切换备份
- ❌ "如何搭企业级合规体系" — Stage 2 的命题,Stage 1 只留接口
- ❌ "如何做客户增长" — Stage 2 才考虑,Stage 1 是邀请制

---

## 0.3 选型推理(Selection Rationale)

回应 SP1:为什么是 Agent SDK 而不是其他方案。这一节展开决策过程,为后续读者(包括未来的自己)留下推理路径,避免被"为什么不用 X"反复挑战。

### 0.3.1 候选方案对比

|方案 | 形态 | 自主可控性 | Stage 1 适配 | Stage 2 适配 | 弃选理由 |
|---|---|---|---|---|---|
| **Agent SDK(选中)** | 库,自部署 | 高(代码、数据、密钥全自管) | 高 | 高(可与 Managed 共存) | — |
| Managed Agents | 托管 REST API | 低(运行时在 Anthropic) | 中(需要先有 control plane) | 高(长任务场景) | Stage 1 单用就缺 lifecycle 管理层;留作 Stage 2 长任务场景的补充 |
| OpenClaw | 个人 assistant 运行时 | 中(local-first 但生态混杂) | 错配:它是 chat-channel 形态,不是产品后端 | 低:不能作为对外 SaaS 的运行时 | 类别错位 + 安全水位不足 + 订阅经济性已被 Anthropic 封堵 |
| LangGraph / LangChain | 编排框架 | 中 | 中(再叠一层抽象) | 中 | 与 Agent SDK 的 hook/subagent 重复,叠加只会增加心智负担 |
| 完全自研 agent loop | 从零造 | 最高 | 低(造轮子成本) | 不必要 | Anthropic 已把这层做出来了,自研无收益 |

### 0.3.2 关键判定:Agent SDK 与 Managed Agents 的关系

这两个**不是二选一**,而是**主备 + 后期补充**关系:

- **Stage 1 主力 = Agent SDK**:本地/VPS 跑,迭代快,hook 与 subagent 控制力最强,跟 Claude Code 生态(SKILL.md / CLAUDE.md / plugin)无缝
- **Stage 2 补充 = Managed Agents**:出现"分钟到小时级长任务 + 需要持久 sandbox"的场景时,把那部分 workload 迁过去,$0.08/session-hour 抵掉自建 sandbox 的运维成本
- **抽象一致**:Control plane 的 API 层做好,底下接哪个执行平面对调用方透明

### 0.3.3 关键判定:OpenClaw 的错位

OpenClaw 在评估早期被作为候选,最终弃选,理由列明以备未来回顾:

1. **类别错位**:它是 personal assistant 形态(用户在 WhatsApp/Telegram 跟 agent 对话),不是产品后端框架
2. **安全水位**:adversarial 防御率约 17%,第三方 skill 含恶意代码比例约 17%,生态未收敛
3. **经济性消失**:Anthropic 2026-04 封禁第三方订阅复用,OpenClaw 接 Claude 与直接用 SDK 同价
4. **运维负担**:1 人公司每周需 1-2 小时维护 daemon / channel adapter / skill 审计

OpenClaw 在 Stage 1 的合理位置是:**作为 personal assistant 在本地装一个,与产品代码完全隔离**,不进入产品架构。

---

## 0.4 需求映射(Requirements Rationale)

这一节把 §0.2 的子问题反向映射到具体需求,说明每条需求**为什么存在**。后续章节看到任何设计选择,都可以回到这里追溯动机。

### 0.4.1 功能需求 → 子问题映射

| 功能需求(§4) | 来自子问题 | 动机 |
|---|---|---|
| Chat 区(场景 A) | SP3 | 同步对话场景,subagent 调用模式的主要触发点 |
| Tasks 区(场景 B) | SP2 | 长任务的 lifecycle 管理(awaiting_input 释放 worker 是核心) |
| Schedules 区(场景 C) | SP2 | cron 触发 + 自动失败处理,验证 lifecycle 在无人值守下的鲁棒性 |
| Inbox 区 | SP2 | 人机异步边界,AskUserQuestion 闭环 |
| Memory 区 | SP4 | Layer 1 实现,Layer 2/3 留位 |
| Templates 管理 | SP3 | DAG 调用图配置入口 |
| Settings 区 | SP5 | 多租户隔离的运营接口(邀请、预算、kill switch) |
| Observability 区 | SP2 + SP5 | cost 归因 + tenant 维度拆分 |

### 0.4.2 非功能需求 → 子问题映射

| 非功能需求 | 来自子问题 | 阈值 / 标准 |
|---|---|---|
| Schema 多租户预留 | SP5 | 每张业务表带 tenant_id,Stage 2 升级零迁移 |
| Cost 实时归因 | SP2 | 每个 LLM call 落 billing_events,可按任意维度聚合 |
| 三层预算护栏 | SP2 | per-session / per-day / 全局 kill,任一命中即停 |
| Worker 重启自愈 | SP2 | 同一 Fly machine + mounted volume 下,worker 进程挂掉重启可从 sdk_session_path 恢复;machine 重建 / 跨 machine 不保证恢复(详见 EB-006) |
| RLS 数据隔离 | SP5 | 跨租户查询返回零结果,E2E 测试覆盖 |
| Memory 检索分层 | SP4 | Stage 1 = Layer 1 + 检索(per-session summary + embedding + 跨 session 语义检索);Stage 2 加 Layer 2/3 不动核心代码 |
| 通知抽象成 driver | SP5 | Stage 1 邮件 + inbox,Stage 2 加 Telegram/Slack 不动核心 |

### 0.4.3 反需求(避免被 scope creep 拖跑)

| 反需求 | 为什么不做 |
|---|---|
| 不做可视化 agent 编辑器 | ComfyUI 路径成本远超收益,客户要结果不要工具 |
| 不支持自定义代码上传 | 沙箱复杂度超过 1 人可承担 |
| 不做实时多人协作 session | 一次性 session + tree 模型够用 99% 场景 |
| Stage 1 不做 BYOK | 计费与限流复杂度,等客户主动要再加 |
| 不嵌 LangChain/LangGraph | SDK hook + subagent 已经够用,叠层只增加心智负担 |
| 不从 Day 1 上 K8s | Fly.io machines 单进程接近零运维 |

---

## 0.5 决策日志(Decision Log,精简版)

只记影响架构的关键决策,详细 ADR 在 Stage 1 结束时单独沉淀。

| ID | 决策 | 替代方案 | 选择理由 |
|---|---|---|---|
| DL-001 | Agent runtime = Claude Agent SDK Python | Managed Agents / OpenClaw / 自研 | §0.3.1 |
| DL-002 | Template 平铺存,关系用 DAG | 树形 parent_template_id | 重组成本低,层级穿透自然 |
| DL-003 | Session 是树,实例化时长出 | 不存父子,纯 flat session | 父子关系是 trace + cost 归因的天然单位 |
| DL-004 | Subagent 与 subprocess 双通道 | 只用 subagent | 异步派活场景必需,subagent 阻塞不适合 |
| DL-005 | Multi-tenant from Day 1 | Stage 2 再加 tenant_id | 后期数据迁移成本远高于一次性预留 |
| DL-006 | RLS 简化版 → 完整版 | 应用层做隔离 | DB 层强一致,应用层易漏 |
| DL-007 | Postgres `jobs` 表 + `FOR UPDATE SKIP LOCKED` | pg-boss / Redis / SQS / Inngest | 跨语言友好(Python worker + TS API),零额外服务 |
| DL-008 | Worker = Fly.io 长进程 Python | Vercel Functions / Cloud Run | Vercel 超时限制,长任务 fail |
| DL-009 | Streaming = SSE | WebSocket | 单向流够用,运维简单 |
| DL-010 | Memory = "Layer 1 + 检索"(Stage 1) | Day 1 上三层 / 完全不做检索 | per-session summary + embedding + 跨 session 检索;100+ session 后再决定 Layer 2/3 形态 |

---

## 1. 阶段定位与目标

### 1.1 项目性质

这是一个 hobby project,但不是玩具。要满足三个底线:

1. **真实可用** — 自己 + 1-2 个朋友每天能正常用,不是 demo
2. **自主可控** — 所有数据、密钥、调度都在自己手里,不锁死任何 vendor
3. **跟市面差不多** — 使用体验对标主流 agent 平台,不能粗糙

### 1.2 阶段使命

**Stage 1 = "私人 agent 平台,长成 SaaS 的样子"**

- 不是"我自己用的脚本工具"
- 也不是"完整商业 SaaS"
- 是中间形态:功能上 1-3 个用户能用,架构上为 Stage 2 商业化预留接口

### 1.3 Stage 1 不做什么

明确 out-of-scope,避免发散:

- ✗ Stripe / 订阅 / 自动账单
- ✗ Landing page / SEO / 邮件营销
- ✗ 客服系统 / 工单 / SLA
- ✗ SOC2 / GDPR / 合规文档
- ✗ Memory Layer 2/3(只留 schema)
- ✗ Skill / MCP marketplace
- ✗ BYOK(客户自带 API key)
- ✗ 复杂 RBAC / 团队协作

### 1.4 衡量成功的标准

Stage 1 结束时应满足:

- [ ] 自己 + 1-2 个朋友用了至少 4 周,出过 100+ session
- [ ] 三种调用场景(对话/后台/定时)都跑通
- [ ] 月运维成本 ≤ $30(LLM token 费另算)
- [ ] 单租户数据零泄漏到其他租户
- [ ] Schema 不需要重大重构就能进 Stage 2

---

## 2. 核心概念与心智模型

### 2.1 Template vs Session

| 概念 | 类比 | 性质 |
|---|---|---|
| Template | 类 / 可执行文件 | 配置蓝图,定义 prompt + tools + skills + 预算 |
| Session | 实例 / 进程 | 运行时实体,有自己的 context、cost、状态 |

**关键性质:**
- Template 在 DB 里**平铺存储**,不是树
- Session **运行时长成树**(parent_session_id 关系)
- 同一个 Template 可被多个 Session 实例化,各自独立

### 2.2 Subagent vs Subprocess

两种"agent 调 agent"的形态,语义完全不同:

| 维度 | Subagent(同步) | Subprocess(异步) |
|---|---|---|
| 父等不等 | 等(阻塞) | 不等(立即返回) |
| 父子关系 | parent_session_id 直接连 | 新 root,只 triggered_by 溯源 |
| 结果回流 | summary 回父 LLM context | 不回流,通过 DB/inbox 通信 |
| 类比 | 函数调用 | fork 新进程 |
| 适用 | 父需要结果继续推理 | 一次性派活、跨域协调、定时触发 |

**默认规则:** 组织架构从上而下走 subagent,越权调用 / 派活走 subprocess。

### 2.3 Template 关系是 DAG

Template 之间的"谁能调谁"是**有向无环图(DAG)**,不是树:

- **有向**:A 能调 B 不代表 B 能调 A
- **无环**:禁止 A→B→A 死循环
- 用 `template_invocation_edges` 表存,新增边时做拓扑排序检测环

Session 运行时实例化出来的形状,在 DAG 允许范围内自然成树。

### 2.4 上下文检索分三类

不同类型的上下文用不同方法检索,**不要混**:

| 类型 | 例子 | 方法 |
|---|---|---|
| A. 事实型知识 | 公司文档、历史工单 | RAG / 向量检索 |
| B. 历史会话/动作 | 之前 session 的总结 | 多层 summary + 检索 |
| C. 当前结构化状态 | 订单 ID、任务列表 | 直接 SQL,不用 RAG |

Stage 1 对 B 类做完整的"Layer 1 + 检索":per-session summary、embedding、跨 session 语义检索;不做 Layer 2(主题汇总)与 Layer 3(persona facts)。详见 EB-008。

---

## 3. 三个核心使用场景

Stage 1 必须把这三种场景都跑通,因为它们暴露的架构需求互补。

### 3.1 场景 A:对话型(即发即得)

**典型流程:**
1. 打开 web UI 进入 chat 区
2. 选 template(默认 `general_assistant`)
3. 输入需求,即时收到流式响应(状态 + tool_use / tool_result + final summary)
4. 中途可:暂停、注入消息、改预算、kill
5. 多轮对话,session 持续

**暴露架构需求:** Streaming(SSE)、worker 长连接、permission ask 闭环

### 3.2 场景 B:后台任务(几分钟到几小时)

**典型流程:**
1. 进 Tasks 区,点"启动后台任务"
2. 选 template(如 `research_agent`)+ 输入 prompt + 设预算 + 设结果通知方式
3. 提交后立刻返回 task ID,关掉浏览器
4. Worker 后台跑,可能 30 分钟到几小时
5. 完成后:邮件 / inbox 通知,回来看 trace 和结果

**暴露架构需求:** 异步执行、worker 长任务持久化(单 Fly machine + volume,详见 EB-006)、状态机的 awaiting_input 释放、终态归档

### 3.3 场景 C:定时任务(无人值守)

**典型流程:**
1. 进 Schedules 区,新建定时任务
2. 配置:cron 表达式 + template + prompt 模板 + 通知渠道
3. 系统按时自动触发,无人监督
4. 失败 N 次自动 disable + 告警

**暴露架构需求:** 调度器、自动重试、失败告警、cost cap 防失控

---

## 4. 产品功能(用户视角)

Web App 分 7 个区,前 5 个是日常使用,后 2 个是管理。

### 4.1 Chat 区(场景 A 入口)

- **Conversation 列表**:历史对话,按 template 或时间分组,搜索
- **单 chat 视图**:streaming 显示状态 + tool_use / tool_result + 最终 summary(thinking 不渲染,详见 EB-009)
- **中途控制**:暂停、注入消息、改 budget、kill
- **Template 切换**:进 chat 时可选,默认 `general_assistant`
- **历史 trace**:每个 chat 关联一棵 session tree,可展开看子 session

### 4.2 Tasks 区(场景 B 入口)

- **新建任务表单**:template / prompt / budget / 通知方式 / tags
- **任务列表**:running / completed / failed 三态,显示 cost、duration、子 session 数
- **详情页**:完整 trace tree(本地简版 + Langfuse 跳转)
- **复跑/Fork**:从某个 turn 分叉重跑(P1)

### 4.3 Schedules 区(场景 C 入口)

- **新建定时**:cron 表达式或预设(每天/每周一/...)+ template + prompt 模板
- **列表**:enabled / disabled、上次/下次运行时间、最近 5 次状态
- **详情**:历史运行结果,失败原因,可手动 trigger 一次

### 4.4 Inbox 区(横跨三场景)

- Agent AskUserQuestion / approval / review 命中时落到这里
- 卡片形式:问题 + 上下文 + answer 输入
- 回答后自动 resume session
- 24h 不答自动取消(可配置)
- 邮件 + web 推送

### 4.5 Memory 区(辅助)

- 浏览 session summaries(Layer 1)
- 搜索历史(向量检索)
- 手动编辑 / 删除 summary(P1)
- Layer 2/3 的占位入口(Stage 2 实现)

### 4.6 Settings 区

**个人设置:**
- 邮件、通知偏好、API key

**全局设置(只 owner 可见):**
- Anthropic 配置状态(只读;key 由 Doppler 注入,详见 EB-007)
- MCP server 配置
- 月度全局预算
- Kill switch(一键停所有 running session)
- 邀请朋友(生成邀请码)

### 4.7 Observability 区

- **Cost dashboard**:今日/本周/本月,按 template / 用户 / 租户拆分
- **Recent traces**:最近 50 个 session,成功率、平均时长、平均 cost
- **Langfuse 嵌入**:深度 trace 跳转

### 4.8 Templates 管理(管理后台)

- **列出**:全局 template + 自己的私有 template
- **编辑**:prompt / tools / skills / MCP / budget / 调用图(can_invoke)
- **版本**:每次保存自动 +revision,在跑的 session 锁定旧 revision
- **测试**:用当前 template 起临时 session 验证
- **Fork**:从全局 template 复制到自己租户后修改

---

## 5. 系统架构(分层)

```
┌──────────────────────────────────────────────────────┐
│  Clients                                             │
│  Web UI (Next.js) │ Webhook │ Cron tick              │
├──────────────────────────────────────────────────────┤
│  API Gateway                                         │
│  Auth (Supabase) │ Rate limit │ Tenant routing       │
├──────────────────────────────────────────────────────┤
│  Control Plane                                       │
│  Registry │ Session FSM │ Budget │ Inbox │ Schedule  │
├──────────────────────────────────────────────────────┤
│  Execution Plane                                     │
│  pg jobs table │ Agent SDK runner │ Hooks            │
├──────────────────────────────────────────────────────┤
│  Data & Integration                                  │
│  Postgres │ pgvector │ MCP servers │ Langfuse        │
└──────────────────────────────────────────────────────┘
```

### 5.1 Control Plane

**职责:** 编排、状态、预算、人机交互边界

**子模块:**

| 模块 | 职责 |
|---|---|
| Agent Registry | Template CRUD + 版本管理 + DAG 边校验 |
| Session FSM | 状态转换、父子关系、cost 归因 |
| Budget Guard | 三层预算(per-session / per-day / 全局)+ kill switch |
| Inbox | 待处理项管理、超时取消、通知 |
| Scheduler | cron 触发、失败重试、自动 disable |

### 5.2 Execution Plane

**职责:** 实际跑 agent

**子模块:**

| 模块 | 职责 |
|---|---|
| Job Queue | Postgres `jobs` 表 + `FOR UPDATE SKIP LOCKED`,所有触发统一进队列 |
| Worker Pool | Fly.io machine,长进程 Python,并发拉取 job |
| SDK Runner | 包装 Claude Agent SDK,处理 streaming、hook、permission |
| Hooks | PreToolUse / PostToolUse / SessionStart / SessionEnd |

### 5.3 Data & Integration Plane

| 模块 | 职责 |
|---|---|
| Postgres (Supabase) | 主存储,带 RLS |
| pgvector | session_summaries 向量索引 |
| MCP Servers | 外部工具集成(Notion / Drive / Slack / 自建) |
| Langfuse | Trace、cost、性能观测 |
| Resend | 邮件通知 |

---

## 6. 数据模型

> **Schema 分布说明:** 本节描述各表的字段语义。具体 DDL 散落在多处:
> - 本节 §6.1-§6.7:字段表
> - 附录 E.1:`jobs` 表 DDL
> - 附录 E.2:RLS policy 语句
> - 附录 E.4:`session_events` 表 DDL
> - 附录 G.1:`invitations` 表 DDL + Auth Hook
>
> **W0 输出之一:** 把以上分散 DDL 合并为单一 migration 文件 `packages/db/migrations/0001_init.sql`,作为 W1 Day 1 的起点。这个汇总动作列入 W0 任务清单(见 §G.6 末尾的"汇总产出"段)。

### 6.1 多租户根

| 表 | 关键字段 | 说明 |
|---|---|---|
| tenants | id, plan, monthly_budget_usd | Stage 1 每个用户一个租户 |
| users | id, tenant_id, email, role, platform_role | role: tenant 内角色(`owner`/`member`);platform_role: 平台级角色(`admin`/`friend`)。Stage 1 每用户一 tenant,所以 friend 在自己 tenant 内是 owner,在平台层是 friend |

### 6.2 Template 与调用图

| 表 | 关键字段 |
|---|---|
| agent_templates | id, tenant_id, name, revision, model, system_prompt, allowed_tools, skills, mcp_servers, permission_mode, max_budget_usd, max_session_hours, archived_at |
| template_invocation_edges | caller_template_id, callee_template_id |

**SoT 规则(对应附录 F):**

- **`template_invocation_edges` 是"谁能调谁"的唯一权威**(template-to-template 调用关系,DAG)
- **不存在 `invokable_by` 字段**——之前草稿中出现过,统一删除以避免双源
- **用户/角色级别的"谁能 invoke 哪个 template"**(template-to-user 关系)放在另一个维度:由 `users.role` + 一张 `template_role_permissions` 决定,W1 必要时再加,Stage 1a 默认所有 friend 都能 invoke 任何非 archived template

**关键性质:**
- `tenant_id = NULL` 表示全局 template,所有人可读不可写
- `(tenant_id, name, revision)` 唯一,每次编辑 +revision
- Archive 不删除,保证历史 session 可追溯

### 6.3 Session 实例

| 字段 | 说明 |
|---|---|
| id | 主键 |
| tenant_id | 强制隔离 |
| template_id, template_revision | 锁配置版本,防止配置变更影响在跑的 session |
| parent_session_id | subagent 关系(同步父子) |
| root_session_id | 冗余存根,查整棵树用 `WHERE root = X` |
| triggered_by_session_id | subprocess 关系(异步触发) |
| depth | 防递归爆炸,默认上限 5 |
| status | 7 态状态机(见 §7) |
| sdk_session_path | SDK 文件位置 |
| cumulative_cost_usd, cumulative_tokens | **实时累加**:每次 PostToolUse hook 写入(本 session 的成本);**root 级聚合**:子 terminal 时把子的总和加到 root 行(详见 §7.3) |
| initial_prompt, final_summary, error, tags | |
| created_at, last_activity_at, terminated_at | |

### 6.4 Inbox

| 字段 | 说明 |
|---|---|
| id, tenant_id, session_id | |
| type | approval / question / review |
| payload | 问题内容 + context |
| answered_at, answer | |
| expires_at | 默认 24h |

### 6.5 Memory

| 表 | Stage 1 |
|---|---|
| session_summaries (Layer 1) | 完整实现 |
| topic_digests (Layer 2) | 建表,Stage 2 实现 |
| persona_facts (Layer 3) | 建表,Stage 2 实现 |

### 6.6 Schedule

| 字段 | 说明 |
|---|---|
| id, tenant_id, name | |
| cron_expr | 标准 cron 表达式 |
| template_id, prompt_template | prompt 支持变量插值 |
| notify_channels | 邮件 / inbox / webhook |
| enabled, last_run_at, next_run_at | |
| consecutive_failures | 连续失败计数,超阈值自动 disable |

### 6.7 Billing(Stage 1 只写不算)

| 字段 | 说明 |
|---|---|
| id, tenant_id, session_id | |
| event_type | tokens / session_hour / tool_call |
| amount, cost_usd | |
| metadata | |

Stage 1 只记录,不汇总账单。Stage 2 接 Stripe metered billing。

---

## 7. Session 状态机

### 7.1 状态定义

| 状态 | 含义 | Worker 占用 |
|---|---|---|
| pending | 已入队,等 worker 拉 | 否 |
| running | Agent loop 在跑 | 是 |
| awaiting_input | AskUserQuestion 命中,等用户回复 | 否(关键!) |
| suspended | 主动暂停(改预算/调试) | 否 |
| completed | 正常结束 | 否 |
| failed | 错误 / 超预算 | 否 |
| cancelled | 用户 / admin kill | 否 |

### 7.2 状态转换图

```
                   ┌─────────────────────┐
                   │                     │
                   ▼                     │
   pending ──► running ──► awaiting_input┘
                 │  ▲           │ (用户回复 / 24h 超时)
                 │  │           ▼
                 │  └── suspended (改预算/暂停)
                 │
                 ├─► completed
                 ├─► failed (超预算 / 工具错 / SDK crash)
                 └─► cancelled (用户 / admin kill)
```

### 7.3 关键转换规则

- **awaiting_input 必须释放 worker**:状态进 DB,worker 拉下一个 job;用户回复触发新的 worker pickup
- **awaiting_input 24h 自动取消**:防止僵尸 session 堆积
- **terminal state 触发后续动作**:写 summary、归档 SDK 文件、写 billing event、cost 归并到 root
- **状态转换走单一函数**:`transition(session_id, from, to, reason)`,DB transaction,集中加日志和审计
- **Cost 累加分两层(本 session vs root 聚合):**
  - **本 session 自身成本**:每次 PostToolUse hook 拿 LLM call 的 usage,实时 `UPDATE agent_sessions SET cumulative_cost_usd = cumulative_cost_usd + $delta WHERE id = self.id`。这是**运行中 session 的当前 cost 来源**(Observability dashboard 读这一列)。
  - **Root 聚合**:子 session terminal 时,把子的最终 `cumulative_cost_usd` 一次性加到 root:`UPDATE agent_sessions SET cumulative_cost_usd = cumulative_cost_usd + $child_total WHERE id = root_session_id`。**不逐层冒泡**(避免锁竞争),直接跳到 root。
  - **结果:** 任意时刻查 root 的 `cumulative_cost_usd`,得到的是**已 terminal 的子树 + 自己当前**的总成本;running 子 session 的成本要查它自己的行。Observability dashboard 展示"任务总成本"时,需要 `SELECT SUM(cumulative_cost_usd) FROM agent_sessions WHERE root_session_id = $X`(包含 running 中的子)。

### 7.4 父子结果回流(同步 subagent)

**关键澄清:** 子 agent 的 summary 通过 SDK 内部的 tool_result 机制**回到父的 LLM context**,这是 runtime 行为,不是写文件。

- 父发出 Agent tool call → 父进程阻塞
- SDK 启动子 session,子跑完后把 final summary 包装成 tool_result
- tool_result 自动塞回父的 conversation history
- 父的下一个 turn 看到 summary,继续推理

DB 元数据(cost、status、summary 文本)是另一条线,异步、最终一致,**给人类看的,不影响父 LLM 推理**。

---

## 8. 触发与通知

### 8.1 三种触发统一进队列

```
Web UI 按钮 ─┐
Webhook ─────┼─► POST /sessions ─► pending session ─► jobs table ─► worker (SKIP LOCKED)
Cron tick ───┘
```

**所有触发路径必须经过统一入口**,不允许直接调用 SDK。这样限流、重试、观测、审计都集中在一处。

### 8.2 Cron 调度

- Vercel Cron(每分钟一次)调用 `POST /api/cron/tick` endpoint
- Tick endpoint 扫 `schedules` 表,把到期项写入 `jobs` 表(`kind=agent_session`)
- Worker 通过统一的 `SKIP LOCKED` 机制拉取,无第二条执行路径
- Vercel Cron 每 5 分钟戳一下健康检查 endpoint(兜底)
- 失败重试策略:指数退避,3 次后 disable + 通知

### 8.3 通知渠道(Stage 1)

| 渠道 | 用途 |
|---|---|
| Inbox(站内) | AskUserQuestion / 任务完成 / 失败告警 |
| 邮件(Resend) | 重要事件、任务完成、失败、定时摘要 |

**Stage 1 不做** Telegram / Slack / WhatsApp,等 Stage 2 按需加。

---

## 9. 安全与多租户隔离

### 9.1 隔离策略(Stage 1 简化版)

| 维度 | Stage 1 | Stage 2 升级 |
|---|---|---|
| 数据库 | JWT custom claim 注入 `tenant_id`,RLS policy 读 `auth.jwt() ->> 'tenant_id'` | 完整 RBAC + 资源级权限 |
| API | 中间件注入 tenant_id,所有查询带过滤 | scoped API key + audit log |
| Template 共享 | 全局 NULL = 公开,私有 = 自己 | Marketplace + fork + 评分 |
| 密钥 | 你的 Anthropic key 通过 Doppler/env 全局共享,UI 不可改(详见 EB-007) | BYOK + per-tenant metering |
| 预算 | 全局月预算 + per-user-per-day 上限 | 完整 per-tenant Stripe billing |

### 9.2 安全风险与措施

| 风险 | 措施 |
|---|---|
| Prompt 串租户 | RLS + 创建 session 时 hard-code tenant_id,memory 检索按 tenant 过滤 |
| 恶意 prompt 注入 | 用户输入永远在 user message,不进 system prompt;关键工具走 PreToolUse hook 校验 |
| 工具滥用(危险 Bash) | `permission_mode=ask` + `canUseTool` callback,危险工具走 inbox 人工确认 |
| Bash 执行不受限 | Fly machine + 每 session 独立 workspace 路径 + PreToolUse hook 路径检查 + 角色级工具权限(详见 EB-005);不依赖单一 Fly 隔离 |
| 预算耗尽 | 三层 + hook 实时查 + kill switch |
| 跨 session 数据穿透 | subagent 同租户同树 OK;subprocess 必须 explicit 传 tenant_id,不继承父的 |
| 邀请码滥用 | 邀请码一次性,绑定邀请人邮箱,7 天过期 |

### 9.3 Secret 管理

- 生产 secret 存 Doppler 或环境变量,**永远不进代码或 DB 明文**
- MCP server 的 OAuth token 加密存 DB(Supabase Vault / 自建对称加密)
- Worker 内只在调用 MCP 时解密注入,session 文件不写明文密钥
- API key 给朋友的,DB 存 hash,只在生成时显示一次

---

## 10. Stage 1 → Stage 2 迁移点

**预留检查清单**:Stage 1 实现时这些位置必须留接口,否则 Stage 2 拆不开。

- [ ] 每张业务表带 `tenant_id`,即使 Stage 1 只有 1-3 个值
- [ ] 所有 API endpoint 通过 middleware 注入 tenant 语义,**不 hardcode**
- [ ] `billing_events` 表存在并写入,只是不汇总
- [ ] Template 的 `tenant_id` 可空,留全局/私有二分
- [ ] Worker 部署:**Stage 1 强约束单 Fly machine + persistent volume**(详见 EB-006);Stage 2 才重构为 worker pool(session 文件迁 Storage 或迁 Managed Agents)
- [ ] MCP server 配置带 `tenant_id`,Stage 1 全局,Stage 2 切租户级
- [ ] Auth 用 Supabase Auth,Stage 2 直接换 social login + RBAC
- [ ] Cost 追踪从 day 1 写,精确到每次 LLM call(走 SDK hook)
- [ ] Memory schema 留 Layer 2/3 表,Stage 1 不写不读
- [ ] Notification 抽象成 driver 接口,Stage 2 加 Slack/Telegram driver 不动核心

---

## 11. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| LLM 失控烧钱 | 中 | 高 | 三层预算 + kill switch + 每日总预算告警 |
| Worker 挂掉丢 session | 中 | 中 | 状态进 DB,worker 重启从 sdk_session_path 重建(**仅限同 Fly machine + mounted volume**;跨 machine 不保证,详见 EB-006) |
| 朋友滥用 token | 低 | 中 | per-user-per-day 限额 + 邀请制 |
| RLS 漏洞跨租户泄漏 | 低 | 高 | E2E 测试 + 定期审计 query log |
| MCP server 集成错权限 | 中 | 中 | 每个 MCP 装上时 explicit confirm scope |
| Anthropic API 中断 | 低 | 高 | 状态机原生支持 retry,LiteLLM proxy 备用切其他模型 |
| 第二阶段重构成本超预期 | 中 | 高 | §10 的迁移点严格执行,避免 hardcode |
| Hobby 项目断更 | 中 | 中 | 文档化所有架构决策,Stage 1 结束写 ADR |

---

## 12. 路线图(8 周,以周为单位)

| 周 | 内容 | 关键产出 |
|---|---|---|
| W0 | **Technical spike**:验证 SDK 关键能力 + 队列方案 + RLS + SSE 链路 + Fly volume(2-3 天集中) | spike 报告,所有工程边界假设落地 |
| W1 | Schema + Auth + Template seed + 基础 UI shell(只读 template) | 能登录、能看到空 dashboard |
| W2 | Session FSM + Worker + general_assistant 跑通场景 A | 能 chat |
| W3 | Streaming + Inbox + AskUserQuestion 闭环 | 中途能干预 agent |
| W4 | research_agent + writer_agent + 父子调用 + Langfuse | subagent 跑通 |
| W5 | 后台任务(场景 B)+ 邮件通知 + Cron(场景 C) | 三种场景都能跑 |
| W6 | Memory Layer 1 + Hook 注入 + 三层预算 | 记忆 + 护栏上线 |
| W7 | 邀请朋友 + RLS 收紧 + Bug 修复 + 文档 | Beta 放给朋友 |
| W8 | Buffer / 你想加的小功能 / 性能调优 | 稳定运行 |

按 hobby 节奏(每周 10-15 小时),8 周后:**真实可用、3 人在用、数据架构能直接长成 SaaS**。

---

## 13. 待决策项(写代码前必须定)

| ID | 决策项 | 推荐方案 | 反方案 |
|---|---|---|---|
| D1 | Template 定义在哪 | DB 为主,代码做 seed | 代码硬编码,迭代快但客户化难 |
| D2 | Worker 部署 | Fly.io 单 machine 1GB Python 长进程 | Vercel Functions(超时限制) |
| D3 | Chat streaming 协议 | SSE(单向流) | WebSocket(双向但运维重) |
| D4 | 朋友登录方式 | 邀请码 + Supabase magic link | GitHub OAuth(部分朋友没 GH) |
| D5 | Cron 调度器 | Vercel Cron → `/api/cron/tick` → 写入 jobs 表 | GitHub Actions(简单但不优雅) |
| D6 | 通知渠道 | 邮件 + inbox(only) | 加 Telegram/Slack(维护成本) |
| D7 | 共享 template 策略 | tenant_id NULL = 公开,fork 才能改 | 完全私有,无共享 |
| D8 | 五个核心 template | general_assistant / research_agent / writer_agent / digest_agent / notifier_agent | 见下表 |

### 13.1 五个核心 template 设计

| Template | 用途 | 主要 tools/skills | 谁可作为 caller(edges) | 对应场景 |
|---|---|---|---|---|
| general_assistant | 通用对话,可装多个 skill | Read, Edit, WebSearch + 通用 skills | 用户 | A |
| research_agent | 网页/arXiv/文档检索 + 总结 | WebSearch, WebFetch, research skill | general_assistant, writer_agent, 用户 | A 调用 / B 主体 |
| writer_agent | 长文撰写 | Edit, writing skill,can_invoke research_agent | 用户 | B 主体 |
| digest_agent | 拉过去 N 条 session 总结成简报 | session_summaries 检索, summarize skill | cron | C 主体 |
| notifier_agent | 发邮件 / 写 inbox | Resend MCP | 任意(subprocess) | 各场景尾声 |

**调用图(DAG):**

```
general_assistant ──► research_agent ──► (no callees)
                  │
writer_agent ─────┴──► research_agent
digest_agent ─────────► (no callees)

任意 ─async──► notifier_agent (subprocess,不阻塞)
```

### 13.2 决策状态(已闭环)

> 历史草稿这一节曾列出 4 项需要拍板的事。现已全部由附录 D 默认采纳:
>
> - **D1-D7**:见 PD-001(全部按 §13 推荐方案)
> - **D8 五个 template**:见 PD-001 末行(按 §13.1 配置)
> - **W2 第一个产品里程碑**:chat 能用 general_assistant 聊天(已写入 §12 路线图 W2 行)
> - **代码语言**:见 PD-002(Python worker + TypeScript 前端)
>
> 若需要 override 任何一条,改对应 PD-XXX 并加 ADR;否则视为已生效。

---

## 附录 A:技术选型一览

| 层 | 选型 | 月度成本估 | 替换条件 |
|---|---|---|---|
| 前端 | Next.js 15 App Router (Vercel) | $0(hobby) → $20(pro) | — |
| API | Next.js Route Handlers | 含在 Vercel | 量起来切独立 API |
| Worker | Fly.io machine 1GB | $5-10 | Stage 2 重构 worker pool(详见 EB-006) |
| 任务队列 | Postgres `jobs` 表 + SKIP LOCKED | 含在 DB | 量起来换 SQS / Inngest |
| DB | Supabase Postgres | $0 free → $25 pro | — |
| 向量库 | pgvector(同 DB) | 免费 | 1M+ 向量换 Turso / Qdrant |
| Auth | Supabase Auth | 含在 DB | — |
| Secrets | Doppler | $0 free | — |
| 观测 | Langfuse Cloud | $0 free → $30 | self-host 省钱 |
| 邮件 | Resend | $0 free → $20 | — |
| LLM | Claude Opus 4.7 (API) | 按 token 计 | LiteLLM proxy 切其他 |

**Stage 1 月运维成本目标:** ≤ $30(不含 LLM token)

**两条成本路径(由 G.2 SSE 实现选择决定):**

| 路径 | 选择 | 月成本估 |
|---|---|---|
| **路径 A(默认推荐):Polling fallback** | Vercel Hobby + 1 秒轮询 session_events 表 | $0 (Vercel) + $5-10 (Fly) + 其他免费层 = **$5-15** |
| **路径 B(SSE 实时):Vercel Pro 60s SSE** | Vercel Pro + LISTEN/NOTIFY | $20 (Vercel Pro) + $5-10 (Fly) + 其他免费层 = **$25-35** |

**默认策略:** Stage 1 先走路径 A(polling fallback,延迟 0.5-1 秒可接受);Week 0 V9 验证 LISTEN/NOTIFY 通过且确实需要实时性后,再切换路径 B。这样月成本目标 ≤ $30 在路径 A 下舒适达成,路径 B 下需要个人评估 SSE 体验是否值这 $20。

**Supabase / Langfuse / Resend 临界点:**
- Supabase 免费层 500MB DB + 50000 月活用户,Stage 1 远未触及
- Langfuse 免费层 50k traces/月,1-3 用户够用
- Resend 免费层 100 邮件/天,够用
- 上述任一升级到付费层都意味着 Stage 1 已经超规模,应该评估进 Stage 2

---

## 附录 B:Agent SDK 关键能力依赖

Stage 1 用到的 SDK 特性清单:

- `query()` / `ClaudeSDKClient` — agent loop
- `ClaudeAgentOptions` — 配置容器
- 内置工具:Read, Edit, Glob, Bash, WebSearch, WebFetch, Agent, AskUserQuestion
- `mcp_servers` — MCP 集成
- `hooks` — PreToolUse / PostToolUse / SessionStart / SessionEnd
- `permission_mode` + `canUseTool` callback — 权限控制
- `max_budget_usd` — 预算原生护栏
- `setting_sources` — Skill 加载控制
- Session 持久化 + resume — 状态机基础
- Streaming input mode — 中途注入消息

**版本要求:** `claude-agent-sdk` Python ≥ 0.2.111(Opus 4.7 支持)

---

## 附录 C:术语表

| 术语 | 定义 |
|---|---|
| Template | Agent 配置蓝图(prompt + tools + skills + budget),DB 存,平铺 |
| Session | Template 的运行时实例,有自己的 context、cost、状态 |
| Subagent | 同步调用的子 session,父阻塞等结果,summary 回父 LLM context |
| Subprocess | 异步派活的新 root session,不阻塞父,通过 DB/inbox 通信 |
| Root session | session tree 的根,每次用户/cron/webhook 触发产生一个新 root |
| DAG | Template 之间"谁能调谁"的能力图,有向无环 |
| Hook | SDK 提供的拦截点,可在工具调用前后/session 起止时执行自定义逻辑 |
| MCP | Model Context Protocol,标准化的工具/数据源集成协议 |
| Skill | 文件系统形式的工作方法说明(SKILL.md),按需加载进 system prompt |
| RLS | Postgres Row-Level Security,行级权限控制 |
| FSM | Finite State Machine,session 生命周期的有限状态机 |

---

## 附录 D:开发前预设决策(Pre-Development Defaults)

> **使用方式:** 本节列出开发前所有需要澄清的问题,每条都已根据 §0.1-§0.4 表达的设计意图**预设默认答案**和推导理由。读者只需检视、否决你不同意的少数条目,其余默认通过即可启动开发。

### D.1 决策上下文回顾

从前文已经确立的设计意图中,提取以下**底层偏好**作为推导基准:

| 设计意图(已表达) | 推导出的偏好 |
|---|---|
| 自主可控,不锁死 vendor | 优先开源 / self-host / 标准协议 |
| Hobby 节奏,1 人维护 | 砍掉一切运维负担超过实际收益的选项 |
| Stage 2 必须能商业化 | 关键抽象不 hardcode,multi-tenant from Day 1 |
| 工程系统思维,精确直接 | 选成熟可调试的方案,不追新潮 |
| 已研究过 LLM 路由 / token 经济 | 不在 Stage 1 引入相关复杂度,留接口即可 |
| 已研究过 Claude Code 生态 | 主动复用 SDK 内置能力,不重复造轮子 |
| 中英文双语技术能力 | 文档与代码注释中文为主,API/标识符英文 |

后续每条预设决策都从这些底层偏好推导。

---

### D.2 P0 预设(开发启动必需,默认通过即可)

#### PD-001 决策项 D1-D8 全部按 §13 推荐方案

| ID | 推荐方案 | 推导依据 |
|---|---|---|
| D1 | Template 在 DB,代码做 seed | "Stage 2 商业化"意图 → 客户不能改你代码 |
| D2 | Fly.io 单 machine 1GB Python 长进程 | "1 人维护"+ "长任务必需" → Vercel Functions 超时不可用 |
| D3 | SSE 单向流 | "Hobby 节奏" → WebSocket 双向运维成本超过收益 |
| D4 | 邀请码 + Supabase magic link | "你 + 1-2 朋友"规模 → 邀请制最合适,GitHub OAuth 门槛过高 |
| D5 | Vercel Cron tick + jobs 表统一调度 | "自主可控" + "减少 vendor" → 不引入新调度服务,跨语言友好 |
| D6 | 邮件 + inbox(only) | "1 人维护" → 每加渠道一份维护成本 |
| D7 | tenant_id NULL 表全局,fork 才能改 | "Stage 2 演进" → 既支持现在共享,又留私有空间 |
| D8 | 五个核心 template 按 §13.1 配置 | 每个 template 对应明确的场景需求,无冗余 |

**否决条件:** 只有当读者对某项有明确反对理由时才需要 override,否则全部默认通过。

#### PD-002 代码语言:Python(Worker)+ TypeScript(前端 + API)

**推导:**
- "工程系统思维,Agent SDK 主推 Python" → Worker 用 Python 最顺
- "Hobby 节奏,前端跟 Next.js 同栈" → 前端 + API 必须 TypeScript
- 混合栈带来一次性桥接成本(API 与 Worker 之间用共享 `jobs` 表 + `session_events` 表解耦,本来就要做)
- 单语言强行统一带来的损失更大:全 Python 前端难看,全 TS 失去 Agent SDK Python 版的迭代红利

**实现:** Monorepo (pnpm workspace),`apps/web` (Next.js TS),`apps/worker` (Python),`packages/shared-types` (TS,DB schema 类型),Python 端用 `datamodel-code-generator` 从同一份 SQL 生成类型。

#### PD-003 仓库结构:Monorepo(pnpm workspace)

**推导:**
- 混合栈下 polyrepo 切换成本高,1 人项目无收益
- pnpm workspace 比 turborepo 简单,Stage 1 不需要 build cache

**结构:**
```
solo-agent-platform/
├── apps/
│   ├── web/           # Next.js 15 App Router
│   └── worker/        # Python long-running worker
├── packages/
│   ├── db/            # SQL migrations + seed
│   └── shared-types/  # 共享类型(SQL → TS + Python 生成)
├── infra/
│   ├── fly.toml       # Worker 部署配置
│   └── supabase/      # 本地开发 DB 配置
├── docs/              # ADR + 本 spec
└── pnpm-workspace.yaml
```

#### PD-004 部署形态:全云端

**推导:**
- "你 + 1-2 朋友"分布异地 → 全云端避免你笔记本永远开机
- 月成本目标 ≤ $30 → Fly + Vercel + Supabase 免费/低价位都能覆盖
- "自主可控" 通过数据导出能力实现,不必通过本地部署

**配置:**
- 前端 + API:Vercel(hobby 免费)
- Worker:Fly.io 单 machine 1GB($5-10/月)
- DB:Supabase free tier(500MB,够用)
- 域名:子域名挂在你已有的个人域名下(如 `agents.yourdomain.com`),不另购

**本地开发:** Docker Compose 起 Postgres + pgvector,worker 与 web 都本地跑,连本地 DB。生产环境用 Supabase。两套 DATABASE_URL 通过 `.env.local` / `.env.production` 切换。

#### PD-005 Anthropic API:新开 project key + 启用 prompt caching

**推导:**
- "自主可控" + "Stage 2 商业化" → 项目专用 key,与个人使用解耦,后期 metering 干净
- "已研究 token 经济" → prompt caching 是必装项,Opus 4.7 长 system prompt 重复率高

**预算上限:**
- 月度全局 budget = $200(可调)
- Per-user-per-day = $20
- Per-session max_budget_usd = $5(default,template 可 override)
- Kill switch 阈值:总月度用量到 80% 邮件警告,98% 自动暂停所有新 session

**API key 存储:** Doppler,worker 启动时拉取注入环境变量,代码中只通过 `os.environ` 读取。

#### PD-006 数据保留与删除策略

**推导:**
- "Stage 2 演进" → 必须有删除路径,后期补成本极高
- "Hobby 节奏" → 不引入复杂归档系统

**默认策略:**

| 数据类型 | 保留期 | 删除时行为 |
|---|---|---|
| 完整 conversation history(SDK session 文件) | 30 天 | 自动归档到 Supabase Storage 冷存储,90 天后删除 |
| Session metadata(DB 行) | 永久 | 仅 user 主动删除时清理 |
| Session summary(Layer 1) | 永久 | 跟随 session 删除 |
| Inbox items | answered 后 30 天 | 自动删除 |
| Billing events | 永久 | 不允许删除(审计) |
| 用户账号删除 | 30 天软删 → 硬删 | 软删期可恢复,硬删时级联删除所有关联数据 |

**实现:** Supabase pg_cron 每日跑一次清理任务,而不是 worker 实时处理。

---

### D.3 P1 预设(开发到 Week 2-3 必需,默认通过)

#### PD-007 五个核心 template 的 prompt 风格定调

**推导:**
- "中文为主沟通" → system prompt 中文撰写,但 agent 输出语言根据用户输入自动适配
- "工程系统思维" → 简洁、精确、避免 marketing 口吻
- "Stage 2 SaaS" → 不要有"我是 hobby project"等暗示

**风格统一规则:**
- 第二人称对话(你/我),不用第一人称自称("作为 X agent")
- 默认输出 markdown,适合直接展示
- 关键事实必引用来源,不引则明确说"未验证"
- 中英混合时,术语保留英文(如 "MCP server" 不译)

**五个 template 输出格式:**

| Template | 输出格式 |
|---|---|
| general_assistant | 自由 markdown,跟用户输入语言匹配 |
| research_agent | 结构化 markdown:`## 摘要 / ## 关键发现 / ## 来源` |
| writer_agent | 纯文章正文 + 末尾 `## 写作笔记` 区块 |
| digest_agent | 固定模板:本期亮点 / 趋势 / 待跟进 |
| notifier_agent | 短文本(邮件正文)+ 主题行(单独字段) |

**详细 prompt 草稿** 见单独文档 `docs/template-prompts.md`(Week 4 前完成)。

#### PD-008 MCP server 启用清单(Stage 1)

**推导:**
- "1 人维护" → 砍到 4 个,每个有明确价值
- "已研究 MCP 生态" → 选生产稳定的,避免 alpha 阶段的

**Stage 1 启用:**

| MCP | 用途 | 状态 |
|---|---|---|
| Resend | 发邮件(notifier_agent 必需) | 必装 |
| Web 浏览(Browserbase 或自建 Playwright) | research_agent 抓页面 | 必装 |
| arXiv search | research_agent 学术检索 | 必装(契合工作场景) |
| 自建 session_summaries 检索 server | Memory Layer 1 接入 | 必装(自己实现) |

**Stage 2 候选(不在 Stage 1 范围):** GitHub、Notion、Google Drive、Slack、Reddit。

#### PD-009 Skill 库初始内容

**推导:**
- "复用 Claude Code 生态" → 内置 skill 全部启用
- "工作场景明确" → 加 1-2 个针对性 skill

**Stage 1 装载:**

| Skill | 来源 |
|---|---|
| docx / pptx / xlsx / pdf | Claude Code 内置 |
| frontend-design | Claude Code 内置 |
| arxiv-paper-summary | 自写,用于 research_agent |
| robotics-edu-research | 自写,服务你副业线的调研需求 |

**Skill 加载策略:** 默认 `setting_sources=["project"]`,只读项目自带 skill,不读用户全局 skill(避免污染)。

#### PD-010 错误处理与告警

**推导:**
- "Hobby 节奏" → 不要被半夜叫起来
- "Stage 2 演进" → 告警通道抽象成 driver,Stage 2 加 PagerDuty 不动核心

**默认级别:**

| 事件 | 通道 | 频率限制 |
|---|---|---|
| 单 session 失败 | 静默写 DB,Inbox 不推 | — |
| 用户的 session 失败 | inbox 通知用户 | 即时 |
| Worker crash | 邮件告警 owner | 5 分钟去重 |
| 全局预算 80% | 邮件告警 owner | 每日最多一次 |
| 全局预算 98% | 邮件 + auto kill switch | 即时 |
| Anthropic API 5xx | 自动重试 3 次,指数退避(1s/4s/16s) | — |
| 连续 3 次 cron 失败 | disable schedule + 邮件 | — |

**Owner 邮箱** 通过 Settings 区配置,默认指向第一个注册账号。

#### PD-011 测试策略

**推导:**
- "Hobby 节奏" → 不追覆盖率
- "Stage 2 演进" → 关键路径必须可回归

**最小集:**

| 类别 | 必须 | 工具 |
|---|---|---|
| Session 状态机转换 | 100% 覆盖所有合法转换 + 非法转换拒绝 | pytest |
| RLS 跨租户 | 至少 5 个 E2E 用例,验证零泄漏 | pytest + supabase test client |
| Template DAG 环检测 | 单元测试:线性 / 自环 / 间接环 / 合法 DAG | pytest |
| Budget 三层护栏 | 单元 + integration | pytest |
| 前端 | 不写测试,手测 + Playwright smoke(P2) | — |

**目标覆盖率:** 不设硬指标,但上述 4 类必须覆盖。

---

### D.4 P2 预设(可边写边定,但已有方向)

#### PD-012 多 LLM 路由:Stage 1 不引入,留接口

**推导:**
- "已研究 LLM 路由" → 你知道这层复杂度
- "Stage 1 hobby" → 单后端最简单
- 留接口的方式:Worker 内 LLM 调用走 thin wrapper(`call_llm(messages, options)`),Stage 2 切 LiteLLM proxy 只改一处

**实现:** `worker/llm/client.py` 暴露统一接口,内部直接 import `claude-agent-sdk`。Stage 2 加分支或换 LiteLLM URL。

#### PD-013 Embedding 模型:OpenAI text-embedding-3-small

**推导:**
- "成熟可调试" → OpenAI 是 baseline
- "成本不敏感"(Stage 1 量小)
- 切换成本可控:Stage 2 想换,reindex 一次,几小时的事

**配置:**
- 维度 1536(配 pgvector)
- 调用 batch size 100
- 失败重试 3 次

#### PD-014 UI 设计:shadcn/ui + Tailwind 深色为主

**推导:**
- "不自己设计"(明确表达过)
- "Hobby 节奏" → 不在 UI 上耗时间

**栈:**
- shadcn/ui 全套组件
- Tailwind v4
- 默认深色,跟 Claude.ai 视觉对齐(降低学习成本)
- 字体:Inter (UI) + JetBrains Mono (code)
- 桌面优先,Inbox 区做 mobile 适配(因为通知触达后要随时回复)

#### PD-015 时间承诺:每周 10-12 小时

**推导:**
- 用户没明确说,但有正职 + 副业 + 这个项目 → 上限就是这个范围
- 8 周路线图按这个量做的,不调整

**风险预案:** 如果 Week 4 末发现进度落后 30% 以上,自动触发范围裁剪——砍 §13 P1 功能,只保 P0,延伸 W7-W8 做收尾而非新功能。

---

### D.5 默认通过的判断流程

**预期使用方式:**

1. 读者通读 §D.2-§D.4 共 15 条预设
2. 标出**反对的条目**(应该是少数,理由会很具体)
3. 反对项进入第二轮讨论,其他全部默认采纳
4. 第二轮收口后,这 15 条进入 ADR (Architecture Decision Records),作为正式决策固化

**不需要逐条 yes/no,只需要 no/silent。** 默认通过即接受。

---

### D.6 真正还需要读者输入的事项(无法预设)

下面 3 件事**必须读者自己决定**,无法从设计意图推导:

| 事项 | 为什么无法预设 |
|---|---|
| 域名 / 子域名具体名字 | 个人偏好,且涉及实际域名所有权 |
| Owner 邮箱 / Resend 配置邮箱 | 涉及个人邮箱选择 |
| Anthropic project 的具体命名 | 仅命名习惯问题 |

这 3 件不影响架构和代码,可以推到 Week 1 的 setup 阶段处理。

---

> **下一步:** 通读 §D.2-§D.4,标出反对项。无反对项即视为全部采纳,接着审阅附录 E 的工程边界澄清,完成后进入 Week 0 spike。

---

## 附录 E:工程边界澄清(Engineering Boundary Resolutions)

> **背景:** 附录 D 解决了"做什么"层面的预设决策,但工程实现仍有 10 个边界问题未闭环——不解决就会在 schema、worker、前后端通信上反复返工。本节逐项给出最终方案,并把验证步骤落到 Week 0 spike。

### E.1 EB-001 队列方案:放弃 pg-boss,改用 Postgres jobs 表 + SKIP LOCKED

**问题:** 原方案 `pg-boss schedule + Vercel Cron 兜底` 隐含 pg-boss(Node 库)。但 Worker 是 Python(PD-002),Python 端无法消费 pg-boss 的队列语义(它的 schema 和锁机制 Node-specific)。

**最终方案:** 不引入 pg-boss,直接用 Postgres `jobs` 表 + `FOR UPDATE SKIP LOCKED` 拉取。

**理由:**
- **跨语言友好**:Python / Node 都是裸 SQL,语义一致
- **依赖最少**:不增加额外服务
- **够用**:Stage 1 量级(每天最多几百 job)`SKIP LOCKED` 性能完全够
- **可观测**:job 表本身就是审计日志,不需要额外 dashboard

**Schema:**

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  kind TEXT NOT NULL,                  -- 'agent_session' | 'cron_tick' | 'cleanup'
  payload JSONB NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',  -- pending|running|completed|failed
  priority INT DEFAULT 100,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  worker_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_pickup ON jobs(state, scheduled_for) WHERE state = 'pending';
CREATE INDEX idx_jobs_tenant ON jobs(tenant_id, created_at DESC);
```

**拉取语义(伪 SQL):**

```sql
UPDATE jobs SET state = 'running', started_at = NOW(), worker_id = $1
WHERE id = (
  SELECT id FROM jobs
  WHERE state = 'pending' AND scheduled_for <= NOW()
  ORDER BY priority DESC, scheduled_for ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *;
```

**Cron 触发:** Vercel Cron(每分钟一次)调用 `POST /api/cron/tick`,该 endpoint 扫 schedules 表,把到期的写成 `kind=agent_session` 的 job 入队。Worker 拉取与执行同一套机制,无第二条路径。

**失败重试:** 应用层管理。Worker 失败时 `attempts += 1`,若 `< max_attempts` 则 `state = pending` + `scheduled_for = NOW() + exponential_backoff(attempts)`。

---

### E.2 EB-002 RLS Policy:JWT custom claim 方式

**问题:** 原 spec 写 `RLS policy 用 auth.uid() = tenant_id`,这在多租户语义下不成立。`auth.uid()` 对应 `users.id`,不是 `tenant_id`。

**最终方案:** **JWT custom claim** 方式——Supabase Auth Hook 在签发 JWT 时注入 `tenant_id` claim,RLS policy 直接读 claim。

**理由:**
- **零额外查询**:每个 RLS 检查不需要 join `users` 表查 tenant_id
- **可缓存**:JWT 是无状态的,policy 评估走纯函数
- **Supabase 原生支持**:有官方 Auth Hook 模板

**Auth Hook 实现(Supabase Edge Function):**

```sql
-- 在 Supabase 控制台配置 "Custom Access Token Hook"
CREATE OR REPLACE FUNCTION public.add_tenant_claim(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  user_tenant UUID;
  claims JSONB;
BEGIN
  SELECT tenant_id INTO user_tenant
  FROM users WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';
  claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant::TEXT));
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
```

**RLS policy 模板:**

```sql
-- 业务表通用模式
CREATE POLICY tenant_isolation ON agent_sessions
  USING (tenant_id::TEXT = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY tenant_isolation ON inbox_items
  USING (tenant_id::TEXT = (auth.jwt() ->> 'tenant_id'));

-- 全局 template 例外
CREATE POLICY templates_read ON agent_templates FOR SELECT
  USING (tenant_id IS NULL OR tenant_id::TEXT = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY templates_write ON agent_templates FOR ALL
  USING (tenant_id::TEXT = (auth.jwt() ->> 'tenant_id'));
```

**Worker 端:** Worker 不走 RLS(它是 service role),但**所有查询必须显式带 `WHERE tenant_id = $1`**,在代码层面通过 `db.with_tenant(tenant_id)` 这样的 wrapper 强制。Worker 代码 review 时这是硬性检查。

**E2E 测试必须覆盖:** 跨租户读 / 写 / 列表 / 聚合查询,各 1 个用例,共 5 条测试。

---

### E.3 EB-003 Claude Agent SDK 能力 spike(Week 0 必做)

**问题:** spec 假设 SDK 提供 AskUserQuestion / resume / streaming input / hooks / max_budget_usd / Agent tool / session 持久化路径等能力。这些来自文档,**未实测**。任何一个不达预期都会动到架构。

**最终方案:** Week 0 第 1-2 天写一个最小 worker 跑通以下 6 项验证,出 spike report:

| 验证项 | 验证方式 | 通过标准 |
|---|---|---|
| **V1: 创建 session + streaming events** | `query()` async iter,打印每条 event | 能拿到 `assistant`/`tool_use`/`tool_result`/`thinking` 事件流 |
| **V2: Tool permission callback** | 设 `permission_mode='ask'`,实现 `canUseTool` | 危险工具调用前回调能拦截 |
| **V3: AskUserQuestion 闭环** | 触发 AskUserQuestion,worker 落 inbox,外部回复后 resume | session 能从 awaiting_input 正确 resume,LLM 看到回答 |
| **V4: max_budget_usd 真实生效** | 设 budget=$0.01,跑一个会超的 prompt | SDK 抛 budget exceeded 异常,可捕获 |
| **V5: Subagent 调用可追踪** | 父 template 调 Agent tool,子 session 跑完 | 能拿到子的 session_id / cost / token,父 context 收到 summary |
| **V6: Session 持久化与 resume** | 跑到一半 kill,从 sdk_session_path 恢复 | 历史 conversation 完整,能继续推理 |

**输出:** `docs/spike-report.md`,记录每项实测结果 + 任何与文档不符的偏差,作为后续 schema 和 worker 实现的依据。

**Fallback 策略:** 如果某项验证失败,在 spike report 写明 workaround(例如 V4 不生效,改为 PostToolUse hook 里手动算 cost + 抛异常)。

---

### E.4 EB-004 Chat SSE 链路:Worker 写事件,Next.js 订阅转发

**问题:** Chat 实时流跨进程(Python worker → 浏览器)。三种方案需要选定:
- (a) 浏览器直连 worker SSE → 跨域、Auth、扩容都麻烦
- (b) Next.js SSE + 内存中转 → worker 和 Next.js 不在同一进程,无内存共享
- (c) Worker 写事件到 DB,Next.js SSE 订阅 → 解耦清晰,可回放

**最终方案:** **方案 c**——`session_events` 表 + Postgres `LISTEN/NOTIFY` + Next.js SSE 转发。

**理由:**
- **架构解耦**:worker 只关心写事件,UI 只关心读事件,中间介质是 DB
- **可回放**:刷新页面或断线重连,从 last_event_id 续读
- **Trace 自然**:session_events 表本身就是 trace,Langfuse 之外有本地副本
- **写性能可控**:每个 LLM token streaming 不写 DB(那太频繁),仅每个完整 event(thinking / tool_use / tool_result / final)写一行

**Schema:**

```sql
CREATE TABLE session_events (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  seq INT NOT NULL,                    -- session 内自增序号,UI 续读用
  kind TEXT NOT NULL,                  -- 'status'|'tool_use'|'tool_result'|'message_chunk'|'final'|'error'
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_session_seq ON session_events(session_id, seq);
CREATE INDEX idx_events_tenant ON session_events(tenant_id, created_at DESC);
```

**Worker 端:** 每个 event 一次 `INSERT ... RETURNING seq` + `SELECT pg_notify('session:' || session_id, seq::TEXT)`。

**Next.js SSE endpoint:** `GET /api/sessions/:id/events?since=:seq`
1. 验证 tenant 归属
2. `LISTEN session:<session_id>`
3. 先把 `since` 之后的历史 event 一次性 flush(回放)
4. 然后 NOTIFY 触发时,每次拉 seq > last 的新事件 push 给浏览器
5. session terminal 时 close

**关于 thinking 展示:** 同步采纳建议——**UI 不依赖 thinking 展示**。`session_events.kind` 不包含 `thinking`(SDK thinking event 在 worker 端记录到 trace,不写到 session_events 表)。前端展示状态用 `tool_use` / `tool_result` / `final`,加一个静态"正在分析..."占位条即可。

**载荷规范(payload schema 参考):**

```ts
type SessionEvent =
  | { kind: 'status'; status: 'started' | 'thinking' | 'tool_calling' | 'paused' }
  | { kind: 'tool_use'; tool: string; input_summary: string; tool_use_id: string }
  | { kind: 'tool_result'; tool_use_id: string; output_summary: string; cost_delta: number }
  | { kind: 'message_chunk'; text: string; chunk_seq: number }   // 可选,如果要做打字机效果
  | { kind: 'final'; summary: string; cost_total: number; tokens_total: number }
  | { kind: 'error'; reason: string; recoverable: boolean };
```

---

### E.5 EB-005 Sandbox 与权限边界

**问题:** "Fly machine sandbox + 限制工作目录"过于乐观。多 session 共享 worker 时,Bash / Read / Edit 是真实风险。

**最终方案:** 多层防御 + Stage 1 默认对朋友禁用 Bash / Edit。

**(a) Workspace 路径规则:**

每个 session 启动时,在 worker 文件系统创建 `workspace`:

```
/var/agent-workspaces/<tenant_id>/<session_id>/
```

- Worker 进程 cwd 切到此目录
- 所有 Read / Edit / Bash 工具调用通过 hook 拦截,**强制路径前缀检查**:必须以 `workspace_root` 开头,否则拒绝
- session terminal 后 24h 清理(打包到 Storage 后删除)

**(b) Bash allowlist:**

不做白名单(写不全),做**denylist + 资源限制**:

```python
BASH_DENY_PATTERNS = [
    r'\brm\s+-rf?\s+/',           # rm -rf 根目录
    r'\b(curl|wget)\s+.*\|\s*(sh|bash)',  # curl | sh
    r'\bsudo\b', r'\bsu\b',
    r'>\s*/etc/',                 # 写系统配置
    r'\b(shutdown|reboot|halt)\b',
]

# 命令长度上限 4KB,执行超时 60s,内存 512MB
```

DenyList 在 PreToolUse hook 里做正则匹配,命中即拒绝并写审计日志。

**(c) 朋友默认权限:**

| 角色 | Read | Edit | Bash | WebSearch / WebFetch | MCP servers |
|---|---|---|---|---|---|
| Owner | ✓ | ✓ | ✓ | ✓ | 全部 |
| Friend(默认) | ✓(仅自己 workspace) | ✗ | ✗ | ✓ | 受限子集(Resend / arXiv,不含 Web 浏览的写操作) |
| Friend(owner 显式开启) | ✓ | ✓ | ✓ | ✓ | 同 owner |

权限来源:`agent_templates.allowed_tools` 是模板能力上限,实际能用还要过用户角色 filter——hook 里取 `min(template_tools, user_role_tools)`。

**(d) 文件清理:**

- session terminal 24h 后:打包 workspace 到 Supabase Storage(`workspaces/<tenant>/<session>.tar.gz`),本地删除
- Storage 30 天后删除(对齐 §D.2 PD-006 数据保留)
- 清理任务由 `kind=cleanup` job 触发,每天 03:00 跑一次

---

### E.6 EB-006 SDK Session 文件:Fly Persistent Volume 强约束

**问题:** `sdk_session_path` 在 Fly machine 本地磁盘。machine 重建 / 扩容时丢失,`resume` 失效。

**最终方案:** **Stage 1 强约束:单 Fly machine + persistent volume,不做 worker 横向扩容。**

**配置:**

```toml
# fly.toml
[mounts]
  source = "agent_workspaces"
  destination = "/var/agent-workspaces"
  initial_size = "10gb"

[[vm]]
  size = "shared-cpu-1x"
  memory = "1gb"
  count = 1                       # 强制单实例

[deploy]
  strategy = "immediate"           # 部署不滚动,避免新旧 machine 并存
```

**含义:**
- Volume 跟 machine 绑定,reboot / 重部署不丢
- machine 物理迁移(Fly 极少做)时,volume 跟随
- 不能加并发——增加并发触发数据隔离问题(Stage 2 再处理)

**Stage 2 演进路径:** 改为 worker pool 时,session 文件迁移到 Supabase Storage(每个 turn 落盘 + 拉起前下载),或迁 Managed Agents 由 Anthropic 持久化。**Stage 1 不做。**

**Schema 影响:** `agent_sessions.sdk_session_path` 字段含义变为"相对 `/var/agent-workspaces/` 的相对路径",而非绝对路径。便于未来迁移。

---

### E.7 EB-007 Anthropic Key 管理:只通过环境变量,UI 不可改

**问题:** Settings 区曾允许"Anthropic API key"配置,与 PD-005(Doppler 管理)冲突。

**最终方案:** **Stage 1 owner 不能在 UI 修改 Anthropic key**。

**做法:**
- Anthropic key 仅通过 Doppler 注入 worker 环境变量
- Settings 区 "Anthropic" 一行只显示**状态**:`✓ Configured · Last verified: 2 hours ago`
- 配置变更需开发者操作(改 Doppler → redeploy)
- UI 上加文字说明:"API key 通过运维通道管理,需修改请联系管理员"

**Stage 2 演进:** BYOK 时,UI 加密存 DB(用 Supabase Vault 或 KMS),Stage 1 不做这层加密复杂度。

**Settings 区调整:** §4.6 中"Anthropic API key"改为"Anthropic 状态",其他全局设置(MCP 配置 / 月度预算 / kill switch)保持 UI 可改。

---

### E.8 EB-008 Memory 范围澄清:Layer 1 = summary + embedding search

**问题:** 文档前后矛盾——"Stage 1 只做 Layer 1 单 session summary" vs "Memory 区支持向量检索" vs "PD-013 用 OpenAI embedding"。

**最终澄清:** **Stage 1 Layer 1 包含 summary 文本 + embedding + 跨 session 语义搜索**,但**不做主题聚合(Layer 2)和 persona 提取(Layer 3)**。

**精确定义:**

| 能力 | Stage 1 | 说明 |
|---|---|---|
| 单 session 终态写 summary 文本 | ✓ | terminal hook 调一次 LLM |
| 给 summary 算 embedding 写 pgvector | ✓ | OpenAI text-embedding-3-small |
| Hook 自动注入(SessionStart 时按当前 prompt 检索) | ✓ | top-3 跨 session 历史 |
| 用户在 Memory 区手动检索历史 | ✓ | UI 简单 query 框,返回 top-10 |
| 跨 session 主题聚类生成 digest | ✗ Stage 2 | Layer 2 |
| 自动提取 persona / preference fact | ✗ Stage 2 | Layer 3 |

**澄清后术语:** 称 Stage 1 的 memory 能力为 **"Layer 1 + 检索"**(完整名:Layer 1: per-session summarization with semantic retrieval),不再笼统说"只做 Layer 1"。

**§4.5 Memory 区与 §6.5 schema 描述对齐。**

---

### E.9 EB-009 Thinking 不进产品契约

**问题:** UI 多处暗示展示 thinking content,但 thinking 是 SDK 暴露但不稳定的能力,且未来可能被关闭。

**最终方案:** **Thinking 仅作为 trace 内部记录,不进产品契约。**

**前端展示规则:**
- 不渲染 thinking 文本
- Worker 进入 thinking 阶段时,前端显示通用 status 条:`正在分析...` / `选择工具中...` / `处理结果中...`
- 状态文案来自 SDK event 的语义映射,而非 thinking 字面内容

**Trace 端:**
- Langfuse 内可记录 thinking 全文(给 owner debug 用)
- 朋友角色的 trace 视图过滤掉 thinking
- 数据保留对齐 conversation history 同周期(30 天)

**§4.1 Chat 区文案修正:** 将"streaming 显示 thinking"改为"streaming 显示状态 + tool 调用 + 最终结果"。

---

### E.10 EB-010 Template 管理 MVP 收窄

**问题:** §4.8 定义的 Template 管理(prompt / tools / skills / MCP / DAG / version / test / fork)在 W1-W2 完成不现实,会拖慢主线。

**最终方案:** **Template 管理 Stage 1 分两阶段交付**。

**Stage 1a(W1-W6,主线):**
- DB seed 5 个核心 template,通过 SQL migration 写入
- DAG / tools / MCP / skills 全部通过 seed 文件配置,UI 不可改
- UI 仅提供:**列表查看 + 详情查看(只读)**
- Owner 可改的字段:`system_prompt` 文本 + `max_budget_usd` 数字 + `max_session_hours` 数字
- 改动直接 +revision 入库,在跑的 session 锁定旧 revision

**Stage 1b(W7-W8 或 Stage 2,看时间):**
- DAG 编辑(增删 invocation edges,带环检测)
- Tools / MCP / Skills 装载 UI
- 测试入口(临时 session 验证)
- Fork 机制

**§4.8 调整:** 标记每条功能"1a / 1b",防止 W1 误以为全要做。

**Seed 文件位置:** `packages/db/seeds/templates/*.yaml`,每个 template 一个文件,migration 脚本读取后插入。修改 prompt 改 yaml 后重跑 migration(检测哈希变化才 +revision)。

---

### E.11 Week 0 Spike 详细任务清单

合并 EB-001 / 002 / 003 / 004 / 006 的验证需求,Week 0(2-3 天)输出物:

| 天 | 任务 | 输出 |
|---|---|---|
| Day 1 | 环境搭建:monorepo 骨架 + Docker Compose Postgres + Supabase 本地 + Fly account | 能 `pnpm dev` 启动 |
| Day 1 | E.3 V1-V2:SDK streaming + tool permission | spike-report 第 1 节 |
| Day 2 | E.3 V3-V6:AskUserQuestion / budget / subagent / resume | spike-report 第 2 节 |
| Day 2 | E.1 jobs 表 + SKIP LOCKED Python worker 拉取 demo | jobs 表跑通 |
| Day 3 | E.2 RLS JWT claim 验证 + E2E 跨租户测试 | RLS 不漏 |
| Day 3 | E.4 session_events + LISTEN/NOTIFY + Next.js SSE demo | 浏览器能看到 worker 推送的事件流 |
| Day 3 | E.6 Fly volume 部署一次,验证 reboot 后文件不丢 | spike-report 第 3 节 |

**通过标准:** 全部 ✓ 或失败项已写明 workaround,然后才进 W1。

**风险口袋:** 如果 spike 发现 SDK 某能力不达预期(例如 V4 budget 不生效),W1 第一件事是改 schema 加补偿字段,而不是硬上。

---

### E.12 边界澄清完成度核对

| EB | 题目 | 状态 |
|---|---|---|
| EB-001 | Queue: pg-boss vs jobs 表 | ✓ jobs 表 + SKIP LOCKED |
| EB-002 | RLS policy 写法 | ✓ JWT custom claim |
| EB-003 | SDK 能力实测 | ✓ Week 0 spike,6 项验证 |
| EB-004 | Chat SSE 链路 | ✓ session_events + LISTEN/NOTIFY |
| EB-005 | Sandbox 与权限 | ✓ 多层防御 + 朋友默认禁 Bash/Edit |
| EB-006 | SDK session 文件持久化 | ✓ Fly volume + 单实例约束 |
| EB-007 | Anthropic key 存储 | ✓ Doppler only,UI 不可改 |
| EB-008 | Memory Layer 1 范围 | ✓ summary + embedding + 检索 |
| EB-009 | Thinking 展示策略 | ✓ 不进产品契约,仅 trace 用 |
| EB-010 | Template 管理 MVP 收窄 | ✓ 1a 只读 + prompt/budget,1b 后置 |

10 项全部闭环,可进 Week 0 spike。

---

## 附录 F:配置与状态的来源唯一性(Single Source of Truth)

> **背景:** 第二轮审查指出一类共性问题——**生成文件被手动编辑、硬编码版本号、双 memory 系统、未定义占位词、子代理身份传递**。这些问题表面各异,本质都是 SoT(Single Source of Truth)未明确,导致同一信息在多处存在并漂移。
>
> 本附录把这类风险一次性梳理清楚,并给出本项目对应的明确规则。

### F.1 SoT 风险盘点

reviewer 指出的 5 个具体问题,在本项目的对应风险点:

| Reviewer 关切 | 对应到本项目的风险 | 章节 |
|---|---|---|
| 1. 生成文件被手动编辑 | 模板 prompt 同时存在于 seed YAML 和 DB,可能被两边改动 | F.2 |
| 2. 硬编码版本号 vs LATEST 指针 | Template revision 锁定逻辑可能与运行时实际加载不一致 | F.3 |
| 3. 两套 memory 冲突 | SDK 的内置 conversation history 与本项目的 session_summaries 表是两个系统 | F.4 |
| 4. 未定义占位词("CreateStoryExplanation") | spec 中可能引入未定义术语或外部依赖 | F.5 |
| 5. 子代理如何知道自己是子代理 | 父子身份传递机制未在 spec 中明确 | F.6 |

下面逐项给出本项目的处理规则。

---

### F.2 模板 Prompt 的 SoT:Seed 文件 → DB(单向)

**对应风险:** EB-010 已规定 template 由 seed YAML 写入 DB。但若开发者直接改 DB,seed 与 DB 内容漂移;若手改 seed 后忘记 migration,DB 仍是旧值。

**规则:**

1. **Seed YAML 是 owner-编辑的源头**(`packages/db/seeds/templates/*.yaml`)
2. **DB 是运行时唯一真相**——worker 永远从 DB 读,不读文件系统
3. **同步机制:** migration 脚本检测 yaml 内容哈希,变化才 +revision 入库;否则 no-op
4. **UI 编辑(prompt / budget / max_session_hours)只写 DB,不回写 yaml**——视作 hot-fix,后续 owner 决定是否反向同步到 yaml
5. **冲突解决:** 若 yaml 与 DB 发生分叉(yaml 改了 prompt,DB 也改了 prompt),migration 拒绝执行,要求 owner 手动 reconcile

**警告标记:** 每个 seed yaml 顶部注释:

```yaml
# ────────────────────────────────────────────
# THIS FILE IS THE EDIT-TIME SOURCE OF TRUTH
# Runtime reads from DB. Migration syncs yaml → DB on hash change.
# UI hot-fixes are NOT auto-synced back to this file.
# Last reconciled: 2026-XX-XX
# ────────────────────────────────────────────
```

**对应 reviewer #1 风险:** 不存在"生成文件被手动改"问题,因为 seed yaml 不是生成文件,是源文件;DB 也不是生成的副本,是独立的运行时存储。两者通过 migration 单向同步,方向明确。

---

### F.3 Template 版本绑定:Session 锁定 revision,运行时不读 LATEST

**对应风险:** Session 跑了一半,owner 编辑 template +revision,session 是用旧版还是新版?若 worker 运行时去查"LATEST revision",行为会随编辑漂移。

**规则:**

1. **Session 创建时硬编码 `(template_id, template_revision)` 到 `agent_sessions` 表**——这两列联合主键引用 `agent_templates`
2. **Worker 加载 template 永远用 `WHERE id=$1 AND revision=$2`**,不读"LATEST"
3. **没有"LATEST 指针"概念**——每个 revision 是独立行,不存在隐式默认
4. **新 session 创建时,从 `agent_templates` 取 `MAX(revision) WHERE id=$1 AND archived_at IS NULL`**——这是唯一一处隐含"latest",且只在创建瞬间执行,之后立即固化

**为什么不引入 LATEST 指针:**
- 多一个需要维护的指针,多一种可能不一致的状态
- 查询 `MAX(revision)` 在 5-10 个 template、几百个 revision 量级下毫无性能问题
- 简化 schema:`agent_templates` 没有 `is_latest` 字段,纯函数式

**Schema 强化:**

```sql
ALTER TABLE agent_sessions
  ADD CONSTRAINT fk_template_revision
  FOREIGN KEY (template_id, template_revision)
  REFERENCES agent_templates(id, revision);
```

外键保证 session 引用的 template+revision 必然存在,archived 也仍可读,只是不能创建新 session。

**对应 reviewer #2 风险:** 不存在"硬编码版本号 vs LATEST 不同步"——根本没有 LATEST,session 的版本绑定是数据库 FK 强制的。

---

### F.4 Memory 系统的 SoT:SDK conversation 与 session_summaries 严格分层

**对应风险:** 这是最容易踩的坑,reviewer #3 直接命中。本项目同样有两个独立的"memory":

| 系统 | 内容 | 持久化位置 | 谁读 |
|---|---|---|---|
| SDK 内置 conversation history | 完整 message array(user/assistant/tool_use/tool_result) | Fly volume `/var/agent-workspaces/<tenant>/<session>/` | 同一个 session 的 LLM 推理 + resume |
| 项目 `session_summaries` 表 | 200-500 字 LLM 生成摘要 + embedding | Postgres pgvector | 跨 session 检索,SessionStart hook 注入新 session 的 system prompt |

**规则:**

1. **两者写入路径完全独立**,绝不互相覆盖
2. **写入顺序固定:**
   - Session 运行中:SDK 自己管 conversation history
   - Session 终态时:terminal hook 调一次 LLM,用 conversation history 生成 summary,写 `session_summaries`
3. **读取方向单向:**
   - 同一个 session 内推理 → 读 SDK conversation(LLM context window)
   - 新 session 启动 → 读 `session_summaries`(检索后注入 system prompt)
   - **不存在**"新 session 直接读旧 session 的 conversation history"路径
4. **删除时同步:**
   - Conversation history 30 天后归档到 Storage,90 天后删除
   - Summary 永久保留(直到 session row 被删)
   - 用户硬删除账号时,两边级联删除

**冲突场景与规避:**

| 场景 | 风险 | 规避 |
|---|---|---|
| Hook 注入的 summary 与 SDK conversation 内容矛盾 | LLM 困惑 | 注入位置固定在 system prompt,不与 user/assistant message 混合 |
| 同一信息在两处都写入 | 浪费 + 不一致 | summary 是浓缩版,conversation 是原始版,不重叠 |
| Resume 时只有 conversation 没有 summary | 正常 | resume = 同 session 继续,本来就不该读 summary |

**对应 reviewer #3 风险:** 两套系统职责正交,不重叠,不冲突。读写规则在 spec 中明示。

---

### F.5 术语与外部依赖审计:本 spec 无未定义占位词

**对应风险:** reviewer #4 指 "CreateStoryExplanation" 是上下文缺失的占位词。本项目 spec 应避免类似问题。

**规则:**

1. **附录 C 是术语权威表**——任何 spec 内出现的概念,首次出现处必须在附录 C 有定义,或当场内联定义
2. **外部依赖必须明确版本与 URL:** 不写"用 SDK"这种泛指,写 `claude-agent-sdk Python ≥ 0.2.111`
3. **占位词审查:** spec 完成后通读一遍,任何形如"待定"、"参见 X 文档"(X 不存在)、未介绍的工具名,都要消除

**当前 spec 已通过的审计:**

| 出现术语 | 定义位置 |
|---|---|
| Template / Session / Subagent / Subprocess | §2 + 附录 C |
| DAG / FSM / RLS / Hook / MCP / Skill | 附录 C |
| AskUserQuestion / max_budget_usd / Agent tool | 附录 B |
| LISTEN/NOTIFY / SKIP LOCKED | 附录 E.4 / E.1(SQL 标准特性,且代码示例自解释) |
| 各 PD-XXX / EB-XXX / DL-XXX | 附录 D / E / §0.5 |

**已知遗留:** 无。如发现新术语漂移,立即补附录 C。

**对应 reviewer #4 风险:** 本 spec 内不存在"CreateStoryExplanation"类占位词。所有术语可溯源。

---

### F.6 子代理身份传递:三种机制叠加,不依赖单一信号

**对应风险:** reviewer #5 直击要害——"子代理怎么知道自己是子代理"。如果只靠"在 system prompt 里写'你是 subagent'",这是 prompt 层信号,不可靠。

**本项目机制:** 子代理身份通过**三个独立机制**叠加传递,任一机制失效不影响功能。

**机制 1:Schema 显式标记(运行时唯一真相)**

`agent_sessions.parent_session_id IS NOT NULL` 即定义为子代理。Worker 拉取 job 时通过这一列判断,不依赖任何文本暗示。

**机制 2:System prompt 注入(供 LLM 自我意识)**

子 session 启动时,SessionStart hook 在 system prompt 末尾追加:

```
---
## Execution Context
- This session is a subagent invoked by parent session [<parent_id>].
- Parent template: [<parent_template_name>]
- Your output (final summary) will return to the parent's context.
- Keep summary under 2000 tokens; verbose intermediate work stays in your context only.
```

这段是给 LLM 看的,影响行为但**不是身份判定的源头**。父 session 不会有这段。

**机制 3:Tool 配置差异**

子代理 template 的 `allowed_tools` 通常**不包含** `Agent`(防止深度递归);父 template 才有 `Agent` 工具可用。这从工具能力层面区分了角色。例外是允许嵌套的场景(深度 ≤ 5,在 hook 里强制),由 `depth` 字段控制。

**三机制对照:**

| 机制 | 数据位置 | 失效后果 |
|---|---|---|
| 1. parent_session_id | DB 列 | Worker 行为错乱(应优先保证) |
| 2. System prompt 注入 | Hook 生成 | LLM 不知道自己是子,可能输出过长(影响质量,不致命) |
| 3. allowed_tools 差异 | template 配置 | 可能递归过深(由 depth 上限兜底) |

**Worker 路由逻辑(伪代码):**

```python
async def route_session(session: AgentSession):
    is_subagent = session.parent_session_id is not None      # 机制 1,真相
    template = load_template(session.template_id, session.template_revision)
    
    # 机制 2:hook 注入身份说明
    if is_subagent:
        parent = await load_session(session.parent_session_id)
        options.system_prompt += render_subagent_context(parent)
    
    # 机制 3:工具集已经在 template 里配好,这里不再处理
    options.allowed_tools = template.allowed_tools
    options.permission_mode = template.permission_mode
    
    # depth 强制上限(独立保险)
    if session.depth > MAX_DEPTH:
        raise DepthLimitExceeded(...)
```

**对应 reviewer #5 风险:** 子代理身份**不依赖** system prompt 文本传递。Schema 是源头,prompt 注入只是 LLM 行为引导,工具集是能力边界。三机制独立,一致性由代码强制(单一 worker 路由函数)。

---

### F.7 SoT 通用原则(沉淀)

从本附录的 5 个具体问题中提炼出的通用规则,后续新增功能必须遵守:

1. **每个状态/配置只能有一个写入入口**;若需多入口,必须有明确的同步方向(如 yaml → DB,单向)
2. **运行时永远从 SoT 读**,不读副本、缓存、生成文件
3. **隐式默认("LATEST" / "current" / "default")用查询函数表达**,不用持久化指针
4. **跨系统的同名概念**(两个 memory、两套 history)必须在 spec 中显式区分职责,职责正交
5. **任何身份/权限/角色判定**用 schema 列做源头,prompt 文本只做引导,不做判定
6. **新增术语必须进附录 C**,新增外部依赖必须带版本号

---

### F.8 完成度核对

| FB | 题目 | 状态 |
|---|---|---|
| FB-001 | 模板 Prompt 编辑路径 SoT | ✓ Seed YAML → DB 单向同步,UI 编辑不回写 |
| FB-002 | Template 版本绑定 | ✓ FK 强制,无 LATEST 指针 |
| FB-003 | 两套 Memory 职责区分 | ✓ SDK conversation vs session_summaries 正交 |
| FB-004 | 术语审计 | ✓ 附录 C 权威,无占位词 |
| FB-005 | 子代理身份传递 | ✓ Schema + prompt + tools 三机制叠加 |

---

### F.9 与附录 D / E 的关系

- **附录 D**:**做什么** — 产品/技术选型层面的预设决策
- **附录 E**:**怎么做** — 工程边界与实现路径
- **附录 F**:**信息从哪来** — 配置与状态的来源唯一性

三者正交,共同构成"开发前完整闭环"。完成 D + E + F + G 审阅后,方可进入 Week 0 spike 与 W1 实现。

---

## 附录 G:开发层剩余问题(Implementation Open Items)

> **背景:** 经过附录 D / E / F 三轮收口后,产品决策、工程边界、信息来源均已闭环。仍有 3 个问题属于"实现层细节,不影响架构,但 Week 0 必须验证或决策",独立成节避免被淹没在前面 30 多条决策中。

### G.1 IO-001 Supabase Auth Hook + Signup Bootstrap

**问题:** EB-002 规定 RLS 用 JWT custom claim,Supabase Auth Hook 注入 `tenant_id`。但**新用户第一次 magic link 登录时**,`users` 表里还没有 row,hook 查不到 `tenant_id`,JWT 没有 claim,所有 RLS 都拒绝——形成死锁。

**最终方案:** 显式定义 signup bootstrap 流程,落地为一段后端代码 + 一个 Auth Hook 容错分支。

**完整登录路径(分两类):**

**类型 A:首次登录(用户创建)**

```
1. 朋友点击邀请链接 /invite/{code}
   ↓
2. 输入邮箱 → 发 magic link
   ↓
3. 点 link → Supabase Auth 创建 auth.users row,签发临时 JWT(无 tenant claim)
   ↓
4. 前端跳转到 /api/auth/bootstrap
   ↓
5. Bootstrap endpoint(server-side,用 service role):
     - 验证邀请码合法且未过期
     - 创建 tenants row(name = 邮箱前缀 + 时间戳)
     - 创建 users row(tenant_id 关联)
       - tenant 内角色:`role = 'owner'`(每个用户在自己 tenant 内总是 owner)
       - 平台级角色:`platform_role` 从邀请码继承(`admin` 或 `friend`)
     - 标记邀请码为 consumed
     - 调用 supabase.auth.refreshSession() 触发新 JWT 签发
   ↓
6. Auth Hook 重新执行,这次 users row 存在,正常注入 tenant_id claim
   ↓
7. 前端拿到带 claim 的 JWT,跳转到 dashboard
```

**类型 B:已有用户登录** — Auth Hook 直接查到 tenant_id,正常注入。

**Invite code 传递机制(httpOnly cookie):**

Magic link 流程中 invite code 必须从 `/invite/{code}` 页面安全传到 bootstrap endpoint。**用 httpOnly cookie**,不放 URL query。

```
1. /invite/{code} 页面加载时
   ├─► 校验 code 合法(未过期/未使用)
   ├─► Set-Cookie: pending_invite=<code>; HttpOnly; Secure; SameSite=Lax; Max-Age=900
   └─► 渲染输入邮箱表单

2. 用户输入邮箱 → 发 magic link
   (此时 cookie 已在浏览器,magic link 跳转回来时仍带这个 cookie)

3. Magic link 跳转到 /api/auth/bootstrap
   ├─► 从 httpOnly cookie 读 pending_invite code
   ├─► 校验 code 仍然合法
   ├─► 创建 tenant + users(继承 invitation.platform_role)
   ├─► 标记 invitation.consumed_at = NOW()
   ├─► Set-Cookie: pending_invite=; Max-Age=0(清除)
   └─► refreshSession() + 跳转 dashboard
```

**为什么不用 URL query 传 code:**
- URL 会留在浏览器历史和 server access log
- Magic link 跳回的 redirect URL 是 Supabase 控制的,不能轻易插自定义参数
- httpOnly cookie 不受 JS 访问,更安全

**为什么不用 server-side `pending_signups` 表:**
- 多一张表 + 多一次清理任务
- 对 1 人公司过度设计,cookie 方案 15 分钟 TTL 自然过期

**Auth Hook 容错分支:**

```sql
CREATE OR REPLACE FUNCTION public.add_tenant_claim(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  user_tenant UUID;
  claims JSONB;
BEGIN
  SELECT tenant_id INTO user_tenant
  FROM users WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';

  IF user_tenant IS NULL THEN
    -- 首次登录,users row 还不存在
    -- 注入特殊 claim 标记 needs_bootstrap,前端据此跳到 bootstrap 页
    claims := jsonb_set(claims, '{needs_bootstrap}', 'true'::jsonb);
  ELSE
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant::TEXT));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
```

**RLS 默认拒绝行为:** `tenant_id` claim 缺失时,所有业务表查询返回零行(不抛错),这是 RLS 的安全默认。bootstrap 阶段前端只能访问 `/api/auth/bootstrap`(走 service role,绕过 RLS),其他都 403。

**邀请码 schema:**

```sql
CREATE TABLE invitations (
  code TEXT PRIMARY KEY,                  -- 32 字节随机串
  invited_by_user_id UUID NOT NULL,
  invitee_email TEXT,                     -- 可选:绑定邮箱
  platform_role TEXT NOT NULL DEFAULT 'friend',  -- 'admin' or 'friend',决定被邀请者的平台级角色
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  consumed_at TIMESTAMPTZ,
  consumed_by_user_id UUID
);
```

**Owner 启动:** 系统首次部署时,通过 SQL migration 创建第一个 tenant + owner user(用 ENV `INITIAL_OWNER_EMAIL`),第一次登录跳过 bootstrap。

**Week 0 必须验证:**
- V7: Magic link 登录 + bootstrap 流程跑通,新用户 30 秒内能进 dashboard
- V8: bootstrap 异常路径(邀请码已过期 / 已使用 / 无效)正确返回错误,不创建 user row

---

### G.2 IO-002 LISTEN/NOTIFY 在 Vercel Serverless 上的可行性

**问题:** EB-004 定的 SSE 链路是"Worker 写 session_events,Postgres NOTIFY,Next.js SSE 订阅"。但 Next.js 在 Vercel 是 serverless,长连接(SSE 持续 + Postgres LISTEN 持续)受**多重限制**:

| 限制 | Vercel 默认值 | 影响 |
|---|---|---|
| Edge function 执行时长 | 25 秒 | SSE 撑不住一次 LLM 调用 |
| Hobby plan serverless function | 10 秒 | 直接不可用 |
| Pro plan serverless function | 60 秒 | 可用但需要重连 |
| 单租户并发连接 | 1000(理论)/几十(实际) | 朋友规模够用 |
| Postgres 连接池 | 每个 Vercel 实例独立 | LISTEN 跨实例不共享 |

**最终方案:** 默认走 Polling(免 Vercel Pro);Week 0 V9 验证 LISTEN/NOTIFY 通过且确认值得 $20/月升级时,再切 SSE。

**默认方案:Polling fallback(Vercel Hobby)**

```
浏览器 EventSource ──► Next.js SSE endpoint
                       ├─► 立即响应当前 events(since=last_seq)
                       ├─► 每 1 秒查 SELECT * FROM session_events WHERE seq > last_seq
                       ├─► 有新事件 push,无则保持连接
                       └─► Hobby 函数 10s timeout 前主动 close,客户端自动重连
```

**优点:** 不依赖 LISTEN/NOTIFY,实现简单,无连接池问题,Vercel Hobby 免费层够用
**缺点:** 延迟 0.5-1 秒,DB 多一次 scan(`idx_events_session_seq` 索引下成本可忽略)

**可选方案:Vercel Pro + 60 秒 SSE + LISTEN/NOTIFY**

```
浏览器 EventSource ──► Next.js SSE endpoint(Pro,60s)
                       ├─► open Postgres connection
                       ├─► LISTEN session:<id>
                       ├─► 推送累积 events(since=last_seq)
                       ├─► 等 NOTIFY,推送增量
                       ├─► 55s 时主动 close,响应头带 last_seq
                       └─► 浏览器 onerror 自动重连 ?since=last_seq
```

**优点:** 实时性 < 100ms,体验最好
**触发切换的条件:** 同时满足以下两条
1. W0 V9 验证 LISTEN/NOTIFY 在 Vercel Pro 下稳定(5 并发 60 秒)
2. 个人评估 SSE 实时性的体验提升值 $20/月

**Week 0 验证标准(V9):**

| 验证项 | 通过条件 |
|---|---|
| Polling 默认方案 60 秒稳定 | ✓ 必须 |
| LISTEN/NOTIFY 在 Vercel Pro 下 5 并发 60 秒稳定 | 可选,作为后期切换决策依据 |
| Polling 与 LISTEN/NOTIFY 的 since 续读语义一致 | ✓(代码层面验证两套都正确) |

**实现层面预留接口:** 前端 EventSource 的 URL 不变,后端 endpoint 内部分支:`if (use_listen_notify) { ... } else { polling }`,环境变量切换。两套代码都写,这部分代码量加起来大约 100 行。

**Stage 2 演进:** 如果朋友规模扩展或 Pro plan 限制成为瓶颈,把 SSE endpoint 从 Vercel 抽出来,放到 Fly.io 同 worker 旁边的 Node sidecar(无超时),Vercel 只做静态前端。

---

### G.3 IO-003 SDK Spike 是开工硬门槛

**问题:** EB-003 已经定义了 6 项 SDK 验证,但 reviewer 强调三项**直接影响 schema 与 FSM**,不通过则后续设计要重做:

- **AskUserQuestion + resume**:决定 `awaiting_input` 状态机能否成立
- **Subagent tracing**:决定 `parent_session_id` 与 cost 归因模型是否可行
- **Budget usage**:决定三层预算护栏的实现机制(SDK 原生 vs hook 自实现)

**最终立场:** **W0 不通过,不进 W1**。这是硬门槛,不允许并行启动 schema 设计或 UI 开发。

**强化的验证标准(在 EB-003 基础上加严):**

| 验证项 | EB-003 标准 | G.3 加严标准 |
|---|---|---|
| V3: AskUserQuestion 闭环 | session 能 resume,LLM 看到回答 | + resume 后 cost 累加正确,前后两段视为同一 session;+ 24h 不答自动 cancel 后再 resume 应被拒绝 |
| V4: max_budget_usd 真实生效 | SDK 抛 budget exceeded 异常 | + 异常类型可识别(不只是泛 Exception);+ 当前 cumulative cost 在异常 payload 中可读;+ 若 SDK 不支持,确认 PostToolUse hook 中能拿到本次 token usage |
| V5: Subagent 调用可追踪 | 父 context 收到 summary | + 子 session 在 SDK 内部有独立 ID,可注入到 hook 上下文中以镜像到 DB;+ 子的 cost / tokens 在父的 hook 视野中可拆分 |

**Spike Report 必须回答的具体问题:**

1. SDK 暴露的 session ID 是字符串还是其他类型?如何在 hook 中拿到当前 session 的标识?
2. AskUserQuestion 触发时,SDK 是同步抛异常还是异步事件?worker 应该用什么方式监听?
3. resume 时传入的状态是 session ID 还是文件路径?Fly volume 路径变化(挂载点不变但相对路径变)是否影响?
4. subagent 调用是新进程、新 session、还是同一 session 内的特殊 message?cost 如何在 SDK 层拆分?
5. budget 超限时 SDK 行为:抛异常?返回特殊 event?静默截断?三种处理逻辑都不一样。
6. tool permission callback 是 sync 还是 async?能否在 callback 内做 DB 查询(查 inbox 已批准记录)?

**Spike Report 模板:** `docs/spike-report.md`,每个验证项一节,结构:
- 测试代码片段(< 30 行,贴在文档中)
- 实测输出(关键 event/log)
- 与文档预期的差异
- 对架构的影响(无 / 小调整 / 重大重做)

**不通过的处理路径:**

| 不通过项 | 影响范围 | 处理 |
|---|---|---|
| V3 AskUserQuestion | 状态机 awaiting_input 设计 | 改用 worker 内主动检测 + 自定义事件,不依赖 SDK 原生 |
| V4 budget | 三层预算护栏 | 改在 PostToolUse hook 自实现,记录 usage 后比较累计值 |
| V5 subagent | 父子调用模型 | 退化为只支持单层(父+子),禁止子再调子;trace 用 SDK 之外的方式构建 |

每条 fallback 都会让代码复杂度上升 10-20%,但**架构本身不动**——这是把 SDK 不确定性隔离在执行平面内的好处。

---

### G.4 文档一致性清理日志(Cleanup PR Log)

记录本轮(Reviewer Round 3)清理的所有正文修订点,作为变更追溯:

| ID | 修订位置 | 修订前 | 修订后 |
|---|---|---|---|
| CL-01 | DL-007 | pg-boss(Postgres queue) | Postgres `jobs` 表 + `FOR UPDATE SKIP LOCKED` |
| CL-02 | §5.0 架构图 | pg-boss queue | pg jobs table |
| CL-03 | §5.2 Job Queue | pg-boss | jobs 表 + SKIP LOCKED |
| CL-04 | §8.1 流图 | pg-boss queue | jobs table (SKIP LOCKED) |
| CL-05 | §8.2 Cron 调度 | pg-boss schedule 在 worker 跑 | Vercel Cron tick → 写 jobs 表 |
| CL-06 | D5 推荐方案 | pg-boss schedule + Vercel Cron 兜底 | Vercel Cron tick + jobs 表统一调度 |
| CL-07 | 附录 A 任务队列 | pg-boss (in Postgres) | Postgres `jobs` 表 + SKIP LOCKED |
| CL-08 | PD-001 D5 | pg-boss schedule + Vercel Cron 兜底 | Vercel Cron tick + jobs 表统一调度 |
| CL-09 | PD-002 桥接说明 | API 与 Worker 之间用 pg-boss 解耦 | API 与 Worker 之间用共享 jobs/session_events 表解耦 |
| CL-10 | §9.1 数据库 RLS | auth.uid() = tenant_id 简单匹配 | JWT custom claim + auth.jwt() ->> 'tenant_id' |
| CL-11 | §3.1 场景 A | 流式响应(thinking + tool_use + final) | 流式响应(状态 + tool_use/tool_result + final summary) |
| CL-12 | §4.1 Chat 单视图 | streaming 显示 thinking / tool_use / final | streaming 显示状态 + tool_use/tool_result + final |
| CL-13 | §4.6 全局设置 | Anthropic API key | Anthropic 配置状态(只读,详见 EB-007) |
| CL-14 | §9.1 密钥行 | 你的 Anthropic key 全局共享 | Anthropic key 通过 Doppler/env,UI 不可改 |
| CL-15 | §0.4.2 Memory 行 | Stage 1 仅 Layer 1 | Stage 1 = Layer 1 + 检索(per-session summary + embedding + 跨 session 检索) |
| CL-16 | DL-010 | Memory Layer 1 only | Memory = "Layer 1 + 检索" |
| CL-17 | §2.4 末段 | Stage 1 只做 B 类的 Layer 1 | Stage 1 对 B 类做完整的"Layer 1 + 检索" |
| CL-18 | §10 worker 池预留 | Worker 池大小可配置,起步 1 | Stage 1 强约束单 Fly machine + volume |
| CL-19 | §0.4.2 worker 自愈 | worker 挂掉重启可从 sdk_session_path 恢复 | 同 machine + mounted volume 下可恢复;跨 machine 不保证 |
| CL-20 | §3.2 暴露需求 | worker 池 | worker 长任务持久化(单 machine + volume) |
| CL-21 | §6 schema 承诺 | "完整 SQL schema 见附录"(无对应附录) | 明确 schema 散布在 §6 / E.1 / E.2 / E.4 / G.1,W0 汇总为 0001_init.sql |
| CL-22 | §6.2 agent_templates | 同时存在 invokable_by 字段 + edges 表 | 删除 invokable_by 字段,edges 表为唯一权威;另开 template_role_permissions 表(W1 按需) |
| CL-23 | §13.1 template 表 | invokable_by 列 | 改名"谁可作为 caller(edges)" |
| CL-24 | §6.3 cost 字段说明 | "实时累加,terminal 时归并到 root" | 明确分两层:本 session 实时 + root 终态聚合 |
| CL-25 | §7.3 cost 归因规则 | 仅描述"不逐层冒泡" | 补全运行中 cost 来源 + dashboard 查询规则 |
| CL-26 | 附录 A Worker 替换 | "量起来加并发" | "Stage 2 重构 worker pool" |
| CL-27 | §11 Worker 自愈风险 | 未限定 machine 范围 | 明确仅同 machine + volume 下 |
| CL-28 | §9.2 Bash 沙箱 | "Fly machine sandbox" | 明确多层:workspace + PreToolUse + 角色权限 |
| CL-29 | §13.2 还需拍板 | 4 项待答 | 改为已闭环说明,指向 PD-XXX |
| CL-30 | 附录 A 月成本目标 | 单一 $30 数字 | 拆两条路径:Polling $5-15 / SSE Pro $25-35 |
| CL-31 | G.2 SSE 优先级 | 主方案 SSE,fallback polling | 反转:默认 polling,SSE 可选 |
| CL-32 | §6.1 users 表 role | 单一 role 字段 | 拆 role(tenant 内)+ platform_role(平台级) |
| CL-33 | G.1 invitations role | role 字段 | 改名 platform_role,语义清晰 |
| CL-34 | G.1 invite code 传递 | 流程未指定 | 增 httpOnly cookie 机制 + 拒绝替代方案理由 |

**汇总产出(W0 必交付物):**

W0 spike 期间还需要把分散在多处的 schema 合并为单一 migration 文件:

- 路径:`packages/db/migrations/0001_init.sql`
- 内容:汇总 §6 各表字段 + 附录 E.1/E.2/E.4/G.1 的 DDL
- 包含:tenants / users / agent_templates / template_invocation_edges / agent_sessions / inbox_items / session_summaries / topic_digests / persona_facts / schedules / billing_events / jobs / session_events / invitations + 全部 RLS policies + Auth Hook function
- 验收:能在干净 Postgres 上 `psql -f 0001_init.sql` 一次成功,无错误

**清理后状态:** 正文与附录 E/F 全部对齐,无残留漂移。

---

### G.5 完成度核对

| ID | 题目 | 状态 |
|---|---|---|
| IO-001 | Signup bootstrap 流程 | ✓ Bootstrap endpoint + Hook 容错分支 + 邀请码 schema,W0 加 V7/V8 |
| IO-002 | LISTEN/NOTIFY 可行性 | ✓ 主方案 + Fallback,W0 加 V9 决策 |
| IO-003 | SDK spike 硬门槛 | ✓ EB-003 加严,出 spike-report,不通过不进 W1 |
| 正文一致性清理 | 7 项残留 | ✓ 20 条修订(CL-01 至 CL-20),正文与附录对齐 |

---

### G.6 Week 0 Spike 最终任务清单(汇总版)

合并 EB-003 + IO-001 + IO-002 后的完整 W0 验证矩阵:

| 编号 | 验证项 | 来源 | 通过标准 |
|---|---|---|---|
| V1 | SDK 创建 session + streaming events | EB-003 | 拿到 assistant/tool_use/tool_result 事件流 |
| V2 | Tool permission callback | EB-003 | 危险工具调用前 callback 能拦截 |
| V3 | AskUserQuestion + resume(加严) | EB-003 + G.3 | resume 后 cost 累加正确,异常路径处理正确 |
| V4 | max_budget_usd(加严) | EB-003 + G.3 | 异常可识别,usage 在 hook 中可读 |
| V5 | Subagent tracing(加严) | EB-003 + G.3 | 子 session ID 可拿,cost 可拆分 |
| V6 | Session resume(volume 持久化) | EB-003 + EB-006 | 同 machine reboot 后能 resume,跨 machine 测试失败符合预期 |
| V7 | Signup bootstrap | IO-001 | 新用户 30 秒内进 dashboard |
| V8 | Bootstrap 异常路径 | IO-001 | 过期/已用邀请码正确拒绝,无脏数据 |
| V9 | LISTEN/NOTIFY on Vercel | IO-002 | 5 并发 SSE 60 秒稳定,或确认切 fallback |
| V10 | jobs 表 SKIP LOCKED 多 worker 拉取 | EB-001 | 模拟多 worker 并发,无重复消费 |
| V11 | RLS 跨租户隔离 E2E | EB-002 | 5 个用例全过(读/写/列表/聚合/JWT 篡改) |

**通过条件:** V1-V11 全 ✓ 或 ✗+确认 fallback。spike-report.md 提交即为 W0 完成标志。

---

## 下一步行动(Next Action)

> 这一节是给"现在打开这个文件的人"看的——不管是你今天,还是你三周后回来看,都不需要回顾对话历史。

### 当前状态

- ✅ Spec 已完成 5 轮闭环,所有 reviewer 反馈已吸收
- ✅ 文档不再修订
- ⏳ 等待启动 Week 0 spike

### 你现在该做的事

**只有一件:进 Week 0 spike。**

不需要再讨论需求、架构、决策。所有该定的都定了(见状态表)。任何"再讨论一下"都是拖延。

### Week 0 第一步

打开终端,做以下事情:

1. **创建 git 仓库**(任意名字,推荐 `solo-agent-platform`)
2. **创建 monorepo 骨架** — 三个目录:
   - `apps/web/` — Next.js 15 App Router(后面用)
   - `apps/worker/` — Python long-running worker(W0 spike 主要在这里)
   - `apps/spike/` — W0 临时 spike 脚本目录(W0 后归档)
3. **本地起 Postgres + pgvector** — 用 Docker Compose,准备一个最小 schema(只要 `users` / `tenants` / `jobs` / `agent_sessions` / `session_events` 几张表)
4. **拿到 Anthropic API key** — 新开 project key,设月度 $200 上限,启用 prompt caching
5. **跑 V1**(SDK 创建 session + streaming events) — 这是最简单的验证,跑通就证明环境 OK

### 怎么知道 W0 完成了

打开 `docs/spike-report.md`(你需要新建这个文件),里面有 V1-V11 的结果。

每一项要么:
- ✅ 通过 — 写明实测输出
- ⚠️ 部分通过 — 写明 fallback 怎么走
- ❌ 不通过且无 fallback — STOP,回头改架构

**11 项全部不是空白 = W0 完成,可以进 W1。**

### 如果你卡住了

按以下顺序自查:

| 卡住位置 | 看哪一节 |
|---|---|
| 不知道要做什么 | §0.2(问题陈述)+ 本节 |
| 不知道为什么这么设计 | §0.5(决策日志) |
| 不知道某个组件怎么实现 | 附录 E(工程边界) |
| 不知道某个表怎么建 | §6(数据模型) |
| 不知道两个表的关系 | 附录 F(SoT 规则) |
| 不知道某个状态怎么转 | §7(状态机) |
| 不知道怎么写某个 prompt | §13.1(template 设计) |
| 不知道某个术语 | 附录 C |

如果以上都没回答,说明这个问题超出 spec 范围,记下来,等 W1 结束补 ADR。

### 如果你想再修这个文档

**别修。** 按本节末尾的"修订规则"判断要不要改。

### 修订规则

只有以下情况才改这个文档:

1. **W0 spike 发现某个 SDK 能力实测与 spec 不符** — 改对应 EB-XXX 的 fallback 段
2. **W1-W8 实施中发现某条预设决策实际不可行** — 改对应 PD-XXX 并加 ADR
3. **完成 Stage 1 后准备进 Stage 2** — 整份文档 fork 一份成 Stage 2 spec,不动这份

**不改的情况:**
- "我想到一个更好的方案" → 不改,记到 backlog,Stage 1 结束再考虑
- "某段写得不够漂亮" → 不改,功能价值优先
- "想加一个新功能" → 不改,加到 §1.3 out-of-scope 列表确认是否真的不做

### 最后一条

**这个文档的目的是让你能开发,不是让你写文档。** 现在 spec 完成度已经超过 95% 的 hobby project,继续打磨是负收益。

合上文件,打开 IDE。开始 Week 0。

---

> 文档结束。
