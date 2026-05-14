import { NextRequest, NextResponse } from "next/server";

import { createAssignment, getActiveAssignments } from "../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const assignments = await getActiveAssignments();
  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const assignedToAgentId = typeof body?.assigned_to_agent_id === "string" ? body.assigned_to_agent_id : "";
  const originIn = typeof body?.origin === "string" ? body.origin : "ceo";
  const origin = (["ceo", "private_chat", "worker", "system"].includes(originIn) ? originIn : "ceo") as "ceo" | "private_chat" | "worker" | "system";

  if (!title || !prompt || !assignedToAgentId) {
    return NextResponse.json({ error: "title, prompt, assigned_to_agent_id required" }, { status: 400 });
  }

  const result = await createAssignment({ title, prompt, assignedToAgentId, origin });
  if (!result) {
    return NextResponse.json({ error: "DB unavailable — task creation requires a running database" }, { status: 503 });
  }
  return NextResponse.json(result, { status: 201 });
}
