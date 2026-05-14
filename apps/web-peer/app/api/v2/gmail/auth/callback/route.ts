import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, decodeEmailFromIdToken } from "../../../../../../lib/gmail";
import { createCeoIntegration, listCeoIntegrations, deleteCeoIntegration } from "../../../../../../lib/v2-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const errParam = req.nextUrl.searchParams.get("error");
  if (errParam) {
    return new NextResponse(`<html><body style="font-family:system-ui;padding:24px">
      Gmail 授权失败：${errParam}<br><a href="/">返回首页</a>
      </body></html>`, { headers: { "Content-Type": "text/html" } });
  }
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const tok = await exchangeCodeForTokens(code);
  if (!tok || !tok.refresh_token) {
    return new NextResponse(`<html><body style="font-family:system-ui;padding:24px">
      Gmail 授权返回的令牌不完整。可能你之前授权过 — 请到
      <a href="https://myaccount.google.com/connections" target="_blank">Google 账号 → 关联应用</a>
      移除 Mibusy 后重试。<br><br><a href="/">返回首页</a>
      </body></html>`, { headers: { "Content-Type": "text/html" } });
  }

  const email = decodeEmailFromIdToken(tok.id_token) ?? "(unknown)";

  // Remove existing gmail integrations (we only support one for now)
  const existing = await listCeoIntegrations();
  for (const it of existing.filter(i => i.kind === "gmail")) {
    await deleteCeoIntegration(it.id);
  }

  // Store new one
  const created = await createCeoIntegration({
    kind: "gmail",
    label: email,
    config: {
      email,
      refresh_token: tok.refresh_token,
      access_token: tok.access_token,
      expires_at: Date.now() + tok.expires_in * 1000,
    },
  });

  if (!created) {
    return new NextResponse(`<html><body style="font-family:system-ui;padding:24px">
      数据库写入失败。<br><a href="/">返回首页</a>
      </body></html>`, { headers: { "Content-Type": "text/html" } });
  }

  return new NextResponse(`<html><body style="font-family:system-ui;padding:32px;text-align:center">
    <h2 style="color:#2E7D52">Gmail 已连接</h2>
    <p>账户：<b>${email}</b></p>
    <p style="color:#666">现在你可以在 CEO 主聊天里说『给王总起草一封感谢邮件』，邮件秘书会创建草稿。</p>
    <p><a href="/" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#B5892A;color:#fff;text-decoration:none;border-radius:8px">回到 Mibusy</a></p>
    </body></html>`, { headers: { "Content-Type": "text/html" } });
}
