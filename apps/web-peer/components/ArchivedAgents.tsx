"use client";

import { useEffect, useState } from "react";
import { Archive, RotateCcw, Trash2, UserX } from "lucide-react";
import type { ArchivedAgent } from "../lib/v2-data";

const TONE_MAP: Record<string, string> = {
  Atlas: "#B5892A", Nova: "#2E7D52", Ledger: "#1A5E8A",
  Quill: "#7B4FAB", Scheduler: "#8A5500", Beacon: "#444444",
};
function agentColor(name: string) { return TONE_MAP[name] ?? "#888"; }

export function ArchivedAgents() {
  const [items, setItems] = useState<ArchivedAgent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/v2/agents/archived");
      if (r.ok) setItems(await r.json());
    } finally { setLoaded(true); }
  }
  useEffect(() => { load(); }, []);

  async function restore(id: string, name: string) {
    if (!confirm(`恢复 ${name}？ta 会重新出现在团队列表，但旧的对外连接和 token 不会自动回来。`)) return;
    setBusy(id);
    try {
      const r = await fetch(`/api/v2/agents/${id}/restore`, { method: "POST" });
      if (r.ok) load();
    } finally { setBusy(null); }
  }

  async function purge(id: string, name: string) {
    if (!confirm(`永久删除 ${name}？\n\n• 员工记录彻底消失\n• 历史交付物保留在交付中心（按名字仍可识别）\n• 此操作不可逆`)) return;
    setBusy(id);
    try {
      const r = await fetch(`/api/v2/agents/${id}/restore`, { method: "DELETE" });
      if (r.ok) setItems(prev => prev.filter(i => i.id !== id));
    } finally { setBusy(null); }
  }

  if (!loaded) return null;

  return (
    <div>
      <div style={{
        fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6, marginBottom: 10,
        padding: "8px 12px", background: "var(--paper-2)",
        border: "1px dashed var(--line-2)", borderRadius: 8,
      }}>
        被解雇 / 归档的员工。可以恢复（重新激活）或永久删除（历史交付保留）。
      </div>

      {items.length === 0 ? (
        <div style={{
          fontSize: 12, color: "var(--ink-4)", textAlign: "center",
          padding: "16px", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 6,
        }}>
          <UserX size={20} style={{ color: "var(--line-2)" }} />
          没有归档的员工
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map(it => {
            const color = agentColor(it.name);
            const hired = new Date(it.hired_at).toLocaleDateString("zh-CN", { year: "numeric", month: "numeric", day: "numeric" });
            const fired = it.archived_at ? new Date(it.archived_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) : "—";
            const isBusy = busy === it.id;
            return (
              <div key={it.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "var(--card)", border: "1px solid var(--line)",
                borderRadius: 10, padding: "8px 10px",
                opacity: isBusy ? 0.6 : 1,
              }}>
                <div style={{
                  flexShrink: 0, width: 28, height: 28, borderRadius: "50%",
                  background: color, display: "flex", alignItems: "center",
                  justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700,
                  filter: "grayscale(0.5)",
                }}>{it.name.slice(0, 1)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500, color: "var(--ink-2)",
                    textDecoration: "line-through", textDecorationColor: "var(--ink-4)",
                  }}>{it.name}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-4)" }}>
                    {it.role} · 雇 {hired} → 解 {fired} · 交付 {it.total_deliverables} 项
                    {it.monthly_budget != null && ` · 预算 $${it.monthly_budget}`}
                  </div>
                </div>
                <button
                  type="button" onClick={() => restore(it.id, it.name)} disabled={isBusy}
                  title="恢复"
                  style={{
                    padding: "4px 8px", fontSize: 11,
                    border: "1px solid var(--line-2)", borderRadius: 6,
                    background: "transparent", cursor: "pointer", color: "var(--ink-3)",
                    display: "flex", alignItems: "center", gap: 3,
                  }}
                >
                  <RotateCcw size={11} />恢复
                </button>
                <button
                  type="button" onClick={() => purge(it.id, it.name)} disabled={isBusy}
                  title="永久删除"
                  style={{
                    width: 24, height: 24, border: "none", borderRadius: 5,
                    background: "transparent", cursor: "pointer",
                    color: "var(--ink-4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                ><Trash2 size={11} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

void Archive;  // imported but reserved for potential header icon
