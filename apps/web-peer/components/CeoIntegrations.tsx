"use client";

import React, { useEffect, useState } from "react";
import { Mail, Slash, Calendar, Webhook, Boxes, Trash2, Plus } from "lucide-react";
import type { CeoIntegration } from "../lib/v2-data";

const KIND_META: Record<string, { icon: React.ReactElement; label: string; bg: string }> = {
  gmail:    { icon: <Mail size={14} />,     label: "Gmail",    bg: "#EA433518" },
  slack:    { icon: <Slash size={14} />,    label: "Slack",    bg: "#4A154B18" },
  calendar: { icon: <Calendar size={14} />, label: "Calendar", bg: "#4285F418" },
  webhook:  { icon: <Webhook size={14} />,  label: "Webhook",  bg: "#88888818" },
  mcp:      { icon: <Boxes size={14} />,    label: "MCP",      bg: "#6B4FAB18" },
};

const STATUS_LABEL: Record<string, string> = {
  configured: "已配置",
  connected: "已连接",
  error: "出错",
  disabled: "已禁用",
};
const STATUS_COLOR: Record<string, string> = {
  configured: "var(--ink-4)",
  connected: "var(--green, #2E7D52)",
  error: "var(--red)",
  disabled: "var(--ink-4)",
};

export function CeoIntegrations() {
  const [items, setItems] = useState<CeoIntegration[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/v2/ceo/integrations");
      if (r.ok) setItems(await r.json());
    } finally { setLoaded(true); }
  }

  useEffect(() => { load(); }, []);

  async function quickAdd(kind: string, defaultLabel: string) {
    // Gmail uses OAuth flow — redirect to start endpoint
    if (kind === "gmail") {
      window.location.href = "/api/v2/gmail/auth/start";
      return;
    }
    const label = prompt(`${KIND_META[kind]?.label ?? kind} 显示名：`, defaultLabel) ?? "";
    if (!label.trim()) return;
    let config: Record<string, unknown> = {};
    if (kind === "webhook") {
      const url = prompt("Webhook URL：");
      if (!url) return;
      config = { url };
    } else if (kind === "slack") {
      const ws = prompt("Slack workspace 或 webhook URL：");
      if (!ws) return;
      config = { workspace: ws };
    }
    const res = await fetch("/api/v2/ceo/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, label: label.trim(), config }),
    });
    if (res.ok) { load(); setAdding(false); }
  }

  async function remove(id: string) {
    if (!confirm("移除此接入？")) return;
    const res = await fetch(`/api/v2/ceo/integrations/${id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id));
  }

  if (!loaded) return null;

  return (
    <div>
      <div style={{
        fontSize: 11, color: "var(--ink-4)", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: 0.5,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10,
      }}>
        外部接入（CEO 级 · 员工默认继承）
        <button
          type="button"
          onClick={() => setAdding(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 3,
            background: "transparent", border: "1px solid var(--line-2)",
            borderRadius: 999, padding: "2px 8px 2px 6px", fontSize: 10,
            color: "var(--ink-3)", cursor: "pointer",
            textTransform: "none", letterSpacing: 0,
          }}
        >
          <Plus size={11} /> {adding ? "取消" : "添加"}
        </button>
      </div>

      {adding && (
        <div style={{
          padding: "10px 12px", marginBottom: 8,
          background: "var(--paper-2)", borderRadius: 10,
          border: "1px dashed var(--line-2)",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
        }}>
          <AddBtn icon={<Mail size={13} />} label="Gmail" onClick={() => quickAdd("gmail", "chen.zhang6@gmail.com")} />
          <AddBtn icon={<Slash size={13} />} label="Slack" onClick={() => quickAdd("slack", "Slack 工作区")} />
          <AddBtn icon={<Calendar size={13} />} label="Calendar" onClick={() => quickAdd("calendar", "Google Calendar")} />
          <AddBtn icon={<Webhook size={13} />} label="Webhook" onClick={() => quickAdd("webhook", "外部 Webhook")} />
        </div>
      )}

      {items.length === 0 ? (
        <div style={{
          fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6,
          padding: "10px 14px",
          background: "var(--paper-2)", border: "1px dashed var(--line-2)", borderRadius: 10,
        }}>
          还没接入任何外部工具。点上方"添加"接入 Gmail / Slack / Calendar / Webhook。
          <br />
          <span style={{ color: "var(--ink-4)" }}>员工默认继承 CEO 的所有接入。</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map(it => {
            const meta = KIND_META[it.kind] ?? { icon: <Boxes size={14} />, label: it.kind, bg: "#88888818" };
            return (
              <div key={it.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 10,
                background: "var(--card)", border: "1px solid var(--line)",
              }}>
                <div style={{
                  flexShrink: 0, width: 28, height: 28, borderRadius: 7,
                  background: meta.bg, color: "var(--ink-2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500, color: "var(--ink)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{it.label}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-4)" }}>
                    {meta.label} · <span style={{ color: STATUS_COLOR[it.status] }}>{STATUS_LABEL[it.status] ?? it.status}</span>
                  </div>
                </div>
                <button
                  type="button" onClick={() => remove(it.id)} title="移除"
                  style={{
                    width: 26, height: 26, border: "none", borderRadius: 6,
                    background: "transparent", cursor: "pointer",
                    color: "var(--ink-4)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}
                ><Trash2 size={13} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddBtn({ icon, label, onClick }: { icon: React.ReactElement; label: string; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 10px", background: "var(--card)",
        border: "1px solid var(--line)", borderRadius: 8,
        cursor: "pointer", fontSize: 12, color: "var(--ink-2)",
        fontWeight: 500,
      }}
    >
      {icon}{label}
    </button>
  );
}
