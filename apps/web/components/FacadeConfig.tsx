"use client";

import { useState } from "react";
import { Link2, Unlink, Check, Copy } from "lucide-react";

export function FacadeConfig({
  agentId,
  agentName,
  agentMode,
  peerUrl,
  peerToken,
  onChange,
}: {
  agentId: string;
  agentName: string;
  agentMode: "ai" | "facade";
  peerUrl: string | null;
  peerToken: string | null;
  onChange: () => void;
}) {
  const isFacade = agentMode === "facade";
  const [editingUrl, setEditingUrl] = useState(false);
  const [draftUrl, setDraftUrl] = useState(peerUrl ?? "");
  const [draftToken, setDraftToken] = useState(peerToken ?? "");
  const [draftLabel, setDraftLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function save() {
    setError(null);
    const url = draftUrl.trim().replace(/\/$/, "");
    const tok = draftToken.trim();
    if (!url || !tok) { setError("URL 和 token 都要填"); return; }
    if (!/^https?:\/\//.test(url)) { setError("URL 必须以 http:// 或 https:// 开头"); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/v2/agents/${agentId}/peer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peer_url: url, peer_token: tok,
          counterparty_label: draftLabel.trim() || null,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        setError(data?.error ?? "配置失败");
        return;
      }
      setEditingUrl(false);
      onChange();
    } finally { setBusy(false); }
  }

  async function revertToAi() {
    if (!confirm(`把 ${agentName} 切回 AI 模式？peer 连接配置会保留但不再生效。`)) return;
    setBusy(true);
    try {
      await fetch(`/api/v2/agents/${agentId}/peer`, { method: "DELETE" });
      onChange();
    } finally { setBusy(false); }
  }

  function copyUrl() {
    if (!peerUrl) return;
    navigator.clipboard.writeText(peerUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div>
      <div style={{
        fontSize: 11, color: "var(--ink-4)", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {isFacade ? <Link2 size={11} style={{ color: "var(--gold)" }} /> : <Unlink size={11} />}
        模式
        <span style={{ fontSize: 10, fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--ink-4)" }}>
          {isFacade ? "（代理 / Façade — 转发给对端实例）" : "（AI — Hermes 本地执行）"}
        </span>
      </div>

      {/* Mode badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", borderRadius: 10,
        background: isFacade ? "var(--gold-soft)" : "var(--paper-2)",
        border: `1px solid ${isFacade ? "oklch(0.62 0.14 70 / 0.3)" : "var(--line)"}`,
        marginBottom: isFacade || editingUrl ? 10 : 0,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: isFacade ? "var(--gold)" : "var(--ink-4)",
        }} />
        <div style={{ flex: 1, fontSize: 12, color: "var(--ink-2)" }}>
          {isFacade
            ? `${agentName} 是对端 CEO 的代理 — 任务会转发出去`
            : `${agentName} 是本地 AI agent — Hermes 直接执行`}
        </div>
        {isFacade ? (
          <button
            type="button" onClick={revertToAi} disabled={busy}
            style={{
              padding: "3px 8px", fontSize: 10, cursor: "pointer",
              border: "1px solid var(--line-2)", borderRadius: 6,
              background: "var(--card)", color: "var(--ink-3)",
            }}
          >切回 AI</button>
        ) : (
          <button
            type="button" onClick={() => setEditingUrl(true)}
            style={{
              padding: "3px 8px", fontSize: 10, cursor: "pointer",
              border: "1px solid var(--line-2)", borderRadius: 6,
              background: "var(--card)", color: "var(--ink-3)",
            }}
          >设为代理 →</button>
        )}
      </div>

      {/* Facade config form */}
      {isFacade && !editingUrl && (
        <div style={{
          padding: "10px 12px", borderRadius: 10,
          background: "var(--card)", border: "1px solid var(--line)",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div style={{ fontSize: 11, color: "var(--ink-4)" }}>对端 URL</div>
          <div style={{ display: "flex", gap: 6 }}>
            <code style={{
              flex: 1, padding: "6px 8px", borderRadius: 6,
              background: "var(--paper-2)", fontSize: 11, fontFamily: "var(--mono)",
              color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{peerUrl}</code>
            <button
              type="button" onClick={copyUrl}
              style={{
                padding: "5px 8px", border: "1px solid var(--line-2)",
                borderRadius: 6, background: "transparent", fontSize: 10,
                cursor: "pointer", color: copied ? "var(--gold)" : "var(--ink-3)",
                display: "flex", alignItems: "center", gap: 3,
              }}
            >{copied ? <Check size={10} /> : <Copy size={10} />}{copied ? "已复制" : "复制"}</button>
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
            Peer token: <code style={{ fontFamily: "var(--mono)", fontSize: 10 }}>{peerToken ? `${peerToken.slice(0, 8)}…${peerToken.slice(-4)}` : "(missing)"}</code>
          </div>
          <button
            type="button" onClick={() => { setDraftUrl(peerUrl ?? ""); setDraftToken(peerToken ?? ""); setEditingUrl(true); }}
            style={{
              padding: "5px 0", border: "1px solid var(--line-2)",
              borderRadius: 6, background: "transparent", fontSize: 11,
              cursor: "pointer", color: "var(--ink-3)", marginTop: 6,
            }}
          >修改对端配置</button>
        </div>
      )}

      {editingUrl && (
        <div style={{
          padding: "10px 12px", borderRadius: 10,
          background: "var(--gold-soft)", border: "1px dashed oklch(0.62 0.14 70 / 0.4)",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>
            对端 CEO 实例的 URL 和它给你的 token（在对端 CeoSheet → 上级连接 里生成）。
          </div>
          <input
            placeholder="对端 URL (http://localhost:3001 或 https://friend.example.com)"
            value={draftUrl}
            onChange={e => setDraftUrl(e.target.value)}
            style={{
              padding: "7px 10px", borderRadius: 8, fontSize: 12,
              border: "1px solid var(--line-2)", background: "var(--card)",
              color: "var(--ink)", outline: "none",
            }}
          />
          <input
            placeholder="对端给的 peer_token (UUID)"
            value={draftToken}
            onChange={e => setDraftToken(e.target.value)}
            style={{
              padding: "7px 10px", borderRadius: 8, fontSize: 12,
              border: "1px solid var(--line-2)", background: "var(--card)",
              color: "var(--ink)", outline: "none", fontFamily: "var(--mono)",
            }}
          />
          <input
            placeholder="对端标签（可选 · 显示用，例：王某@friend-co）"
            value={draftLabel}
            onChange={e => setDraftLabel(e.target.value)}
            style={{
              padding: "7px 10px", borderRadius: 8, fontSize: 12,
              border: "1px solid var(--line-2)", background: "var(--card)",
              color: "var(--ink)", outline: "none",
            }}
          />
          {error && (
            <div style={{ fontSize: 11, color: "var(--red)", padding: "2px 4px" }}>{error}</div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button" onClick={() => setEditingUrl(false)}
              style={{
                flex: 1, padding: "7px 0", border: "1px solid var(--line-2)",
                borderRadius: 8, background: "transparent", fontSize: 12,
                color: "var(--ink-3)", cursor: "pointer",
              }}
            >取消</button>
            <button
              type="button" onClick={save} disabled={busy || !draftUrl.trim() || !draftToken.trim()}
              style={{
                flex: 1, padding: "7px 0", border: "none", borderRadius: 8,
                background: busy ? "var(--paper-2)" : "var(--gold)",
                color: busy ? "var(--ink-4)" : "#fff",
                fontSize: 12, fontWeight: 600,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >{busy ? "保存中…" : "保存并启用代理"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
