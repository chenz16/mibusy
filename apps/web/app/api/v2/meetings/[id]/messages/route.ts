import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { getMeetingDetail, getMeetingMessages, postMeetingMessage } from "../../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

const DATABASE_URL = process.env.DATABASE_URL;

// CEO posts a message into the meeting; optionally triggers all agent
// participants to respond in sequence.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const content = typeof body.content === "string" ? body.content.trim() : "";
  const senderKind = body.sender_kind === "agent" || body.sender_kind === "system" ? body.sender_kind : "ceo";
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

  const msg = await postMeetingMessage({
    meeting_id: id,
    sender_kind: senderKind,
    sender_agent_id: typeof body.sender_agent_id === "string" ? body.sender_agent_id : undefined,
    content,
  });
  if (!msg) return NextResponse.json({ error: "post failed" }, { status: 503 });

  // If CEO message, optionally auto-trigger each agent to respond.
  // Controlled by body.broadcast (default true for CEO).
  const broadcast = body.broadcast !== false && senderKind === "ceo";
  if (broadcast) {
    // Fire-and-forget agent responses sequentially. Do not block CEO's POST.
    triggerAgentResponses(id).catch(() => {});
  }

  return NextResponse.json(msg, { status: 201 });
}

async function fetchAgent(agentId: string): Promise<{ id: string; name: string; role: string; system_prompt: string | null } | null> {
  if (!DATABASE_URL) return null;
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    const r = await client.query<{ id: string; name: string; role: string; system_prompt: string | null }>(
      `SELECT id::text, name, role, system_prompt FROM virtual_agents WHERE id = $1::uuid`,
      [agentId],
    );
    return r.rows[0] ?? null;
  } finally { await client.end().catch(() => {}); }
}

async function triggerAgentResponses(meetingId: string) {
  const meeting = await getMeetingDetail(meetingId);
  if (!meeting || meeting.status !== "in_session") return;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return;

  for (const agentId of meeting.participant_agent_ids) {
    const agent = await fetchAgent(agentId);
    if (!agent) continue;

    // Fetch latest history each loop
    const history = await getMeetingMessages(meetingId);

    const sys = [
      `你是 ${agent.name}（${agent.role}），CEO 公司的员工。`,
      agent.system_prompt ?? "",
      `\n你正在参加一场内部会议。`,
      `主题：${meeting.topic}`,
      meeting.agenda ? `议程：${meeting.agenda}` : "",
      meeting.complexity_reason ? `召开原因：${meeting.complexity_reason}` : "",
      `\n会议规则：`,
      `- 直接对最近一条消息做出回应，简洁实质`,
      `- 严格保持角色：用你自己的工作风格、专业角度发言`,
      `- 80-200 字以内，不要长篇大论`,
      `- 不要重复别人刚说过的话，要推进讨论`,
      `- 如果你已经表态过且没新信息，可以直接说"没新看法"或保持沉默（输出 "[PASS]" 表示）`,
    ].join("\n");

    // Map all prior messages into chat format for the LLM
    const chatMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: sys },
    ];
    for (const m of history) {
      const isMine = m.sender_kind === "agent" && m.sender_agent_id === agentId;
      if (isMine) {
        chatMessages.push({ role: "assistant", content: m.content });
      } else {
        const speaker = m.sender_kind === "ceo" ? "CEO" : (m.sender_agent_name ?? "其他人");
        chatMessages.push({ role: "user", content: `[${speaker}]: ${m.content}` });
      }
    }
    chatMessages.push({ role: "user", content: `请基于以上讨论，${agent.name} 你发言：` });

    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: chatMessages,
          max_tokens: 350,
          temperature: 0.7,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text: string = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (!text || text.includes("[PASS]")) continue;

      await postMeetingMessage({
        meeting_id: meetingId,
        sender_kind: "agent",
        sender_agent_id: agentId,
        content: text,
      });
    } catch {
      // skip this agent's turn on failure
    }
  }
}
