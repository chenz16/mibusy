import { NextRequest, NextResponse } from "next/server";

import { getStaff } from "../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const staff = await getStaff();
  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  let body: { name?: string; role?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const role = (body.role ?? "").trim();
  const kind = body.kind === "chief_of_staff" ? "chief_of_staff" : "specialist";

  if (!name || !role) {
    return NextResponse.json({ error: "name and role are required" }, { status: 422 });
  }

  try {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const result = await client.query(
        `INSERT INTO virtual_agents (workspace_id, desk_id, name, role, kind, status)
         VALUES (
           '00000000-0000-0000-0000-000000000001',
           '00000000-0000-0000-0000-000000000001',
           $1, $2, $3, 'active'
         )
         RETURNING id::text, name, role, kind, status`,
        [name, role, kind],
      );
      return NextResponse.json(result.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("recruit error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
