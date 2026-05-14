import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { getMissions } from "../../../../lib/v2-data";

export const dynamic = "force-dynamic";

const CEO_DESK_ID = process.env.MIBUSY_DESK_ID || "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const missions = await getMissions();
  return NextResponse.json(missions);
}

// V3 peer inbound: an upstream Mibusy instance posts a mission here.
// Auth: must include peer_token that matches our desk's upstream_token.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const agenda = typeof body.agenda === "string" ? body.agenda.trim() : "";
  const peerToken = typeof body.peer_token === "string" ? body.peer_token : "";
  const peerOriginId = typeof body.peer_origin_id === "string" ? body.peer_origin_id : null;
  const callbackUrl = typeof body.peer_callback_url === "string" ? body.peer_callback_url : null;

  if (!topic || !peerToken) {
    return NextResponse.json({ error: "topic + peer_token required" }, { status: 400 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    // Validate: our desk's upstream_token must match
    const deskRow = await client.query<{ upstream_token: string | null }>(
      `SELECT upstream_token::text FROM desks WHERE id = $1::uuid`,
      [CEO_DESK_ID],
    );
    const expected = deskRow.rows[0]?.upstream_token;
    if (!expected || expected !== peerToken) {
      return NextResponse.json({ error: "Invalid peer_token" }, { status: 401 });
    }

    // Create an inbound mission with peer linkage
    const r = await client.query<{ id: string }>(
      `INSERT INTO assignments
         (desk_id, title, prompt, status, origin, mission_source, peer_origin_id, budget_limit)
       VALUES ($1::uuid, $2, $3, 'queued', 'inbound', $4, $5::uuid, 5.0)
       RETURNING id::text`,
      [CEO_DESK_ID, topic, agenda || topic, "Peer instance", peerOriginId],
    );
    const localId = r.rows[0]?.id ?? null;
    if (!localId) return NextResponse.json({ error: "create failed" }, { status: 503 });

    // Store callback URL so we can call back on completion. We piggyback on
    // mission_source for now (cleaner schema later).
    if (callbackUrl) {
      await client.query(
        `UPDATE assignments SET mission_source = $1 WHERE id = $2::uuid`,
        [`peer::${callbackUrl}::${peerToken}`, localId],
      );
    }

    return NextResponse.json({ id: localId, status: "queued" }, { status: 201 });
  } finally {
    await client.end();
  }
}
