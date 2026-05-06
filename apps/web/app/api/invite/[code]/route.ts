import { NextRequest } from "next/server";

import { withDb } from "../../../../lib/db";

type InviteRow = {
  code: string;
  invitee_email: string | null;
  platform_role: "admin" | "friend";
  expires_at: Date;
};

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  try {
    const invite = await withDb(async (client) => {
      const result = await client.query<InviteRow>(
        `
          SELECT code, invitee_email, platform_role, expires_at
          FROM invitations
          WHERE code = $1
            AND consumed_at IS NULL
            AND expires_at > NOW()
        `,
        [code],
      );
      return result.rows[0] ?? null;
    });

    if (!invite) {
      return Response.json({ ok: false, reason: "invalid_or_expired" }, { status: 404 });
    }

    const response = Response.json({
      ok: true,
      invite: {
        email: invite.invitee_email,
        platformRole: invite.platform_role,
        expiresAt: invite.expires_at.toISOString(),
      },
    });
    response.headers.append(
      "Set-Cookie",
      `pending_invite=${encodeURIComponent(code)}; HttpOnly; Secure; SameSite=Lax; Max-Age=900; Path=/`,
    );
    return response;
  } catch (error) {
    return Response.json(
      { ok: false, reason: "server_error", detail: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}

