import { NextRequest, NextResponse } from "next/server";
import { listAgentTasks } from "../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agent_id");
  if (!agentId) return NextResponse.json({ error: "agent_id required" }, { status: 400 });
  const rows = await listAgentTasks(agentId);
  return NextResponse.json(rows);
}
