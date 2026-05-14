import { NextRequest, NextResponse } from "next/server";
import { updateCeoSkill, deleteCeoSkill } from "../../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const fields: { name?: string; description?: string; body?: string; enabled?: boolean } = {};
  if (typeof body.name === "string") fields.name = body.name;
  if (typeof body.description === "string") fields.description = body.description;
  if (typeof body.body === "string") fields.body = body.body;
  if (typeof body.enabled === "boolean") fields.enabled = body.enabled;
  const ok = await updateCeoSkill(id, fields);
  if (!ok) return NextResponse.json({ error: "Update failed" }, { status: 503 });
  return NextResponse.json({ id, updated: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteCeoSkill(id);
  if (!ok) return NextResponse.json({ error: "Delete failed" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
