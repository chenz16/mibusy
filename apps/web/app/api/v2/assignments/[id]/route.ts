import { NextRequest, NextResponse } from "next/server";

import { updateAssignmentStatus, deleteAssignment, getAssignmentWithDeliverable } from "../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const assignment = await getAssignmentWithDeliverable(id);
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(assignment);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const status = body?.status;

  if (status !== "completed" && status !== "cancelled") {
    return NextResponse.json({ error: "status must be completed or cancelled" }, { status: 400 });
  }

  const ok = await updateAssignmentStatus(id, status);
  if (!ok) {
    return NextResponse.json({ error: "DB unavailable or update failed" }, { status: 503 });
  }
  return NextResponse.json({ id, status });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteAssignment(id);
  if (!ok) return NextResponse.json({ error: "DB unavailable or not found" }, { status: 503 });
  return NextResponse.json({ id, deleted: true });
}
