import { NextRequest, NextResponse } from "next/server";
import { deleteAgentConnection } from "../../../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; connId: string }> },
) {
  const { connId } = await params;
  const ok = await deleteAgentConnection(connId);
  if (!ok) return NextResponse.json({ error: "Delete failed" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
