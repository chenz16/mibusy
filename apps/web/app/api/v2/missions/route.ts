import { NextResponse } from "next/server";
import { getMissions } from "../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const missions = await getMissions();
  return NextResponse.json(missions);
}
