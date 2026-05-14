import { NextRequest, NextResponse } from "next/server";
import { deleteCeoIntegration } from "../../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteCeoIntegration(id);
  if (!ok) return NextResponse.json({ error: "Delete failed" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
