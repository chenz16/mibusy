import { NextRequest, NextResponse } from "next/server";
import { createGmailDraft } from "../../../../../lib/gmail";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text = typeof body.body === "string" ? body.body : "";
  const cc = typeof body.cc === "string" ? body.cc : undefined;
  if (!to || !subject || !text) {
    return NextResponse.json({ error: "to, subject, body required" }, { status: 400 });
  }
  const res = await createGmailDraft({ to, subject, body: text, cc });
  if (!res) return NextResponse.json({ error: "Gmail draft failed (not connected or token expired)" }, { status: 503 });
  return NextResponse.json({ ...res, gmailUrl: `https://mail.google.com/mail/u/0/#drafts/${res.draftId}` });
}
