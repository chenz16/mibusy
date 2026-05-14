import { NextRequest, NextResponse } from "next/server";

import { getAgentDetail, updateAgent, dismissAgent } from "../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getAgentDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Agent not found or DB unavailable" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const fields: { system_prompt?: string; role?: string; proxy_agent_id?: string | null; monthly_budget?: number | null } = {};
  if (typeof body.system_prompt === "string") fields.system_prompt = body.system_prompt;
  if (typeof body.role === "string") fields.role = body.role;
  if ("proxy_agent_id" in body) fields.proxy_agent_id = body.proxy_agent_id ?? null;
  if ("monthly_budget" in body) {
    const n = typeof body.monthly_budget === "number" ? body.monthly_budget : null;
    fields.monthly_budget = n != null && Number.isFinite(n) && n >= 0 ? n : null;
  }

  const ok = await updateAgent(id, fields);
  if (!ok) return NextResponse.json({ error: "DB unavailable or update failed" }, { status: 503 });
  return NextResponse.json({ id, updated: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await dismissAgent(id);
  if (!result.ok) {
    if (result.reason === "system_agent") {
      return NextResponse.json({ error: "系统员工不能解雇" }, { status: 403 });
    }
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "员工不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "解雇失败" }, { status: 503 });
  }
  return NextResponse.json({ id, dismissed: true, cancelledAssignments: result.cancelled });
}
