import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

import { withDb } from "../../../../lib/db";

type InvitationRow = {
  code: string;
  platform_role: "admin" | "friend";
};

type BootstrapBody = {
  email?: unknown;
  userId?: unknown;
};

function readCookie(request: NextRequest, name: string) {
  return request.cookies.get(name)?.value ?? null;
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
}

function normalizeUserId(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return randomUUID();
  }
  return value;
}

export const dynamic = "force-dynamic";

function clearInviteCookie(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const secure = request.nextUrl.protocol === "https:" || forwardedProto === "https";
  const attributes = [
    "pending_invite=",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Path=/",
  ];
  if (secure) attributes.splice(2, 0, "Secure");
  return attributes.join("; ");
}

export async function POST(request: NextRequest) {
  let body: BootstrapBody;
  try {
    body = (await request.json()) as BootstrapBody;
  } catch {
    return Response.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return Response.json({ ok: false, reason: "invalid_email" }, { status: 400 });
  }

  const inviteCode = readCookie(request, "pending_invite");
  if (!inviteCode) {
    return Response.json({ ok: false, reason: "missing_invite_cookie" }, { status: 400 });
  }

  const userId = normalizeUserId(body.userId);

  try {
    const result = await withDb(async (client) => {
      await client.query("BEGIN");
      try {
        const inviteResult = await client.query<InvitationRow>(
          `
            SELECT code, platform_role
            FROM invitations
            WHERE code = $1
              AND consumed_at IS NULL
              AND expires_at > NOW()
              AND (invitee_email IS NULL OR lower(invitee_email) = lower($2))
            FOR UPDATE
          `,
          [inviteCode, email],
        );

        const invite = inviteResult.rows[0];
        if (!invite) {
          await client.query("ROLLBACK");
          return { ok: false as const, status: 400, reason: "invalid_or_expired_invite" };
        }

        const tenantId = randomUUID();
        await client.query("INSERT INTO tenants(id, name) VALUES ($1, $2)", [
          tenantId,
          `${email.split("@")[0]} bootstrap`,
        ]);
        await client.query(
          `
            INSERT INTO users(id, tenant_id, email, role, platform_role)
            VALUES ($1, $2, $3, 'owner', $4)
          `,
          [userId, tenantId, email, invite.platform_role],
        );
        await client.query(
          `
            UPDATE invitations
            SET consumed_at = NOW(), consumed_by_user_id = $1
            WHERE code = $2
          `,
          [userId, inviteCode],
        );
        await client.query("COMMIT");
        return {
          ok: true as const,
          status: 200,
          tenantId,
          userId,
          platformRole: invite.platform_role,
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });

    if (!result.ok) {
      return Response.json({ ok: false, reason: result.reason }, { status: result.status });
    }

    const response = Response.json({
      ok: true,
      tenantId: result.tenantId,
      userId: result.userId,
      platformRole: result.platformRole,
    });
    response.headers.append("Set-Cookie", clearInviteCookie(request));
    return response;
  } catch (error) {
    return Response.json(
      { ok: false, reason: "server_error", detail: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
