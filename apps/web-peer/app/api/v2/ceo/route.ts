import { NextRequest, NextResponse } from "next/server";
import { getCeoProfile, updateCeoProfile, generateUpstreamToken } from "../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getCeoProfile();
  if (!profile) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  return NextResponse.json(profile);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const fields: { name?: string; role?: string; system_prompt?: string; upstream_name?: string | null; monthly_budget?: number | null; workspace_dir?: string | null } = {};
  if (typeof body.name === "string") fields.name = body.name;
  if (typeof body.role === "string") fields.role = body.role;
  if (typeof body.system_prompt === "string") fields.system_prompt = body.system_prompt;
  if ("upstream_name" in body) fields.upstream_name = body.upstream_name ?? null;
  if ("monthly_budget" in body) {
    const n = typeof body.monthly_budget === "number" ? body.monthly_budget : null;
    fields.monthly_budget = n != null && Number.isFinite(n) && n >= 0 ? n : null;
  }
  if ("workspace_dir" in body) {
    const v = typeof body.workspace_dir === "string" ? body.workspace_dir.trim() : "";
    fields.workspace_dir = v ? v : null;
  }

  const ok = await updateCeoProfile(fields);
  if (!ok) return NextResponse.json({ error: "Update failed" }, { status: 503 });
  return NextResponse.json({ updated: true });
}

export async function POST() {
  // Generate / rotate the upstream token
  const token = await generateUpstreamToken();
  if (!token) return NextResponse.json({ error: "Generate failed" }, { status: 503 });
  return NextResponse.json({ upstream_token: token });
}
