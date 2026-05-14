import { NextRequest, NextResponse } from "next/server";
import { gmailSearchImportant } from "../../../../../lib/gmail";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const extra = req.nextUrl.searchParams.get("q") ?? undefined;
  const items = await gmailSearchImportant(extra ?? undefined);
  return NextResponse.json(items);
}
