// Gmail API helpers — OAuth 2.0 + Gmail API (draft-only mode).
//
// Setup steps:
//   1. Google Cloud Console → enable Gmail API
//   2. Create OAuth Client ID (Web application)
//   3. Authorized redirect URI: http://localhost:3000/api/v2/gmail/auth/callback
//   4. Set env vars in apps/web/.env.local:
//        GOOGLE_CLIENT_ID=xxx
//        GOOGLE_CLIENT_SECRET=xxx
//        GOOGLE_OAUTH_REDIRECT=http://localhost:3000/api/v2/gmail/auth/callback
//
// Scopes:
//   gmail.compose  — create drafts (does NOT send)
//   gmail.readonly — read messages

import { Client } from "pg";

const CEO_DESK_ID = "00000000-0000-0000-0000-000000000001";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
  "openid", "email", "profile",
].join(" ");

export type GmailConfig = {
  email: string;
  refresh_token: string;
  access_token?: string;
  expires_at?: number; // unix ms
};

export function getOAuthEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_OAUTH_REDIRECT
    ?? "http://localhost:3000/api/v2/gmail/auth/callback";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirect };
}

export function buildAuthorizeUrl(state: string): string | null {
  const env = getOAuthEnv();
  if (!env) return null;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.clientId);
  url.searchParams.set("redirect_uri", env.redirect);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForTokens(code: string): Promise<{
  refresh_token: string; access_token: string; expires_in: number; id_token: string;
} | null> {
  const env = getOAuthEnv();
  if (!env) return null;
  const body = new URLSearchParams({
    code,
    client_id: env.clientId,
    client_secret: env.clientSecret,
    redirect_uri: env.redirect,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) return null;
  return res.json();
}

export function decodeEmailFromIdToken(idToken: string): string | null {
  try {
    const [, payload] = idToken.split(".");
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof json.email === "string" ? json.email : null;
  } catch { return null; }
}

async function refreshAccessToken(refresh_token: string): Promise<{ access_token: string; expires_in: number } | null> {
  const env = getOAuthEnv();
  if (!env) return null;
  const body = new URLSearchParams({
    refresh_token,
    client_id: env.clientId,
    client_secret: env.clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) return null;
  return res.json();
}

// Load Gmail config from ceo_integrations (the first 'gmail' row)
export async function loadGmailConfig(): Promise<{ id: string; config: GmailConfig } | null> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const r = await client.query<{ id: string; config: GmailConfig }>(
      `SELECT id::text, config FROM ceo_integrations
       WHERE desk_id = $1::uuid AND kind = 'gmail' AND status <> 'disabled'
       ORDER BY created_at DESC LIMIT 1`,
      [CEO_DESK_ID],
    );
    if (r.rows.length === 0) return null;
    return r.rows[0];
  } catch { return null; } finally { await client.end().catch(() => {}); }
}

async function persistAccessToken(integrationId: string, config: GmailConfig) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query(
      `UPDATE ceo_integrations
       SET config = $1::jsonb,
           status = 'connected',
           last_used_at = NOW()
       WHERE id = $2::uuid`,
      [JSON.stringify(config), integrationId],
    );
  } finally { await client.end().catch(() => {}); }
}

// Get a valid access token (refresh if needed)
async function getAccessToken(integrationId: string, config: GmailConfig): Promise<string | null> {
  if (config.access_token && config.expires_at && config.expires_at > Date.now() + 30_000) {
    return config.access_token;
  }
  const tok = await refreshAccessToken(config.refresh_token);
  if (!tok) return null;
  const next: GmailConfig = {
    ...config,
    access_token: tok.access_token,
    expires_at: Date.now() + tok.expires_in * 1000,
  };
  await persistAccessToken(integrationId, next);
  return tok.access_token;
}

// ── Public API used by chat tool & UI ─────────────────────────────────────────

export async function createGmailDraft(input: {
  to: string;
  subject: string;
  body: string;
  cc?: string;
}): Promise<{ draftId: string; threadId: string | null } | null> {
  const loaded = await loadGmailConfig();
  if (!loaded) return null;
  const accessToken = await getAccessToken(loaded.id, loaded.config);
  if (!accessToken) return null;

  const headers: string[] = [
    `To: ${input.to}`,
    `Subject: =?utf-8?B?${Buffer.from(input.subject, "utf8").toString("base64")}?=`,
    `Content-Type: text/plain; charset=utf-8`,
    `MIME-Version: 1.0`,
  ];
  if (input.cc) headers.push(`Cc: ${input.cc}`);
  const raw = headers.join("\r\n") + "\r\n\r\n" + input.body;
  const rawBase64 = Buffer.from(raw, "utf8").toString("base64url");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: { raw: rawBase64 } }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { draftId: data.id, threadId: data.message?.threadId ?? null };
}

// Search the inbox for important items (deadlines, payment, key clients, etc.)
export async function gmailSearchImportant(extraQuery?: string): Promise<Array<{
  id: string; threadId: string; snippet: string; from?: string; subject?: string; date?: string;
}>> {
  const loaded = await loadGmailConfig();
  if (!loaded) return [];
  const accessToken = await getAccessToken(loaded.id, loaded.config);
  if (!accessToken) return [];

  // Heuristic query: starred OR important OR has the keywords
  const baseQuery = '(is:starred OR is:important OR subject:(deadline OR overdue OR invoice OR payment OR urgent OR contract OR sign)) newer_than:14d in:inbox';
  const q = extraQuery ? `${baseQuery} ${extraQuery}` : baseQuery;

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=10`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!listRes.ok) return [];
  const list = await listRes.json();
  const msgs: Array<{ id: string; threadId: string }> = list.messages ?? [];

  // Fetch headers + snippet
  const results = await Promise.all(msgs.slice(0, 10).map(async m => {
    const r = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!r.ok) return null;
    const d = await r.json();
    const headers: Array<{ name: string; value: string }> = d.payload?.headers ?? [];
    const get = (k: string) => headers.find(h => h.name.toLowerCase() === k.toLowerCase())?.value;
    return {
      id: m.id,
      threadId: m.threadId,
      snippet: (d.snippet as string) ?? "",
      from: get("From"),
      subject: get("Subject"),
      date: get("Date"),
    };
  }));
  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}
