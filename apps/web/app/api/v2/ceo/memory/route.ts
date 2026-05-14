import { NextRequest, NextResponse } from "next/server";
import { listRecentMemory, searchMemory, writeMemory } from "../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);
  if (q) return NextResponse.json(await searchMemory(q, limit));
  return NextResponse.json(await listRecentMemory(limit));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const kind = body.kind;
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!["decision","fact","note","summary"].includes(kind)) {
    return NextResponse.json({ error: "kind required" }, { status: 400 });
  }
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });
  const row = await writeMemory({
    kind, content,
    tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : [],
    source: "manual",
  });
  if (!row) return NextResponse.json({ error: "Write failed" }, { status: 503 });
  return NextResponse.json(row, { status: 201 });
}
