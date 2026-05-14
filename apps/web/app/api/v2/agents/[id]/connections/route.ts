import { NextRequest, NextResponse } from "next/server";
import { listAgentConnections, createAgentConnection } from "../../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rows = await listAgentConnections(id);
  return NextResponse.json(rows);
}

const ALLOWED_KINDS = ["task", "chat", "event", "decision", "stream"];
const ALLOWED_DIRECTIONS = ["inbound", "outbound", "bidi"];
const ALLOWED_TRANSPORTS = ["poll", "webhook", "slack", "email", "mcp", "peer"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  if (!ALLOWED_KINDS.includes(body.kind)) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  if (!ALLOWED_DIRECTIONS.includes(body.direction)) return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
  if (!ALLOWED_TRANSPORTS.includes(body.transport)) return NextResponse.json({ error: "Invalid transport" }, { status: 400 });

  const row = await createAgentConnection({
    agent_id: id,
    kind: body.kind,
    direction: body.direction,
    transport: body.transport,
    endpoint_url: typeof body.endpoint_url === "string" ? body.endpoint_url : null,
    counterparty_label: typeof body.counterparty_label === "string" ? body.counterparty_label : null,
  });
  if (!row) return NextResponse.json({ error: "Create failed" }, { status: 503 });
  return NextResponse.json(row, { status: 201 });
}
