import { NextResponse } from "next/server";
import { buildAuthorizeUrl, getOAuthEnv } from "../../../../../../lib/gmail";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getOAuthEnv();
  if (!env) {
    return NextResponse.json({
      error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in apps/web/.env.local",
    }, { status: 503 });
  }
  const state = crypto.randomUUID();
  const url = buildAuthorizeUrl(state);
  if (!url) return NextResponse.json({ error: "Failed to build URL" }, { status: 500 });
  return NextResponse.redirect(url);
}
