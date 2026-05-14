import { NextRequest, NextResponse } from "next/server";
import { hireAgent } from "../../../../lib/v2-data";

export const dynamic = "force-dynamic";

// LLM-driven hiring: take a one-line description from the CEO and ask
// DeepSeek to fill in name / role / system_prompt / budget via the
// hire_agent tool. The agent is actually created here.

const HIRE_TOOL = {
  type: "function" as const,
  function: {
    name: "hire_agent",
    description: "根据 CEO 给的简短描述，生成一个完整的员工档案并入职。",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "员工名字，2-6 字符。中文优先。" },
        role: { type: "string", description: "职务/头衔" },
        system_prompt: { type: "string", description: "100-300 字的工作风格描述：职责、专长、口吻、汇报方式。" },
        monthly_budget: { type: "number", description: "月预算 USD。高管 100-200，专员 30-80，默认 50。" },
      },
      required: ["name", "role", "system_prompt", "monthly_budget"],
    },
  },
};

const SYSTEM = `你是 CEO 的人事助理。CEO 给你一句话描述他想雇的人，你的任务是**立即**用 hire_agent 工具生成完整的员工档案。

不要追着 CEO 问细节 — 凭你的理解推断：
- name：根据职务推一个合适的中文名（如『市场总监』『陈工』『林姐』），2-6 字符
- role：规范的职务名（如『首席运营官』『品牌内容负责人』）
- system_prompt：100-300 字，描述这个员工是谁、负责什么、擅长什么、汇报口吻
- monthly_budget：根据职务重要程度，30-200 USD

CEO 描述可能很简短（"雇个负责品牌的"），你要自己脑补一个合理的完整画像。

**必须**调用 hire_agent 工具。不要只回复文字。`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const desc = typeof body?.description === "string" ? body.description.trim() : "";
  if (!desc) return NextResponse.json({ error: "description required" }, { status: 400 });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured" }, { status: 503 });

  const llmRes = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: desc },
      ],
      tools: [HIRE_TOOL],
      tool_choice: { type: "function", function: { name: "hire_agent" } },
      max_tokens: 800,
      temperature: 0.6,
    }),
  });

  if (!llmRes.ok) {
    const t = await llmRes.text();
    return NextResponse.json({ error: `LLM error: ${llmRes.status} ${t}` }, { status: 502 });
  }

  const data = await llmRes.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return NextResponse.json({ error: "LLM did not return a tool call" }, { status: 502 });

  let parsed: { name: string; role: string; system_prompt: string; monthly_budget: number };
  try { parsed = JSON.parse(call.function.arguments); } catch {
    return NextResponse.json({ error: "LLM returned invalid JSON" }, { status: 502 });
  }

  const created = await hireAgent({
    name: parsed.name,
    role: parsed.role,
    system_prompt: parsed.system_prompt,
    monthly_budget: typeof parsed.monthly_budget === "number" && parsed.monthly_budget >= 0 ? parsed.monthly_budget : 50,
  });
  if (!created) return NextResponse.json({ error: "DB write failed" }, { status: 503 });

  return NextResponse.json({
    id: created.id,
    name: created.name,
    role: created.role,
    system_prompt: parsed.system_prompt,
    monthly_budget: parsed.monthly_budget,
  });
}
