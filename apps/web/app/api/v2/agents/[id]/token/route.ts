import { NextRequest, NextResponse } from "next/server";

import { generateWorkToken, getAgentTokenInfo } from "../../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = await generateWorkToken(id);
  if (!token) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  return NextResponse.json({ token });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const info = await getAgentTokenInfo(id);
  if (!info) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(info);
}
