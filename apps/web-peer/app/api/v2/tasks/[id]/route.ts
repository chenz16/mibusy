import { NextRequest, NextResponse } from "next/server";
import { getTaskDetail, archiveTask } from "../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getTaskDetail(id);
  if (!detail) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (body?.action === "archive") {
    const r = await archiveTask(id);
    if (!r.ok) return NextResponse.json({ error: "archive failed" }, { status: 503 });
    return NextResponse.json({ id, archived: true, cancelled: r.cancelled });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
