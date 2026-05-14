import { NextRequest, NextResponse } from "next/server";

import { getAgentByWorkToken, getWorkerAssignments, updateWorkerHeartbeat } from "../../../../lib/v2-data";

export const dynamic = "force-dynamic";

// GET /api/v2/work?token=xxx — returns next queued assignment for this worker
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const agent = await getAgentByWorkToken(token);
  if (!agent) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  await updateWorkerHeartbeat(token);

  const assignments = await getWorkerAssignments(token);
  const next = assignments.find(a => a.status === "queued") ?? null;

  return NextResponse.json({ agent, next, pending: assignments });
}
