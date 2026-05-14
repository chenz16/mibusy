import { NextResponse } from "next/server";
import { tickSchedules } from "../../../../lib/v2-data";

export const dynamic = "force-dynamic";

// Fires due schedules. Designed to be called every minute by:
//   - system cron: * * * * * curl -fsS -X POST http://localhost:3000/api/v2/tick
//   - or the TodayPage frontend (fallback in dev)
export async function POST() {
  const r = await tickSchedules();
  return NextResponse.json(r);
}

export async function GET() {
  // Convenience for quick browser test
  const r = await tickSchedules();
  return NextResponse.json(r);
}
