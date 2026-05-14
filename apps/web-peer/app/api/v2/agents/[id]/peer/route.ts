import { NextRequest, NextResponse } from "next/server";
import { setAgentPeerConfig, updateAgent } from "../../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

// Configure an agent as a peer facade.
// Body: { peer_url, peer_token, counterparty_label? }
// Also sets agent_mode='facade' atomically.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const peer_url = typeof body.peer_url === "string" ? body.peer_url.trim() : "";
  const peer_token = typeof body.peer_token === "string" ? body.peer_token.trim() : "";
  if (!peer_url || !peer_token) {
    return NextResponse.json({ error: "peer_url + peer_token required" }, { status: 400 });
  }

  const conn = await setAgentPeerConfig({
    agent_id: id,
    peer_url,
    peer_token,
    counterparty_label: typeof body.counterparty_label === "string" ? body.counterparty_label : null,
  });
  if (!conn) return NextResponse.json({ error: "set failed" }, { status: 503 });

  await updateAgent(id, { agent_mode: "facade" });

  return NextResponse.json({ ok: true, connection_id: conn.connection_id });
}

// Revert agent to AI mode (remove peer config)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Set mode back to ai; we keep the connection row history (or could remove)
  const ok = await updateAgent(id, { agent_mode: "ai" });
  return NextResponse.json({ ok });
}
