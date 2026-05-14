import { NextRequest, NextResponse } from "next/server";

import { getAgentByWorkToken, completeWorkerAssignment } from "../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = body?.token ?? req.nextUrl.searchParams.get("token");
  const { assignment_id, title, body: delivBody } = body ?? {};
  if (!token || !assignment_id || !delivBody) {
    return NextResponse.json({ error: "token, assignment_id, and body required" }, { status: 400 });
  }

  const agent = await getAgentByWorkToken(token);
  if (!agent) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const ok = await completeWorkerAssignment(token, {
    assignment_id,
    title: title ?? "交付物",
    body: delivBody,
  });
  if (!ok) return NextResponse.json({ error: "failed to submit" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
