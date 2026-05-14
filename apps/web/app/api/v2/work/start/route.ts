import { NextRequest, NextResponse } from "next/server";

import { getAgentByWorkToken, startWorkerAssignment } from "../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = body?.token ?? req.nextUrl.searchParams.get("token");
  const assignmentId = body?.assignment_id;
  if (!token || !assignmentId) return NextResponse.json({ error: "token and assignment_id required" }, { status: 400 });

  const agent = await getAgentByWorkToken(token);
  if (!agent) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const ok = await startWorkerAssignment(token, assignmentId);
  if (!ok) return NextResponse.json({ error: "failed to start" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
