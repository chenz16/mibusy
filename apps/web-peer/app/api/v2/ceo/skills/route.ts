import { NextRequest, NextResponse } from "next/server";
import { listCeoSkills, createCeoSkill } from "../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listCeoSkills());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const skillBody = typeof body.body === "string" ? body.body : "";
  if (!name || !description || !skillBody) {
    return NextResponse.json({ error: "name, description, body required" }, { status: 400 });
  }
  const row = await createCeoSkill({
    name, description, body: skillBody,
    tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : [],
  });
  if (!row) return NextResponse.json({ error: "Create failed (name conflict?)" }, { status: 503 });
  return NextResponse.json(row, { status: 201 });
}
