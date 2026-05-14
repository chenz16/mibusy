import { NextRequest, NextResponse } from "next/server";

import { getAgentByWorkToken, updateWorkerHeartbeat } from "../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = body?.token ?? req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const agent = await getAgentByWorkToken(token);
  if (!agent) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  await updateWorkerHeartbeat(token);
  return NextResponse.json({ ok: true, agent: agent.name });
}
