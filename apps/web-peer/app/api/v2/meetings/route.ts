import { NextRequest, NextResponse } from "next/server";
import { listMeetings, createMeeting } from "../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const statusParam = req.nextUrl.searchParams.get("status");
  const filter = statusParam ? statusParam.split(",").filter(Boolean) : undefined;
  return NextResponse.json(await listMeetings(filter));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (!topic) return NextResponse.json({ error: "topic required" }, { status: 400 });
  const participants: string[] = Array.isArray(body.participant_agent_ids)
    ? body.participant_agent_ids.filter((x: unknown) => typeof x === "string")
    : [];
  if (participants.length === 0) {
    return NextResponse.json({ error: "participant_agent_ids required (non-empty)" }, { status: 400 });
  }
  const initiator_kind = ["ceo","agent","system"].includes(body.initiator_kind) ? body.initiator_kind : "ceo";
  const m = await createMeeting({
    topic,
    agenda: typeof body.agenda === "string" ? body.agenda : undefined,
    initiator_kind,
    initiator_agent_id: typeof body.initiator_agent_id === "string" ? body.initiator_agent_id : undefined,
    initiator_assignment_id: typeof body.initiator_assignment_id === "string" ? body.initiator_assignment_id : undefined,
    complexity_reason: typeof body.complexity_reason === "string" ? body.complexity_reason : undefined,
    participant_agent_ids: participants,
    auto_approve: initiator_kind === "ceo" || body.auto_approve === true,
  });
  if (!m) return NextResponse.json({ error: "create failed" }, { status: 503 });
  return NextResponse.json(m, { status: 201 });
}
