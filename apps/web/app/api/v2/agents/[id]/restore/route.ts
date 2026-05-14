import { NextRequest, NextResponse } from "next/server";
import { restoreAgent, purgeArchivedAgent } from "../../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await restoreAgent(id);
  if (!ok) return NextResponse.json({ error: "Restore failed (not archived or not found)" }, { status: 404 });
  return NextResponse.json({ id, restored: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await purgeArchivedAgent(id);
  if (!ok) return NextResponse.json({ error: "Purge failed (not archived or not found)" }, { status: 404 });
  return NextResponse.json({ id, purged: true });
}
