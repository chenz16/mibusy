import { NextResponse } from "next/server";
import { listArchivedAgents } from "../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listArchivedAgents());
}
