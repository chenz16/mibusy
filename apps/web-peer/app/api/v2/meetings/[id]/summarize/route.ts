import { NextRequest, NextResponse } from "next/server";
import { getMeetingDetail, getMeetingMessages, finalizeMeetingSummary } from "../../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const meeting = await getMeetingDetail(id);
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (meeting.status !== "in_session") {
    return NextResponse.json({ error: "meeting not in session" }, { status: 400 });
  }

  const messages = await getMeetingMessages(id);
  if (messages.length === 0) {
    return NextResponse.json({ error: "no messages to summarize" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured" }, { status: 503 });

  const transcript = messages.map(m => {
    const who = m.sender_kind === "ceo" ? "CEO"
              : m.sender_kind === "system" ? "系统"
              : (m.sender_agent_name ?? "?");
    return `[${who}]: ${m.content}`;
  }).join("\n\n");

  const sys = `你是 CEO 的会议记录员。把刚才的会议讨论压成一份**结构化总结**给会议发起方。

格式（Markdown）：
## 主题
（一句话）

## 关键结论
- 3-5 个 bullet，最重要的决定 / 共识 / 待办

## 重点分歧
- 如果有，列出谁主张什么；没有则写"无"

## 下一步
- 具体行动项：[谁] 做 [什么] [何时前]

不要重复每个人原话，要提炼。300-500 字。`;

  const userMsg = `会议主题：${meeting.topic}
${meeting.agenda ? `议程：${meeting.agenda}` : ""}
${meeting.complexity_reason ? `召开原因：${meeting.complexity_reason}` : ""}

会议记录：
${transcript}`;

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
      max_tokens: 1000,
      temperature: 0.4,
    }),
  });
  if (!res.ok) return NextResponse.json({ error: `LLM error: ${res.status}` }, { status: 502 });
  const data = await res.json();
  const summary: string = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!summary) return NextResponse.json({ error: "empty summary" }, { status: 502 });

  const r = await finalizeMeetingSummary(id, summary);
  if (!r.ok) return NextResponse.json({ error: "finalize failed" }, { status: 503 });

  return NextResponse.json({
    id,
    summary,
    summary_assignment_id: r.summary_assignment_id,
  });
}
