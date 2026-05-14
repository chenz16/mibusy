import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { completePeerAssignment } from "../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

// Peer callback: downstream told us they finished a task we dispatched.
// Protocol: `peer_origin_id` is the originator's id, which for the callback
// from B → A is A's local assignment id (= B's mission's peer_origin_id field).
//
// Body: {
//   peer_origin_id: <A's local assignment id>,
//   peer_token: <B's token, which A's connection.peer_token matches>,
//   deliverable_title, deliverable_body
// }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const localAssignmentId = typeof body.peer_origin_id === "string" ? body.peer_origin_id : "";
  const peerToken = typeof body.peer_token === "string" ? body.peer_token : "";
  const title = typeof body.deliverable_title === "string" ? body.deliverable_title.trim() : "";
  const reportBody = typeof body.deliverable_body === "string" ? body.deliverable_body : "";

  if (!localAssignmentId || !peerToken || !reportBody) {
    return NextResponse.json({ error: "peer_origin_id, peer_token, deliverable_body required" }, { status: 400 });
  }

  // Validate peer_token: the assignment's peer_connection should have a
  // peer_token that matches what the callback presents.
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  let tokenOk = false;
  let found = false;
  try {
    const r = await client.query<{ peer_token: string | null }>(
      `SELECT c.peer_token::text
       FROM assignments a
       JOIN agent_connections c ON a.peer_connection_id = c.id
       WHERE a.id = $1::uuid`,
      [localAssignmentId],
    );
    if (r.rows.length > 0) {
      found = true;
      tokenOk = r.rows[0].peer_token === peerToken;
    }
  } finally {
    await client.end();
  }
  if (!found) return NextResponse.json({ error: "no matching local assignment" }, { status: 404 });
  if (!tokenOk) return NextResponse.json({ error: "Invalid peer_token" }, { status: 401 });

  const ok = await completePeerAssignment({
    assignment_id: localAssignmentId,
    deliverable_title: title || "Peer 交付",
    deliverable_body: reportBody,
  });
  if (!ok) return NextResponse.json({ error: "complete failed" }, { status: 503 });

  return NextResponse.json({ ok: true, local_assignment_id: localAssignmentId });
}
