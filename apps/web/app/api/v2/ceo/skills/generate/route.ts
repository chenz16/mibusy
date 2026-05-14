import { NextRequest, NextResponse } from "next/server";
import { createCeoSkill } from "../../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

const TOOL = {
  type: "function" as const,
  function: {
    name: "create_skill",
    description: "根据 CEO 描述生成完整的 skill 档案。",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "skill 简短名字，2-8 字符，中文优先（如『周报模板』『冷邮件框架』『谈判话术』）" },
        description: { type: "string", description: "一句话描述用途，20 字内" },
        body: { type: "string", description: "skill 主体：100-400 字的实际 prompt / recipe / 模板内容。员工执行任务时会注入这段。要够具体、可直接用。" },
        tags: { type: "array", items: { type: "string" }, description: "可选标签，如 ['邮件','客户','谈判']" },
      },
      required: ["name", "description", "body"],
    },
  },
};

const SYSTEM = `你是 CEO 的助理。CEO 给你一句话描述他想沉淀的 skill（一个可复用的 prompt / 模板 / 方法论），你**必须立即**用 create_skill 工具生成完整档案。

skill 是公司层面的可复用能力 — 所有员工默认继承。常见类型：
- 模板（周报/月报/OKR/邮件模板）
- 方法论（产品决策框架、面试评估表、谈判话术）
- 风格规范（品牌语调、合同语言）
- 检查清单（发布前 checklist、合同审核要点）

不要追着 CEO 问细节 — 凭你的理解写一份**马上能用**的具体内容。`;

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
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "create_skill" } },
      max_tokens: 1000,
      temperature: 0.6,
    }),
  });
  if (!llmRes.ok) {
    return NextResponse.json({ error: `LLM error: ${llmRes.status}` }, { status: 502 });
  }
  const data = await llmRes.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return NextResponse.json({ error: "LLM did not return tool call" }, { status: 502 });
  let parsed: { name: string; description: string; body: string; tags?: string[] };
  try { parsed = JSON.parse(call.function.arguments); } catch {
    return NextResponse.json({ error: "Invalid LLM JSON" }, { status: 502 });
  }

  const created = await createCeoSkill({
    name: parsed.name,
    description: parsed.description,
    body: parsed.body,
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
  });
  if (!created) return NextResponse.json({ error: "DB write failed (name conflict?)" }, { status: 503 });
  return NextResponse.json(created);
}
