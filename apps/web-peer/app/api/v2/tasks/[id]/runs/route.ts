import { NextRequest, NextResponse } from "next/server";
import { createTaskRun } from "../../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!title || !prompt) return NextResponse.json({ error: "title, prompt required" }, { status: 400 });
  const created = await createTaskRun(id, { title, prompt });
  if (!created) return NextResponse.json({ error: "create failed" }, { status: 503 });
  return NextResponse.json(created, { status: 201 });
}
