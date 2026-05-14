import { NextRequest, NextResponse } from "next/server";
import { getMissionDetail, updateMissionStatus, submitMissionReport } from "../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getMissionDetail(id);
  if (!detail) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // Accept / reject mission
  if (typeof body.status === "string") {
    const status = body.status;
    if (!["queued", "awaiting_input", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const ok = await updateMissionStatus(id, status as "awaiting_input" | "cancelled" | "queued");
    if (!ok) return NextResponse.json({ error: "Update failed" }, { status: 503 });
    return NextResponse.json({ id, status });
  }

  // Submit 述职报告 (also marks completed)
  if (typeof body.report_body === "string") {
    const ok = await submitMissionReport(id, body.report_body);
    if (!ok) return NextResponse.json({ error: "Submit failed" }, { status: 503 });
    return NextResponse.json({ id, submitted: true });
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
}
