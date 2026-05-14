"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, Copy, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight } from "lucide-react";
import type { AgentConnection } from "../lib/v2-data";

const KIND_LABEL: Record<string, string> = {
  task: "派任务",
  chat: "聊天",
  event: "事件",
  decision: "审批",
  stream: "数据流",
};

const TRANSPORT_LABEL: Record<string, string> = {
  poll: "工作令牌",
  webhook: "Webhook",
  slack: "Slack",
  email: "邮件",
  mcp: "MCP",
  peer: "对等 Mibusy",
};

const DIR_ICON: Record<string, React.ReactElement> = {
  inbound: <ArrowDownToLine size={11} />,
  outbound: <ArrowUpFromLine size={11} />,
  bidi: <ArrowLeftRight size={11} />,
};

export function ConnectionsList({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [conns, setConns] = useState<AgentConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/v2/agents/${agentId}/connections`);
      if (r.ok) setConns(await r.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [agentId]);

  async function addConnection(
    kind: AgentConnection["kind"],
    direction: AgentConnection["direction"],
    transport: AgentConnection["transport"],
    counterparty_label?: string,
  ) {
    setAdding(false);
    const res = await fetch(`/api/v2/agents/${agentId}/connections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, direction, transport, counterparty_label: counterparty_label ?? null }),
    });
    if (res.ok) load();
  }

  async function remove(id: string) {
    if (!confirm("删除此连接？对端将失去通信能力。")) return;
    const res = await fetch(`/api/v2/agents/${agentId}/connections/${id}`, { method: "DELETE" });
    if (res.ok) setConns(prev => prev.filter(c => c.id !== id));
  }

  function copyLink(c: AgentConnection) {
    if (!c.token) return;
    navigator.clipboard.writeText(`${window.location.origin}/my/${c.token}`).then(() => {
      setCopiedId(c.id); setTimeout(() => setCopiedId(null), 1500);
    });
  }

  function isOnline(c: AgentConnection) {
    return c.last_seen_at ? (Date.now() - new Date(c.last_seen_at).getTime() < 2 * 60 * 1000) : false;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "var(--ink-4)" }}>对外连接</div>
        <button
          type="button"
          onClick={() => setAdding(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "transparent", border: "1px solid var(--line-2)",
            borderRadius: 999, padding: "2px 8px 2px 6px", fontSize: 11,
            color: "var(--ink-3)", cursor: "pointer",
          }}
        >
          <Plus size={12} /> {adding ? "取消" : "新连接"}
        </button>
      </div>

      {/* Add new connection picker */}
      {adding && (
        <div style={{
          padding: "10px 12px", marginBottom: 8,
          background: "var(--paper-2)", borderRadius: 10,
          border: "1px dashed var(--line-2)",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 2 }}>
            选择新连接类型：
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <AddOption label="派任务（生成令牌）" desc="给真人/电脑做下属" onClick={() => addConnection("task", "bidi", "poll")} />
            <AddOption label="1:1 聊天令牌" desc="Slack/IM 风格对话" onClick={() => addConnection("chat", "bidi", "poll")} />
            <AddOption label="Webhook 入" desc="外部事件推进来" onClick={() => addConnection("event", "inbound", "webhook", "Webhook")} />
            <AddOption label="对等 Mibusy" desc="跨实例同级协作" onClick={() => addConnection("task", "bidi", "peer", "对等节点")} />
          </div>
        </div>
      )}

      {loading && conns.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--ink-4)", padding: "10px 0" }}>加载中…</div>
      )}

      {!loading && conns.length === 0 && (
        <div style={{
          fontSize: 12, color: "var(--ink-4)", textAlign: "center",
          padding: "12px 14px", borderRadius: 10,
          background: "var(--paper-2)", border: "1px dashed var(--line-2)",
        }}>
          {agentName} 还没有任何对外连接 — 点上方 + 添加第一个
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {conns.map(c => (
          <div key={c.id} style={{
            border: "1px solid var(--line)", borderRadius: 10,
            background: "var(--card)", padding: "10px 12px",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            {/* Row 1: kind + direction + transport + online dot + delete */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 7px",
                borderRadius: 999, background: "var(--paper-2)", color: "var(--ink-2)",
              }}>
                {KIND_LABEL[c.kind] ?? c.kind}
              </span>
              <span style={{
                display: "flex", alignItems: "center", gap: 3,
                fontSize: 10, color: "var(--ink-4)",
              }}>
                {DIR_ICON[c.direction] ?? null}
                {c.direction === "inbound" ? "入" : c.direction === "outbound" ? "出" : "双向"}
              </span>
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                · {TRANSPORT_LABEL[c.transport] ?? c.transport}
              </span>
              <div style={{ flex: 1 }} />
              {c.transport === "poll" && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: isOnline(c) ? "#22c55e" : "#d1d5db",
                  }} />
                  <span style={{ color: isOnline(c) ? "#22c55e" : "var(--ink-4)" }}>
                    {isOnline(c) ? "在线" : "离线"}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(c.id)}
                title="删除"
                style={{
                  width: 22, height: 22, border: "none", borderRadius: 6,
                  background: "transparent", cursor: "pointer",
                  color: "var(--ink-4)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}
              ><Trash2 size={12} /></button>
            </div>

            {/* Row 2: counterparty + token/endpoint + copy */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {c.counterparty_label && (
                <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{c.counterparty_label}</span>
              )}
              {c.token && (
                <>
                  <code style={{
                    flex: 1, minWidth: 0,
                    fontSize: 10, fontFamily: "var(--mono)",
                    color: "var(--ink-3)", background: "var(--paper-2)",
                    padding: "3px 7px", borderRadius: 5,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    /my/{c.token}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyLink(c)}
                    title="复制连接链接"
                    style={{
                      flexShrink: 0, padding: "3px 8px",
                      border: "1px solid var(--line-2)", borderRadius: 6,
                      background: "transparent", fontSize: 10,
                      cursor: "pointer",
                      color: copiedId === c.id ? "var(--gold)" : "var(--ink-3)",
                      display: "flex", alignItems: "center", gap: 3,
                    }}
                  >
                    <Copy size={10} />
                    {copiedId === c.id ? "已复制" : "复制"}
                  </button>
                </>
              )}
              {c.endpoint_url && (
                <code style={{
                  flex: 1, fontSize: 10, fontFamily: "var(--mono)",
                  color: "var(--ink-3)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{c.endpoint_url}</code>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddOption({ label, desc, onClick }: { label: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left", padding: "8px 10px",
        background: "var(--card)", border: "1px solid var(--line)",
        borderRadius: 8, cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{label}</div>
      <div style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 2 }}>{desc}</div>
    </button>
  );
}
