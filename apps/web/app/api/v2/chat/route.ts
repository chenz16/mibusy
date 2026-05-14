import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { createGmailDraft, gmailSearchImportant, loadGmailConfig } from "../../../../lib/gmail";
import { hireAgent, dismissAgent, createCeoSkill, getWorkspaceSnapshot, getCeoSkillBody, writeMemory, listRecentMemory, searchMemory, createSchedule, createMeeting } from "../../../../lib/v2-data";
import { computeNextRun, describeCron } from "../../../../lib/cron";

export const dynamic = "force-dynamic";

const CEO_DESK_ID = process.env.MIBUSY_DESK_ID || "00000000-0000-0000-0000-000000000001";

const SPECIALIST_IDS: Record<string, string> = {
  Nova:      "00000000-0000-0000-0001-000000000002",
  Ledger:    "00000000-0000-0000-0001-000000000003",
  Quill:     "00000000-0000-0000-0001-000000000004",
  Scheduler: "00000000-0000-0000-0001-000000000005",
  Beacon:    "00000000-0000-0000-0001-000000000006",
  Mailroom:  "00000000-0000-0000-0001-000000000010",
};

const SYSTEM_PROMPT = `你是 CEO 的 AI 助理。你背后有一支专家团队可以调用：
- Nova：市场研究、竞品分析、行业报告
- Ledger：财务分析、数据处理、报表
- Quill：内容写作、文案、邮件草稿
- Scheduler：日程规划、项目管理、提醒
- Beacon：监控、预警、状态追踪
- 邮件秘书（Mailroom）：扫描收件箱挑重点 / 起草邮件草稿（CEO 在 Gmail 里点发）

你不是单次回复的助手 — 你是 agent，每条消息内可以连续调用工具（最多 5 步），先看数据再决定动作。

视野（重要）：
- 每条消息开头会注入"当前工作台状态"快照（团队、运行中任务、最近交付、待决策、使命、skill、预算）和"长期记忆"（CEO 决策 / 事实 / 笔记 / 总结）
- 注入是简化版；若需要更详细 / 实时数据：调 get_workspace_snapshot 重新拉
- 需要 skill 全文：调 get_skill_body
- 想搜历史记忆：调 search_memory
- 上述都是只读工具，调用后会把结果喂回来给你继续推理

记忆（重要）：
- 主动用 remember 工具记下：CEO 明确的决策（『就这么定』『批准』『去做』）、关于人/项目/客户的稳定事实、CEO 让你『记一下』的笔记
- 不记：闲聊、可以从 snapshot 推出来的（团队名单等）、噪音
- 调用 hire_agent / dismiss_agent / create_task 已经自动写决策记忆，你不用重复记
- 答 CEO 问题时优先用 system 注入的最近记忆；找不到再 search_memory

规则：
- 简单问答、闲聊、解释说明 → 直接回复，不派任务
- 需要实际执行、产出文档或调研的任务 → 用 create_task 工具派给合适的专家
- 一次对话只派一个任务，不要拆分成多个
- 语言跟着 CEO 走，中文就中文
- 派完任务后，reply 里告诉 CEO：结果会在页面上方的动态区自动出现，不是在对话里回复
- CEO 问开放问题（"现在团队怎么样" "进展如何" "谁在忙" "钱花了多少"）→ 优先用 system 里的快照回答；若快照里没有就调 get_workspace_snapshot
- CEO 说"用 X 模板"/"按 X 方法论" → 先 get_skill_body 拿到内容，再据此 create_task 或直接回复

聊天本身的清理：
- CEO 说「清空对话 / 清除聊天 / 清掉历史 / 把对话删了」之类 → 调 clear_chat
- CEO 说「浓缩对话 / 精简 / 太长了清理一下 / 保留最近 X 条」→ 调 compact_chat（keep 默认 20，CEO 给了数字就用 CEO 的）
- 不要主动建议清理；只有 CEO 明确要清才调用

邮件相关：
- CEO 说「给 X 起草邮件 / 写封邮件给 X / 回复 X 的邮件 / 准备一封 …邮件」→ 调 email_draft
- CEO 问「邮件里有什么重要的 / 最近客户有没有回我 / 查一下 X 的邮件」→ 调 email_scan
- 草稿创建后只是放在 Gmail 草稿箱，**永不直接发送**，CEO 必须自己去 Gmail 点发
- 起草邮件时模仿 CEO 风格（看上面 CEO 的角色设定）

Skill 沉淀 — CEO 想把方法论 / 模板 / 流程沉淀下来时：
- CEO 说「沉淀一个 skill / 把这个记下来 / 新增一个模板 / 记一下这个方法论 / 弄个 X 模板」→ 调 create_skill
  - 凭你的理解，生成**具体可用**的 100-400 字内容（不要空话、不要"以下是模板"这种废话，直接给具体内容）
  - 名字要短好记（2-8 字）
- 不要主动建议沉淀 — 只有 CEO 明确要求才调

人事（雇人/解雇）— 这是你（AI 助理）自己掌握的能力：
- CEO 说「雇个市场总监 / 招一个 X / 新增一个负责 Y 的员工」→ 调 hire_agent
  - 不要追着 CEO 问细节 — 凭你对岗位的理解，**自己生成完整的**角色配置：合理的中文名字、规范职务名、100-300 字详细的工作风格 prompt（描述职责、专长、口吻），合理预算
  - 雇完后让 CEO 知道员工已经上岗，可以立刻派活
- CEO 说「解雇 X / 开除 X / X 不要了」→ 调 dismiss_agent，**但**只有 CEO 在最近对话明确给出具体 agent ID 才用；如果只有名字，告诉 CEO 去员工详情页（点员工头像 → 配置 → 解雇）
- 不要主动建议解雇`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "把任务派给专家执行。用于需要实际产出（报告、文案、数据分析等）的请求。",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "任务标题，20字以内" },
          prompt: { type: "string", description: "给专家的详细任务说明" },
          specialist: {
            type: "string",
            enum: ["Nova", "Ledger", "Quill", "Scheduler", "Beacon"],
            description: "选择最合适的专家",
          },
          reply: { type: "string", description: "同时给 CEO 的简短回复，说明派了什么任务给谁" },
        },
        required: ["title", "prompt", "specialist", "reply"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_chat",
      description: "清空当前 CEO 主聊天的所有消息历史。用于 CEO 明确说『清空对话/清除聊天/把对话删了』之类的指令。这是危险操作，建议在 reply 里提醒一下。",
      parameters: {
        type: "object",
        properties: {
          reply: { type: "string", description: "给 CEO 的简短回复，确认已清空（前端会先弹确认框，用户可取消）" },
        },
        required: ["reply"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compact_chat",
      description: "浓缩当前 CEO 主聊天，只保留最近若干条消息。用于 CEO 说『浓缩对话/精简对话/对话太长了清理一下』之类。",
      parameters: {
        type: "object",
        properties: {
          keep: { type: "integer", description: "保留多少条最近消息，默认 20", default: 20 },
          reply: { type: "string", description: "给 CEO 的简短回复" },
        },
        required: ["reply"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "email_draft",
      description: "在 CEO 的 Gmail 里创建一封草稿（不会自动发送）。用于 CEO 说『起草一封邮件给 X』『回复 X 的邮件』『准备一封感谢/道歉/确认邮件』之类。",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "收件人邮箱地址。如果 CEO 只提到名字没给地址，先问 CEO 要地址，不要瞎编。" },
          subject: { type: "string", description: "邮件主题，简洁直接" },
          body: { type: "string", description: "邮件正文。语气模仿 CEO 风格：直接、重点先行、不啰嗦。中文邮件用中文，英文用英文。" },
          cc: { type: "string", description: "（可选）抄送" },
          reply: { type: "string", description: "给 CEO 的简短回复，告知已起草" },
        },
        required: ["to", "subject", "body", "reply"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "hire_agent",
      description: "雇一个新员工到团队。用于 CEO 说『雇个市场总监』『新增一个负责 X 的员工』『招一个 Y』之类。\n\n根据 CEO 的简短描述，自动生成完整的角色配置：名字（中文/英文均可，2-6 字符）、职务、详细的工作风格 prompt（描述这个员工的职责、专长、行为方式、汇报风格），就像写一份岗位说明书。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "员工名字，2-6 字符。中文优先，可以用职务相关的雅号（如『市场总监』『阿木』『林姐』）" },
          role: { type: "string", description: "职务/头衔，比如『首席运营官』『品牌内容负责人』" },
          system_prompt: { type: "string", description: "详细的工作风格 prompt（100-300 字）：这个员工是谁、负责什么、擅长什么、怎么工作、用什么口吻汇报。会注入到该员工执行任务时的 system prompt。" },
          monthly_budget: { type: "number", description: "月预算（USD），默认 50。看职务重要程度判断：高管/技术专家 100-200，普通专员 30-80。" },
          reply: { type: "string", description: "给 CEO 的简短入职欢迎语，介绍新员工" },
        },
        required: ["name", "role", "system_prompt", "reply"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_skill",
      description: "把一个可复用的 prompt / 模板 / 方法论沉淀成 CEO 名下的 skill。用于 CEO 说『沉淀一个 skill』『把这套流程记下来』『新增一个模板』『记一下这个方法论』之类。\n\n根据 CEO 给的描述，生成完整 skill：短名字、一句话描述、具体可用的 body（100-400 字 Markdown 内容）。Skill 全公司可见，员工默认继承。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "skill 短名字，2-8 字符，中文优先（如『周报模板』『冷邮件框架』『谈判话术』）。要简洁好记。" },
          description: { type: "string", description: "一句话描述用途，20 字内" },
          body: { type: "string", description: "skill 主体，100-400 字 Markdown：实际可直接使用的模板/recipe/方法。要具体、可立即用，不要空话。" },
          tags: { type: "array", items: { type: "string" }, description: "可选标签数组" },
          reply: { type: "string", description: "给 CEO 的简短确认" },
        },
        required: ["name", "description", "body", "reply"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "dismiss_agent",
      description: "解雇员工。用于 CEO 说『解雇 X』『把 X 开了』『X 不要了』之类。**仅在 CEO 明确指名某个员工**时才用，不要主动建议。",
      parameters: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "员工 ID（UUID）。如果 CEO 只给名字，不要瞎猜 ID — 让 CEO 去员工 sheet 里手动解雇。" },
          reply: { type: "string", description: "给 CEO 的简短确认" },
        },
        required: ["agent_id", "reply"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "email_scan",
      description: "扫描 CEO 收件箱，挑出重要邮件（关键 deadline、付款提醒、重要客户、合同/法律相关）。用于 CEO 问『邮件里有什么重要的』『最近有没有客户回我邮件』之类。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "（可选）额外的 Gmail 搜索语法过滤词，例如 from:client@x.com" },
          reply: { type: "string", description: "给 CEO 的简短回复（结果会另外渲染）" },
        },
        required: ["reply"],
      },
    },
  },
  // ── Memory tools ────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "start_meeting",
      description: "召开内部会议。CEO 说『跟 X 和 Y 一起讨论一下 Z』『让团队开会聊聊 X』时调用。会议会进入 in_session 状态，CEO 直接进入会议室和参与者交流。每条 CEO 发言后系统会自动让每个参与者按其角色风格依次发言。",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "会议主题，简洁一句话" },
          agenda: { type: "string", description: "（可选）议程要点" },
          participants: { type: "array", items: { type: "string" }, description: "参与员工的名字数组，比如 ['Nova','Ledger','林姐']。从 workspace snapshot 的 team 里挑。" },
          reply: { type: "string", description: "给 CEO 的简短回复，告诉他会议已开 + 跳转链接" },
        },
        required: ["topic", "participants", "reply"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_task",
      description: "创建一个定时任务（按 cron 周期或一次性）。CEO 说『每周一让 Ledger 写复盘』『每天早上给我个 brief』『5/19 中午提醒我 X』之类时调。\n\nspecialist 必须是已存在的员工名（Nova/Ledger/Quill/Scheduler/Beacon/邮件秘书 或 CEO 雇的人）。cron 自己根据自然语言推算 — 不要追问 CEO 表达式细节。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "schedule 显示名，比如『周一财务复盘』" },
          specialist: { type: "string", description: "派给哪个员工的名字，比如 Ledger / 邮件秘书 / 林姐。从 workspace 快照里挑。" },
          cron_expr: { type: "string", description: "5 字段 cron 表达式 'M H DoM Mon DoW'。常用：'0 9 * * 1'（周一9点）/'0 9 * * 1-5'（工作日9点）/'0 9 * * *'（每天9点）/'0 17 * * 5'（周五5点下班前）/'0 9 1 * *'（每月1号9点）。一次性用 'ONCE:<ISO>' 格式如 'ONCE:2026-05-19T12:00:00Z'。" },
          title_template: { type: "string", description: "每次触发生成的任务标题" },
          prompt_template: { type: "string", description: "每次触发派给员工的详细任务说明" },
          reply: { type: "string", description: "给 CEO 的简短确认，含『下次跑 X 时间』" },
        },
        required: ["name", "specialist", "cron_expr", "title_template", "prompt_template", "reply"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remember",
      description: "把一条 CEO 想记住的信息存进长期记忆。**主动用**这个工具记录：CEO 做的决策、关于人/项目/偏好的事实、CEO 让你『记一下』的笔记。一句话定义：会议结论、客户偏好、CEO 决定、未来需要的提醒。\n\n不要记录闲聊或可以从其他数据推出的东西（比如团队名单已经在 snapshot 里）。",
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["decision","fact","note","summary"], description: "decision=CEO 决定 / fact=稳定事实 / note=临时笔记 / summary=对话总结" },
          content: { type: "string", description: "记忆内容，简洁直接，1-3 句话。包含足够上下文以便几周后看仍然懂。" },
          tags: { type: "array", items: { type: "string" }, description: "可选标签如 ['客户','王总','Q2','预算']" },
          reply: { type: "string", description: "给 CEO 的简短确认，例如『记下了』" },
        },
        required: ["kind", "content", "reply"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_memory",
      description: "在长期记忆里搜索（关键词 ILIKE 匹配）。CEO 问到『上次决定 X 怎么处理的』『关于 Y 我之前记过啥』时调用。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "搜索关键词，单词或短语，会模糊匹配 content" },
        },
        required: ["query"],
      },
    },
  },
  // ── Read-only context tools — don't terminate the agent loop ─────────────
  {
    type: "function",
    function: {
      name: "get_workspace_snapshot",
      description: "拉取当前工作台实时状态快照：团队成员（含工作风格摘要、预算/已花、在线状态）、正在执行的任务、最近 48 小时交付、待决策、使命、已沉淀 skill 列表、CEO 月度预算。**任何时候 CEO 问到『现在的状态/进展/谁在干啥/团队怎么样/钱花了多少』等开放问题前，先调这个工具拿最新数据。**",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_skill_body",
      description: "拉取某个已沉淀 skill 的完整 body 内容。当 CEO 说『用 X 模板帮我…』『按 X 方法论来…』时，先用这个拿到内容，然后再 create_task 或直接回复。",
      parameters: {
        type: "object",
        properties: {
          skill_id: { type: "string", description: "skill ID（UUID）。先从 get_workspace_snapshot 的 skills 列表里找到 id" },
        },
        required: ["skill_id"],
      },
    },
  },
];

async function createAssignment(title: string, prompt: string, specialistName: string): Promise<string | null> {
  const agentId = SPECIALIST_IDS[specialistName];
  if (!agentId) return null;
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const res = await client.query<{ id: string }>(
      `INSERT INTO assignments (desk_id, title, prompt, assigned_to_agent_id, status)
       VALUES ($1, $2, $3, $4::uuid, 'queued') RETURNING id::text`,
      [CEO_DESK_ID, title, prompt, agentId],
    );
    return res.rows[0]?.id ?? null;
  } catch {
    return null;
  } finally {
    await client.end().catch(() => null);
  }
}

async function getCeoSystemPrompt(): Promise<string | null> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const r = await client.query<{ ceo_name: string | null; ceo_role: string | null; ceo_system_prompt: string | null }>(
      `SELECT ceo_name, ceo_role, ceo_system_prompt FROM desks WHERE id = $1::uuid`,
      [CEO_DESK_ID],
    );
    const row = r.rows[0];
    if (!row?.ceo_system_prompt) return null;
    const header = row.ceo_name || row.ceo_role
      ? `当前 CEO 是 ${row.ceo_name ?? ""}（${row.ceo_role ?? "CEO"}）。`
      : "";
    return `${header}\n${row.ceo_system_prompt}`.trim();
  } catch {
    return null;
  } finally {
    await client.end().catch(() => {});
  }
}

// Compact snapshot rendered into the system prompt — read-only situational awareness.
function renderSnapshot(snap: Awaited<ReturnType<typeof getWorkspaceSnapshot>>): string {
  if (!snap) return "";
  const lines: string[] = [];
  lines.push(`\n== 当前工作台状态（自动注入 · ${new Date(snap.ts).toLocaleString("zh-CN")}） ==`);

  if (snap.team.length > 0) {
    lines.push(`\n【团队 / ${snap.team.length} 人】`);
    for (const t of snap.team) {
      const bud = t.monthly_budget != null ? ` · 月预算 $${t.monthly_budget} 已花 $${t.month_spent.toFixed(2)}` : "";
      const onl = t.online ? " [在线]" : "";
      lines.push(`- ${t.name} (${t.role}) [id=${t.id}]${bud}${onl}`);
      if (t.system_prompt_summary) lines.push(`  风格: ${t.system_prompt_summary}`);
    }
  }
  if (snap.running.length > 0) {
    lines.push(`\n【正在执行 / ${snap.running.length}】`);
    for (const r of snap.running) lines.push(`- ${r.agent_name ?? "?"} · ${r.title} · ${r.status} · ${r.started_ago}`);
  }
  if (snap.recent_deliverables.length > 0) {
    lines.push(`\n【最近 48h 交付 / ${snap.recent_deliverables.length}】`);
    for (const d of snap.recent_deliverables) lines.push(`- ${d.agent_name ?? "?"}: ${d.title} — ${d.summary.slice(0, 80)}`);
  }
  if (snap.awaiting_decisions.length > 0) {
    lines.push(`\n【待 CEO 决策 / ${snap.awaiting_decisions.length}】`);
    for (const a of snap.awaiting_decisions) lines.push(`- ${a.title}（来自 ${a.agent_name ?? "?"}）[id=${a.id}]`);
  }
  if (snap.missions.length > 0) {
    lines.push(`\n【我的使命 / ${snap.missions.length}】`);
    for (const m of snap.missions) lines.push(`- ${m.title} · ${m.status} · 子任务 ${m.subtask_progress} · 来自 ${m.mission_source ?? "上级"} [id=${m.id}]`);
  }
  if (snap.skills.length > 0) {
    lines.push(`\n【可用 Skill / ${snap.skills.length}】`);
    for (const s of snap.skills) lines.push(`- ${s.name}: ${s.description} [id=${s.id}]`);
  }
  if (snap.ceo_monthly_budget != null) {
    const pct = snap.ceo_monthly_budget > 0 ? Math.round((snap.ceo_month_spent / snap.ceo_monthly_budget) * 100) : 0;
    lines.push(`\n【CEO 本月费用】$${snap.ceo_month_spent.toFixed(2)} / $${snap.ceo_monthly_budget}（${pct}%）`);
  }
  lines.push(`\n== 上面是实时数据，回答涉及"现状/谁在干啥/进展/钱"等问题时请优先参考 ==`);
  return lines.join("\n");
}

const READ_TOOLS = new Set(["get_workspace_snapshot", "get_skill_body", "search_memory"]);

async function executeReadTool(fnName: string, args: Record<string, unknown>): Promise<string> {
  if (fnName === "get_workspace_snapshot") {
    const snap = await getWorkspaceSnapshot();
    if (!snap) return JSON.stringify({ error: "snapshot unavailable" });
    return JSON.stringify(snap);
  }
  if (fnName === "get_skill_body") {
    const id = typeof args.skill_id === "string" ? args.skill_id : "";
    if (!id) return JSON.stringify({ error: "skill_id required" });
    const r = await getCeoSkillBody(id);
    if (!r) return JSON.stringify({ error: "skill not found or disabled" });
    return JSON.stringify(r);
  }
  if (fnName === "search_memory") {
    const q = typeof args.query === "string" ? args.query.trim() : "";
    if (!q) return JSON.stringify({ error: "query required" });
    const rows = await searchMemory(q, 15);
    return JSON.stringify(rows);
  }
  return JSON.stringify({ error: `unknown read tool ${fnName}` });
}

function renderMemoryHeader(entries: Awaited<ReturnType<typeof listRecentMemory>>): string {
  if (!entries || entries.length === 0) return "";
  const lines: string[] = [`\n== 长期记忆（最近 ${entries.length} 条，按时间倒序） ==`];
  for (const m of entries) {
    const tagStr = m.tags.length > 0 ? ` [${m.tags.join(",")}]` : "";
    const dateShort = new Date(m.created_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
    lines.push(`- (${m.kind}, ${dateShort})${tagStr}: ${m.content}`);
  }
  lines.push(`== 用 remember 工具记新内容；用 search_memory 搜更早的 ==`);
  return lines.join("\n");
}

const MAX_AGENT_ITERATIONS = 5;

type ChatMsg = { role: string; content: string; tool_call_id?: string; tool_calls?: unknown };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const messages: { role: string; content: string }[] = body?.messages ?? [];
  if (!messages.length) return NextResponse.json({ error: "messages required" }, { status: 400 });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured" }, { status: 503 });

  const [ceoPrompt, snapshot, memoryEntries] = await Promise.all([
    getCeoSystemPrompt(),
    getWorkspaceSnapshot(),
    listRecentMemory(20),
  ]);
  const sysContent = [
    SYSTEM_PROMPT,
    ceoPrompt ? `\n关于 CEO（用户）：\n${ceoPrompt}` : "",
    renderSnapshot(snapshot),
    renderMemoryHeader(memoryEntries),
  ].join("");

  const conversation: ChatMsg[] = [
    { role: "system", content: sysContent },
    ...messages,
  ];

  // Agent loop — max N iterations. Read tools loop the conversation forward;
  // action tools (create_task, hire, email_draft, etc.) terminate and return.
  for (let iter = 0; iter < MAX_AGENT_ITERATIONS; iter++) {
    const llmRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: conversation,
        tools: TOOLS,
        tool_choice: "auto",
        max_tokens: 700,
        temperature: 0.7,
      }),
    });

    if (!llmRes.ok) {
      const text = await llmRes.text();
      return NextResponse.json({ error: `DeepSeek error: ${llmRes.status} ${text}` }, { status: 502 });
    }
    const data = await llmRes.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) return NextResponse.json({ content: "（无回复）" });

    const toolCalls = msg.tool_calls ?? [];

    // Final assistant message (no more tools)
    if (toolCalls.length === 0) {
      return NextResponse.json({ content: msg.content ?? "（无回复）" });
    }

    const call = toolCalls[0];
    const fnName: string = call.function?.name ?? "";

    // Read tools — feed result back, continue loop
    if (READ_TOOLS.has(fnName)) {
      let readArgs: Record<string, unknown> = {};
      try { readArgs = JSON.parse(call.function.arguments); } catch {}
      const result = await executeReadTool(fnName, readArgs);
      conversation.push(msg);
      conversation.push({ role: "tool", tool_call_id: call.id, content: result });
      continue;
    }

    // Action tools — parse args, dispatch, terminate
    let args: Record<string, unknown> = {};
    try { args = JSON.parse(call.function.arguments); } catch {}

    if (fnName === "create_task") {
      const a = args as { title: string; prompt: string; specialist: string; reply: string };
      const assignmentId = await createAssignment(a.title, a.prompt, a.specialist);
      const statusNote = assignmentId ? "" : "（任务排队失败，请检查数据库）";
      if (assignmentId) {
        // Auto-memorize delegation as a decision
        writeMemory({
          kind: "decision",
          content: `派给 ${a.specialist}：${a.title}`,
          tags: ["delegation", a.specialist.toLowerCase()],
          source: "auto_decision",
          ref_id: assignmentId,
        }).catch(() => {});
      }
      return NextResponse.json({ content: a.reply + statusNote, delegated: true });
    }

    if (fnName === "clear_chat") {
      const a = args as { reply: string };
      return NextResponse.json({
        content: a.reply || "好的，清空对话。",
        action: "clear_chat",
      });
    }

    if (fnName === "compact_chat") {
      const a = args as { keep?: number; reply: string };
      const keep = Math.max(1, Math.min(200, a.keep ?? 20));
      return NextResponse.json({
        content: a.reply || `好的，保留最近 ${keep} 条。`,
        action: "compact_chat",
        keep,
      });
    }

    if (fnName === "hire_agent") {
      const a = args as { name: string; role: string; system_prompt: string; monthly_budget?: number; reply: string };
      const created = await hireAgent({
        name: a.name, role: a.role,
        system_prompt: a.system_prompt,
        monthly_budget: typeof a.monthly_budget === "number" && a.monthly_budget >= 0 ? a.monthly_budget : 50,
      });
      if (!created) {
        return NextResponse.json({ content: "雇人失败（数据库错误），请稍后再试。" });
      }
      writeMemory({
        kind: "decision",
        content: `雇了 ${created.name}（${created.role}），月预算 $${(a.monthly_budget ?? 50).toFixed(2)}`,
        tags: ["hire", "team"],
        source: "auto_hire",
        ref_id: created.id,
      }).catch(() => {});
      return NextResponse.json({
        content: `${a.reply}\n\n👤 **${created.name}** · ${created.role}  入职。月预算 \$${(a.monthly_budget ?? 50).toFixed(2)}。\n\n你可以在「团队」页找到 ${created.name}，进入员工详情可以继续调整角色设定、加预算、生成节点令牌。`,
        hired: true,
        agentId: created.id,
      });
    }

    if (fnName === "start_meeting") {
      const a = args as { topic: string; agenda?: string; participants: string[]; reply: string };
      // Resolve participant names to ids
      const SPEC_IDS: Record<string, string> = {
        Atlas: "00000000-0000-0000-0001-000000000001",
        Nova: "00000000-0000-0000-0001-000000000002",
        Ledger: "00000000-0000-0000-0001-000000000003",
        Quill: "00000000-0000-0000-0001-000000000004",
        Scheduler: "00000000-0000-0000-0001-000000000005",
        Beacon: "00000000-0000-0000-0001-000000000006",
        邮件秘书: "00000000-0000-0000-0001-000000000010",
        Mailroom: "00000000-0000-0000-0001-000000000010",
      };
      const snap = await getWorkspaceSnapshot();
      const ids: string[] = [];
      const missing: string[] = [];
      for (const name of a.participants) {
        const id = SPEC_IDS[name] ?? snap?.team.find(t => t.name === name)?.id;
        if (id) ids.push(id); else missing.push(name);
      }
      if (ids.length === 0) {
        return NextResponse.json({ content: `没找到参与者：${a.participants.join(", ")}` });
      }
      const m = await createMeeting({
        topic: a.topic,
        agenda: a.agenda,
        initiator_kind: "ceo",
        participant_agent_ids: ids,
        auto_approve: true,
      });
      if (!m) return NextResponse.json({ content: "创建会议失败。" });
      writeMemory({
        kind: "decision",
        content: `召开会议「${a.topic}」，参与：${a.participants.join("、")}`,
        tags: ["meeting"],
        source: "auto_decision",
        ref_id: m.id,
      }).catch(() => {});
      const missingNote = missing.length > 0 ? `\n（没找到：${missing.join(", ")}）` : "";
      return NextResponse.json({
        content: `${a.reply}\n\n🏛️ 会议「${a.topic}」已开\n参与：${a.participants.filter(p => !missing.includes(p)).join("、")}\n[进入会议室 →](/meeting/${m.id})${missingNote}`,
        meetingStarted: true,
        meetingId: m.id,
      });
    }

    if (fnName === "schedule_task") {
      const a = args as { name: string; specialist: string; cron_expr: string; title_template: string; prompt_template: string; reply: string };
      // Resolve specialist name to agent id (specialist field can be a built-in name or hired agent name)
      const SPECIALIST_IDS_LOCAL: Record<string, string> = {
        Atlas: "00000000-0000-0000-0001-000000000001",
        Nova: "00000000-0000-0000-0001-000000000002",
        Ledger: "00000000-0000-0000-0001-000000000003",
        Quill: "00000000-0000-0000-0001-000000000004",
        Scheduler: "00000000-0000-0000-0001-000000000005",
        Beacon: "00000000-0000-0000-0001-000000000006",
        邮件秘书: "00000000-0000-0000-0001-000000000010",
        Mailroom: "00000000-0000-0000-0001-000000000010",
      };
      let agentId: string | null = SPECIALIST_IDS_LOCAL[a.specialist] ?? null;
      if (!agentId) {
        // Look up by name in DB
        const snap = await getWorkspaceSnapshot();
        const match = snap?.team.find(t => t.name === a.specialist);
        agentId = match?.id ?? null;
      }
      if (!agentId) {
        return NextResponse.json({ content: `找不到员工『${a.specialist}』，请检查名字。` });
      }
      const next = computeNextRun(a.cron_expr, new Date());
      if (!next) {
        return NextResponse.json({ content: `cron 表达式无效或已过期：\`${a.cron_expr}\`` });
      }
      const sched = await createSchedule({
        name: a.name,
        assigned_to_agent_id: agentId,
        cron_expr: a.cron_expr,
        title_template: a.title_template,
        prompt_template: a.prompt_template,
        next_run_at: next,
      });
      if (!sched) {
        return NextResponse.json({ content: "创建 schedule 失败（数据库错误）。" });
      }
      writeMemory({
        kind: "decision",
        content: `设了定时任务『${a.name}』派给 ${a.specialist}：${describeCron(a.cron_expr)}`,
        tags: ["schedule"],
        source: "auto_decision",
        ref_id: sched.id,
      }).catch(() => {});
      const nextStr = next.toLocaleString("zh-CN", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
      return NextResponse.json({
        content: `${a.reply}\n\n⏰ **${a.name}**\n${describeCron(a.cron_expr)} · 派给 ${a.specialist}\n下次：${nextStr}`,
        scheduled: true,
        scheduleId: sched.id,
      });
    }

    if (fnName === "remember") {
      const a = args as { kind: "decision"|"fact"|"note"|"summary"; content: string; tags?: string[]; reply: string };
      const saved = await writeMemory({
        kind: a.kind, content: a.content,
        tags: Array.isArray(a.tags) ? a.tags : [],
        source: "llm_remember",
      });
      if (!saved) return NextResponse.json({ content: `${a.reply}\n\n⚠️ 记忆写入失败` });
      const kindLabel = { decision: "决策", fact: "事实", note: "笔记", summary: "总结" }[a.kind];
      return NextResponse.json({
        content: `${a.reply}\n\n🧠 已记入长期记忆（${kindLabel}）`,
        remembered: true,
      });
    }

    if (fnName === "create_skill") {
      const a = args as { name: string; description: string; body: string; tags?: string[]; reply: string };
      const created = await createCeoSkill({
        name: a.name, description: a.description, body: a.body,
        tags: Array.isArray(a.tags) ? a.tags : [],
      });
      if (!created) {
        return NextResponse.json({
          content: `${a.reply}\n\n⚠️ 沉淀失败（可能名字已存在）。换个名字再试，或在 CEO 配置 → 高级设置里删了再重做。`,
        });
      }
      const preview = a.body.slice(0, 140).replace(/\n/g, " ");
      return NextResponse.json({
        content: `${a.reply}\n\n📚 **${a.name}** 已沉淀\n${a.description}\n\n_预览：${preview}${a.body.length > 140 ? "…" : ""}_\n\n在 CEO 配置（👑）→ 高级设置 里查看全文 / 启用禁用 / 删除。`,
        skillCreated: true,
        skillId: created.id,
      });
    }

    if (fnName === "dismiss_agent") {
      const a = args as { agent_id: string; reply: string };
      const r = await dismissAgent(a.agent_id);
      if (!r.ok) {
        if (r.reason === "system_agent") return NextResponse.json({ content: "系统员工不能解雇。" });
        if (r.reason === "not_found") return NextResponse.json({ content: "找不到这个员工。" });
        return NextResponse.json({ content: "解雇失败。" });
      }
      return NextResponse.json({
        content: `${a.reply}\n\n员工已归档。取消了 ${r.cancelled} 项进行中的任务，对外连接已撤销。`,
        dismissed: true,
      });
    }

    if (fnName === "email_draft") {
      const a = args as { to: string; subject: string; body: string; cc?: string; reply: string };
      const gmail = await loadGmailConfig();
      if (!gmail) {
        return NextResponse.json({
          content: "Gmail 还没连接 — 在 CEO 配置（👑）→ 外部接入 里点连接 Gmail 后再试。",
        });
      }
      const res = await createGmailDraft({ to: a.to, subject: a.subject, body: a.body, cc: a.cc });
      if (!res) {
        return NextResponse.json({
          content: (a.reply || "起草中…") + "\n\n⚠️ 创建草稿失败（可能令牌过期，请重新连接 Gmail）。",
        });
      }
      const gmailUrl = `https://mail.google.com/mail/u/0/#drafts/${res.draftId}`;
      return NextResponse.json({
        content: `${a.reply}\n\n📧 草稿已起好（**未发送**）\n收件：${a.to}\n主题：${a.subject}\n\n[在 Gmail 里查看 / 修改 / 发送 →](${gmailUrl})`,
        emailDraft: { to: a.to, subject: a.subject, gmailUrl, draftId: res.draftId },
      });
    }

    if (fnName === "email_scan") {
      const a = args as { query?: string; reply: string };
      const gmail = await loadGmailConfig();
      if (!gmail) {
        return NextResponse.json({
          content: "Gmail 还没连接 — 在 CEO 配置（👑）→ 外部接入 里点连接 Gmail 后再试。",
        });
      }
      const items = await gmailSearchImportant(a.query);
      if (items.length === 0) {
        return NextResponse.json({
          content: `${a.reply}\n\n收件箱里没找到符合条件的重要邮件（最近 14 天内）。`,
        });
      }
      const lines = items.slice(0, 8).map((m, i) => {
        const fromShort = (m.from ?? "").replace(/<.*>/, "").trim().slice(0, 30);
        const dateShort = m.date ? new Date(m.date).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) : "";
        return `${i + 1}. **${m.subject ?? "(无主题)"}**\n   ${fromShort} · ${dateShort}\n   ${m.snippet.slice(0, 120)}`;
      });
      return NextResponse.json({
        content: `${a.reply}\n\n${lines.join("\n\n")}`,
        emailScan: { count: items.length },
      });
    }

    // Unknown tool name — break the loop
    return NextResponse.json({ content: `（未知工具调用 ${fnName}）` });
  }

  // Hit max iterations — shouldn't normally happen
  return NextResponse.json({ content: "请求处理步数已用完，请简化提问后再试。" });
}
