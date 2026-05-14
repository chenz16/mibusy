import { NextRequest, NextResponse } from "next/server";
import { getMeetingDetail, getMeetingMessages, updateMeetingStatus, finalizeMeetingSummary, postMeetingMessage } from "../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const meeting = await getMeetingDetail(id);
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 });
  const messages = await getMeetingMessages(id);
  return NextResponse.json({ meeting, messages });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // Approve a pending meeting → in_session
  if (body.action === "approve") {
    const ok = await updateMeetingStatus(id, "in_session");
    if (ok) {
      await postMeetingMessage({
        meeting_id: id,
        sender_kind: "system",
        content: "CEO 已批准会议，可以开始讨论。",
      });
    }
    return NextResponse.json({ id, status: "in_session", ok });
  }
  // Re-open a summarized/cancelled meeting when the CEO wants another round.
  if (body.action === "reopen") {
    const ok = await updateMeetingStatus(id, "in_session");
    if (ok) {
      await postMeetingMessage({
        meeting_id: id,
        sender_kind: "system",
        content: "CEO 已重新打开会议，可以继续讨论。",
      });
    }
    return NextResponse.json({ id, status: "in_session", ok });
  }
  // Reject → rejected
  if (body.action === "reject") {
    const ok = await updateMeetingStatus(id, "rejected");
    return NextResponse.json({ id, status: "rejected", ok });
  }
  // Cancel
  if (body.action === "cancel") {
    const ok = await updateMeetingStatus(id, "cancelled");
    return NextResponse.json({ id, status: "cancelled", ok });
  }
  // Finalize with summary
  if (body.action === "summarize" && typeof body.summary === "string") {
    const r = await finalizeMeetingSummary(id, body.summary);
    return NextResponse.json({ id, status: "summarized", ...r });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
