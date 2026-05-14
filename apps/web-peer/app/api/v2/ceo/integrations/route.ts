import { NextRequest, NextResponse } from "next/server";
import { listCeoIntegrations, createCeoIntegration } from "../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await listCeoIntegrations();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const kind = typeof body.kind === "string" ? body.kind.trim() : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!kind || !label) return NextResponse.json({ error: "kind, label required" }, { status: 400 });

  const config = body.config && typeof body.config === "object" ? body.config : {};
  const row = await createCeoIntegration({ kind, label, config });
  if (!row) return NextResponse.json({ error: "Create failed" }, { status: 503 });
  return NextResponse.json(row, { status: 201 });
}
