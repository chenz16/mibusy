# Solo Agent Platform — UI Design Spec

> 研究基础: LangChain Agent Inbox / OpenHands / Langfuse / Claude.ai
> 技术栈: Next.js 15 App Router · shadcn/ui · Tailwind v4 · 深色优先
> 产品边界: Stage 1 私人 agent 平台,服务 owner + 1-2 个朋友,但按未来 SaaS control plane 的信息架构设计

---

## 0. 设计目标与原则

### 0.1 设计目标

Stage 1 UI 不是 chat demo,而是 agent control plane。界面必须让用户随时回答四个问题:

| 问题 | UI 回答方式 |
|---|---|
| Agent 现在在做什么? | Session 状态、事件流、tool_use / tool_result、最近事件 |
| Agent 花了多少钱? | per-session cost、root session 聚合 cost、预算进度与告警 |
| Agent 需要我做什么? | Inbox 徽章、awaiting_input 卡片、移动端优先的回复界面 |
| Agent 能调用什么? | Template 列表、DAG 调用图、tools / skills / MCP 能力摘要 |

### 0.2 设计原则

| 原则 | 实施方式 |
|---|---|
| Control plane 优先 | 首屏导航围绕 Chat / Tasks / Schedules / Inbox,管理入口放次级 |
| 密度优先 | 任务、定时、模板、trace 使用 Table;只有 Inbox 使用卡片 |
| 状态可见 | session / schedule / budget 都用颜色 + 图标 + 文案三重编码 |
| 操作就近 | 行内提供查看、停止、复跑、编辑等常用操作;危险操作二次确认 |
| 深色基调 | 默认 dark mode,降低长时间监控疲劳;light mode 只保证可用 |
| 不依赖 thinking | 前端不渲染 SDK thinking 内容,只显示状态占位、tool events、final summary |
| Hobby 可实现 | 优先 shadcn/ui 内置组件,不自建复杂设计系统或可视化编辑器 |

### 0.3 主要信息架构

Stage 1 Web App 分 8 个区:

| 区域 | 角色 | Stage 1 必须支持 |
|---|---|---|
| Chat | 场景 A: 即发即得对话 | streaming、tool blocks、pause / resume / budget / kill |
| Tasks | 场景 B: 后台任务 | task table、session tree、事件、成本、停止 |
| Schedules | 场景 C: 无人值守 | cron 配置、最近运行、失败自动 disable |
| Inbox | 人机异步边界 | awaiting_input 回复、批准/拒绝、24h 自动取消提示 |
| Memory | Layer 1 记忆 | session summary 浏览、语义搜索、trace 跳转 |
| Templates | agent 蓝图管理 | 五个 seed template、fork、revision、调用图 |
| Observability | 成本与健康度 | 今日/周/月 cost、template/user 拆分、recent traces |
| Settings | 个人与 owner 设置 | 通知、Anthropic 状态只读、MCP、预算、kill switch、邀请 |

---

## 1. 全局布局

```
┌───────────────────────────────────────────────────────────────┐
│ Sidebar (240px) │ Main Content Area                           │
│                 │                                              │
│ Logo / tenant   │ Page Header                                  │
│                 │ title · subtitle/context · primary action    │
│ PRIMARY         ├──────────────────────────────────────────────┤
│ Chat            │                                              │
│ Tasks           │ Page Content                                 │
│ Schedules       │                                              │
│ Inbox [3]       │                                              │
│                 │                                              │
│ KNOWLEDGE       │                                              │
│ Memory          │                                              │
│ Templates       │                                              │
│                 │                                              │
│ SYSTEM          │                                              │
│ Observe         │                                              │
│ Settings        │                                              │
│                 │                                              │
│ User avatar     │                                              │
└───────────────────────────────────────────────────────────────┘
```

**实现组件:** `shadcn/ui Sidebar` with `collapsible="icon"`

- 展开态: 240px,图标 + 文字
- 折叠态: 64px,仅图标,hover tooltip 显示文字
- 分组: `PRIMARY` / `KNOWLEDGE` / `SYSTEM`,使用 `<SidebarSeparator>`
- Inbox 徽章: `Badge variant="destructive"`,显示未处理 `inbox_items` 数
- 租户提示: sidebar 顶部显示当前 tenant 名称;Stage 1 通常是 owner workspace
- 全局顶部不做营销式 header;每个页面只保留工作所需标题、筛选和主操作

### 1.1 页面 Header 规范

| 页面 | 标题右侧主操作 | 辅助信息 |
|---|---|---|
| Chat | `New chat` | 当前 template、预算、session 状态 |
| Tasks | `New task` | running / awaiting input 数量 |
| Schedules | `New schedule` | disabled due to failures 数量 |
| Inbox | 无或 `Refresh` | 待处理数量、最旧等待时长 |
| Memory | 无 | summary 总数、embedding 状态 |
| Templates | `Fork template` 或 `New private template` | active / archived 数量 |
| Observe | 无 | 当前时间范围 |
| Settings | 根据 tab 变化 | owner-only 标识 |

---

## 2. 视觉系统

### 2.1 Dark Palette

```css
:root[class~="dark"] {
  --background:   240 10% 3.9%;
  --card:         240 10% 5.0%;
  --popover:      240 10% 5.0%;
  --sidebar-bg:   240 10% 4.5%;
  --muted:        240 4% 16.0%;
  --border:       240 4% 14.0%;
  --foreground:   0 0% 98.0%;
  --muted-fg:     240 5% 65.0%;
  --accent:       220 70% 58%;
}
```

避免整站变成单一蓝紫色主题:导航与背景使用低饱和中性色,状态色只用于状态和告警,图表使用多色但低饱和 palette。

### 2.2 Session 状态颜色

Stage 1 状态机为 7 态,UI 必须全部覆盖:

| 状态 | 含义 | 颜色 | 图标 | 允许主操作 |
|---|---|---|---|---|
| `pending` | 已入队未开始 | Amber | `Clock` | Cancel |
| `running` | worker 正在执行 | Blue | `Loader2` spin | Pause / Kill |
| `awaiting_input` | 等用户回复,worker 已释放 | Violet | `MessageSquare` | Open Inbox / Reply |
| `suspended` | 用户主动暂停 | Slate | `PauseCircle` | Resume / Kill |
| `completed` | 成功完成 | Green | `CheckCircle2` | Fork / View trace |
| `failed` | 错误或超预算 | Red | `XCircle` | Retry / View error |
| `cancelled` | 用户或系统取消 | Gray | `Ban` | Fork / View trace |

实现规则:
- 使用 `Badge` + icon + label,不要只靠颜色。
- 表格里显示短标签,详情里显示完整解释和最近一次 transition reason。
- `awaiting_input` 不能显示成仍在占用 worker;详情里文案为 "Waiting for your reply · worker released"。

### 2.3 预算与风险颜色

| 状态 | 条件 | UI |
|---|---|---|
| 正常 | < 70% | muted progress |
| 接近上限 | 70-89% | Amber progress + tooltip |
| 高风险 | 90-97% | Orange progress + inline warning |
| 即将 kill | >= 98% | Red progress + warning icon |
| 已停止 | budget guard 命中 | `failed` 状态 + reason "Budget exceeded" |

预算显示优先级: session budget > user daily budget > global monthly budget。Chat 和 Task detail 同时显示 session budget 与全局预算摘要。

### 2.4 Typography

| 角色 | 字体 | 大小 |
|---|---|---|
| UI 文字 | Inter | 13-14px |
| 代码 / tool 输出 | JetBrains Mono | 12-13px |
| 页面标题 | Inter SemiBold | 18-20px |
| 表格标签 | Inter Medium | 12px |
| 长文 summary | Inter | 14px, line-height 1.6 |

---

## 3. Chat 区

### 3.1 页面结构

桌面端使用三栏工作台:

```
┌───────────────┬──────────────────────────────────────┬───────────────┐
│ Sessions      │ Chat stream                           │ Session info  │
│ Search        │ template · title · status · [Kill]    │ Budget        │
│ Today         ├──────────────────────────────────────┤ Tree          │
│ Yesterday     │ status placeholder                    │ Recent events │
│ Earlier       │ tool_use / tool_result blocks         │ Trace link    │
│               │ assistant messages                    │               │
│               ├──────────────────────────────────────┤               │
│               │ Composer · Send · Pause · Budget      │               │
└───────────────┴──────────────────────────────────────┴───────────────┘
```

- 左栏: 280px,历史 session 搜索与分组列表。
- 中栏: flex-1,消息流与 composer。
- 右栏: 320px,当前 session 的状态、预算、session tree、最近 20 条事件。
- 窄屏: 左右栏收进 Sheet,保留中栏。

### 3.2 Chat Header

| 元素 | 行为 |
|---|---|
| Template Select | 新 session 创建前可选;运行后只读显示 `template_name@revision` |
| Session title | 可编辑,默认取首条 prompt 摘要 |
| Status Badge | 显示 7 态之一 |
| Budget Button | 打开预算编辑 Dialog;不能低于已消耗 cost |
| Pause / Resume | `running` 可暂停,`suspended` 可恢复 |
| Kill | `pending/running/suspended/awaiting_input` 可用,AlertDialog 确认 |

### 3.3 消息与事件展示

- User 消息: 右对齐,`bg-muted`,最大宽度 70%。
- Assistant 消息: 左对齐,无背景,markdown 渲染,可显示该 message 增量 cost。
- 状态占位: 显示 "Working..." / "Calling tool..." / "Processing result...",不展示 SDK thinking 内容。
- Tool call 块: 独立行,`Collapsible`,左侧 `border-l-2`,默认折叠。
- Tool result: 成功用 muted,失败用 destructive border,显示错误摘要与 trace link。
- Final summary: completed 后固定在消息流末尾,并同步写入 Memory summary。

Tool block 折叠态示例:

```
WebSearch · "Claude Agent SDK Python" · 3.2s · $0.004   chevron
```

展开态显示:
- input JSON,用 monospace。
- output 摘要,默认截断到 1,000 字。
- 原始 trace 深链,跳 Langfuse。

### 3.4 Session 列表

```
Today
  general_assistant  Claude SDK 选型对比...      14:23  $0.12
  writer_agent       博客草稿...                 11:05  $0.41
Yesterday
  research_agent     K-12 robotics market...     23:41  $0.88
```

- 分组: Today / Yesterday / Past 7 days / Earlier。
- 每条显示 template icon、标题、时间、cost、状态小点。
- 搜索: 标题 + summary 关键词;语义搜索放 Memory,Chat 只做轻量搜索。
- 右键菜单: Rename / Fork / Delete。Delete 对 completed/cancelled/failed 可用,running 需先 kill。

### 3.5 Composer

- `Textarea` auto-resize,最大 8 行。
- `Enter` 发送,`Shift+Enter` 换行。
- disabled 状态: `running` 中允许 "Inject message" 作为单独按钮;`awaiting_input` 引导去 Inbox 回复。
- composer 底部显示 session budget、global monthly budget 简写、当前模型。

---

## 4. Tasks 区

### 4.1 列表视图

Tasks 展示后台 root sessions,不是所有子 session。默认排序: active first,then updated desc。

| 列 | 宽度 | 内容 |
|---|---|---|
| Name | flex-1 | session title + template badge + tags |
| Status | 132px | 7 态 badge |
| Duration | 88px | running 用 live duration |
| Cost | 96px | root subtree `SUM(cumulative_cost_usd)` |
| Children | 80px | child session count |
| Updated | 120px | relative time |
| Actions | 160px | View / Stop 或 Retry |

顶部控件:
- `New task` primary button。
- Tabs: All / Active / Awaiting input / Completed / Failed。
- Filters: Template, Owner, Tag, Date range。
- Bulk action Stage 1 不做,避免误杀长任务。

### 4.2 详情 Drawer

右侧 `Sheet`,宽 560px。内容分区:

```
Task title · status badge                         [x]
Template: research_agent@3 · Owner: chen
Budget: $0.34 / $5.00 · Global: $23.40 / $200

Initial prompt
"调研 2026 年美国 K-12 机器人教育市场..."

Session tree
root                                      $0.34  2h14m
  research_agent                          $0.12  45m
  notifier_agent                          $0.01  2m completed

Events
14:23 tool_use      web_search
14:24 tool_result   3 results
14:25 status        awaiting_input

Result / Error
terminal summary or failure reason

[Open Langfuse trace] [Fork task] [Stop task]
```

Rules:
- `awaiting_input` task 在 Drawer 顶部显示 `Reply in Inbox` CTA。
- `failed` task 显示 failure reason、last event、Retry 按钮。
- 子 session tree 显示同步 subagent;异步 subprocess 通过 `triggered_by` 在 "Related sessions" 列出。

### 4.3 新建任务表单

使用 `Dialog` 或大屏 `Sheet`:

| 字段 | 组件 | 规则 |
|---|---|---|
| Template | `Select` | 默认 `research_agent`;展示可用 tools 简介 |
| Prompt | `Textarea` | 必填,显示变量提示但不做复杂 builder |
| Max budget | `Input` + `$` prefix | 默认 $5,不能超过 owner 设置上限 |
| Max hours | `Input` | 默认 template 配置 |
| Notify when done | `Checkbox` | Email + Inbox |
| Tags | `Input` | 逗号分隔即可 |

提交后立即跳到 task detail,显示 `pending`。

---

## 5. Schedules 区

### 5.1 列表视图

| 列 | 内容 |
|---|---|
| Name | schedule name + template badge |
| Cron | human readable + raw cron tooltip |
| Status | enabled/disabled switch |
| Last 5 runs | compact dots: success / failed / cancelled |
| Last run | `2h ago · completed` or failure reason |
| Next run | absolute + relative time |
| Actions | Run now / Edit / Delete |

Rules:
- 连续失败 3 次自动 disable,行背景轻微 red tint,显示 `Auto-disabled after 3 failures`。
- `Run now` 会创建一个 subprocess root session,进入 Tasks。
- 删除 schedule 使用 AlertDialog,不删除历史 sessions。

### 5.2 新建/编辑表单

- Name。
- Template Select。
- Prompt template `Textarea`,支持 `{{date}}`, `{{weekday}}`, `{{last_run_at}}`。
- Cron 输入 + preset segmented control: Daily / Weekdays / Weekly / Monthly / Custom。
- 下次 5 次触发时间实时预览。
- Notify on success / failure checkboxes。
- Per-run max budget,默认继承 template。

---

## 6. Inbox 区

### 6.1 概念

Inbox 是所有 `awaiting_input` session 的工作队列。它承接 AskUserQuestion、approval、review 等人机异步点。进入 Inbox 时,用户应该能在 10 秒内判断是否批准、补充、拒绝或取消。

### 6.2 列表与卡片

```
research_agent · Task: K-12 robotics market      waiting 14m
Agent question
"找到了 3 篇付费论文,要继续抓取付费内容吗? 预计额外消耗 $0.80。"

Context
Completed: web_search x5, web_fetch x3
Current cost: $0.34 · Remaining session budget: $4.66
Risk: paid content / extra cost

[Approve] [Edit answer] [Reject] [Cancel session]
```

Card rules:
- 卡片宽度跟随内容区,不嵌套额外 Card。
- 顶部显示 template、来源 task/chat/schedule、等待时长。
- 中部显示 agent question、上下文摘要、预算影响。
- 底部操作固定顺序: Approve / Edit answer / Reject / Cancel session。
- 24h 自动取消的项显示倒计时;超过 20h 用 amber warning。

### 6.3 回复行为

| 操作 | 行为 |
|---|---|
| Approve | 发送默认肯定回答,resume session |
| Edit answer | Dialog 编辑文本后 resume |
| Reject | 发送明确拒绝文本,由 agent 自行决策 |
| Cancel session | 直接 transition 到 `cancelled`,需要确认 |

处理成功后卡片 optimistic remove;失败则恢复并显示 toast。

### 6.4 移动端优先

Inbox 是唯一必须重点优化移动端的区域:
- 手机端卡片全屏宽度,按钮放底部 sticky action bar。
- 邮件链接打开对应 inbox item,不是只打开首页。
- 长上下文默认折叠,question 与预算影响必须首屏可见。

空状态: "No pending requests"。不使用装饰插画。

---

## 7. Memory 区

Memory 只做 Stage 1 Layer 1: per-session summary + embedding + 跨 session 语义检索。Layer 2/3 入口可灰显,但不应暗示已经可用。

### 7.1 页面结构

```
Search summaries...

Results table/list
Template · Summary · Time · Cost · Tokens · Status

Detail sheet
Summary · session tree · key events · Open trace
```

### 7.2 搜索与浏览

- 搜索框: 语义检索,返回 top 10,显示相关度轻量标记。
- 默认页: 最近 summaries,按时间分组。
- 条目字段: template icon、summary 前 120 字、时间、cost、status。
- 点击: 右侧 Sheet 展开完整 summary、root/child tree、trace link。
- 编辑 / 删除 summary 是 P1,Stage 1 可先只读。

---

## 8. Templates 区

Templates 是 Stage 1 UI 现有 spec 最薄弱但产品上必须存在的管理区。它不做复杂可视化编辑器,但必须让 owner 看清每个 agent 的能力边界和调用关系。

### 8.1 列表视图

| 列 | 内容 |
|---|---|
| Name | `general_assistant`, `research_agent`, etc. |
| Scope | Global / Private |
| Revision | latest revision number |
| Model | configured model |
| Tools | compact list,最多显示 3 个 + count |
| Can invoke | outgoing DAG edges count |
| Budget | default max budget |
| Status | Active / Archived |
| Actions | View / Fork / Archive |

默认 seed templates:
- `general_assistant`
- `research_agent`
- `writer_agent`
- `digest_agent`
- `notifier_agent`

### 8.2 Template 详情

使用详情页或 Sheet,分 tabs:

| Tab | 内容 |
|---|---|
| Overview | 用途、scope、revision、model、默认预算、最大运行时长 |
| Prompt | system prompt 只读或编辑态;保存生成新 revision |
| Capabilities | allowed_tools、skills、MCP servers、permission_mode |
| Invocation DAG | 当前 template 可调用谁、谁可调用当前 template |
| Test | 输入临时 prompt 起 test session |
| History | revision list,显示创建时间和变更摘要 |

Rules:
- `tenant_id = NULL` 的 global template 对普通用户只读;owner 可以 fork 后改 private copy。
- 保存任何编辑都创建新 revision;在跑 session 继续显示旧 `template@revision`。
- DAG 编辑不做拖拽画布;使用 "Can invoke" multi-select + 环检测错误提示。
- `notifier_agent` 标记为 subprocess target,解释为 "async notification worker"。

### 8.3 Template DAG 展示

Stage 1 使用简洁文本图 + edge table,不做 canvas:

```
general_assistant -> research_agent
writer_agent      -> research_agent
digest_agent      -> none
any               -> notifier_agent (async)
```

保存边时如果形成环,表单顶部显示 destructive alert: "This edge creates a cycle. Template invocation must remain a DAG."

---

## 9. Observability 区

Observability 目标是快速定位成本、失败率和异常 session,不是替代 Langfuse。

### 9.1 Dashboard

```
Today cost | Week cost | Month cost / budget | Success rate | Awaiting input

Cost by template         Sessions over time
Cost by user             Failure reasons

Recent sessions table
```

### 9.2 指标规则

| 指标 | 来源 | 展示 |
|---|---|---|
| Today / week / month cost | `billing_events` 聚合 | 卡片 + 趋势 |
| Task total cost | root session subtree sum | Tasks / detail |
| Success rate | terminal sessions | 按时间范围 |
| Awaiting input count | `agent_sessions.status` | header + sidebar badge |
| Failure reasons | transition reason / events | bar list |

时间选择器: Today / 7 days / 30 days / Custom。

图表库: Recharts through `shadcn/ui Charts`。

Recent sessions table 字段:
- title
- template@revision
- owner
- status
- duration
- cost
- created_at
- Langfuse trace link

---

## 10. Settings 区

### 10.1 结构

```
Personal
  Account
  Notifications

Workspace (owner only)
  Anthropic
  MCP Servers
  Budgets
  Kill Switch
  Invitations
```

### 10.2 Personal

- Account: email、avatar 只读或基础编辑。
- Notifications: Inbox email、browser push。
- Stage 1 不在个人设置里提供 Anthropic API key 输入。

### 10.3 Workspace Owner

| 区域 | UI |
|---|---|
| Anthropic | 只读状态: `Configured · Last verified 2h ago`;key 由 Doppler 注入 |
| MCP Servers | 表格: name、status、last checked、actions |
| Budgets | monthly global budget、per-user daily budget、告警阈值 |
| Kill Switch | destructive section,一键停所有 `running` sessions |
| Invitations | generate invite code,7 天有效,显示一次 + copy |

Kill Switch 使用 `AlertDialog`,确认文案必须包含当前 running 数量与影响范围。

---

## 11. 响应式策略

| 区域 | 桌面 | 移动 |
|---|---|---|
| Chat | 三栏工作台 | 单栏 chat,session/info 用 Sheet |
| Tasks | Table + detail Sheet | Card/list + full-screen detail |
| Schedules | Table | Card/list |
| Inbox | Card list | 全屏优先,sticky actions |
| Memory | Search + list + detail Sheet | Search + list,detail 全屏 |
| Templates | Table + detail | List + tabs |
| Observability | 多列图表 | 单列堆叠 |
| Settings | 左侧二级导航 | Tabs |

移动端优先级: Inbox > Chat resume > Task status。Templates 和 Observability 移动端只需可用,不追求高密度。

---

## 12. 空状态与错误状态

| 区域 | 空状态文案 | 动作 |
|---|---|---|
| Chat | "Start a new chat with a template" | `New chat` |
| Tasks | "No background tasks yet" | `New task` |
| Schedules | "No schedules yet" | `New schedule` |
| Inbox | "No pending requests" | 无 |
| Memory | "No session summaries yet" | 无 |
| Templates | "No private templates yet" | `Fork a global template` |
| Observe | "No sessions in this range" | 改时间范围 |

错误状态:
- SSE 断开: 顶部 inline alert + `Reconnect`。
- 权限不足: 页面级 empty/error,不要隐藏导航项导致用户困惑。
- 预算耗尽: 显示具体命中的预算层级。
- Template archived: 新建入口禁用,历史 session 仍可查看旧 revision。

---

## 13. shadcn 组件清单

| 组件 | 用于 |
|---|---|
| `Sidebar` + `SidebarProvider` | 全局导航 |
| `Badge` | 状态、scope、Inbox 徽章 |
| `Button` | 所有操作 |
| `Table` + `DataTable` | Tasks / Schedules / Templates / Observability |
| `Sheet` | 详情 Drawer、移动端侧栏 |
| `Dialog` / `AlertDialog` | 新建表单、危险确认 |
| `Collapsible` | Tool call、Inbox context |
| `ScrollArea` | 消息流、列表 |
| `Select` | Template、filter |
| `Textarea` | Prompt、reply、system prompt |
| `Input` | Budget、search、tags |
| `Progress` | Budget |
| `Switch` | Schedule enabled、notifications |
| `Tabs` | Settings mobile、Template detail |
| `Card` | Inbox item only;避免普通页面卡片堆叠 |
| `Charts` (Recharts) | Observability |
| `Separator` | Sidebar / panel 分隔 |
| `Tooltip` | 图标按钮、raw cron、budget 说明 |
| `Toast` | 保存、resume、复制邀请码等短反馈 |

Icons 使用 `lucide-react`: `MessageSquare`, `Clock`, `Loader2`, `CheckCircle2`, `XCircle`, `Ban`, `PauseCircle`, `Play`, `Square`, `GitBranch`, `CalendarClock`, `Database`, `Activity`, `Settings`, `Copy`, `ExternalLink`。

---

## 14. 开发路线对应

与 Stage 1 路线图对齐,按能跑通核心 lifecycle 的顺序交付:

| 周 | UI 交付 |
|---|---|
| W1 | Shell: auth 后布局、Sidebar、空状态、只读 seed Templates 列表 |
| W2 | Chat 基础版: 新 session、文本响应、session 列表、预算显示 |
| W3 | Chat streaming: SSE、tool call 折叠、状态占位、基础 Inbox |
| W4 | Tasks: table、detail Sheet、session tree、停止/失败展示 |
| W5 | Schedules: cron 表单、运行历史、Run now、失败自动 disable UI |
| W6 | Memory + budgets: summary 搜索、budget progress、Observability 基础图表 |
| W7 | Settings + invites + mobile Inbox: owner 设置、kill switch、邀请码 |
| W8 | Templates 管理补齐: fork、revision、DAG edge 编辑、test session |

---

## 15. 设计验收清单

- Chat 不展示或依赖 SDK thinking 内容,只展示状态占位、tool events、final summary。
- 所有 7 个 session 状态都有 badge、图标、可用操作和空/错误处理。
- `awaiting_input` 在 Chat、Tasks、Inbox 三处语义一致:等待用户、worker 已释放。
- Tasks cost 使用 root subtree 聚合,不是只显示 root 自身 cost。
- Settings 中 Anthropic key 不可编辑,只显示配置状态。
- Templates 管理覆盖五个 seed template、revision、fork、DAG 调用关系。
- Inbox 手机端能从邮件链接直达 item 并完成回复。
- 任何 destructive 操作都有 AlertDialog,并说明影响范围。

---

> **参考来源**
> - [LangChain Agent Inbox](https://github.com/langchain-ai/agent-inbox) — Inbox 交互模式
> - [OpenHands](https://docs.openhands.dev) — Tool call 流式展示
> - [Langfuse](https://langfuse.com) — Observability 布局
> - [shadcn/ui](https://ui.shadcn.com) — 组件系统
> - [shadcn Charts](https://ui.shadcn.com/charts) — Recharts 集成
