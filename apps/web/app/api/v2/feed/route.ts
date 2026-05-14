import { NextRequest, NextResponse } from "next/server";
import { getDeliverables, getAwaitingAssignments, getDashboardMetrics, getRunningAssignments, getRecentHandoffs, escalateStaleAssignments } from "../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get("since") ?? undefined;
  const [deliverables, awaiting, metrics, running, handoffs] = await Promise.all([
    getDeliverables(),
    getAwaitingAssignments(),
    getDashboardMetrics(),
    getRunningAssignments(),
    getRecentHandoffs(since),
    escalateStaleAssignments(), // auto-reroute stale tasks to proxy agents
  ]);
  return NextResponse.json({ deliverables, awaiting, metrics, running, handoffs });
}
