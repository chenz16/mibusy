"use client";

import { useEffect, useState } from "react";
import { Brain, Trash2, Search, X } from "lucide-react";
import type { MemoryEntry } from "../lib/v2-data";

const KIND_LABEL: Record<string, string> = {
  decision: "决策", fact: "事实", note: "笔记", summary: "总结",
};
const KIND_COLOR: Record<string, string> = {
  decision: "var(--gold)",
  fact: "var(--blue, #1A5E8A)",
  note: "var(--ink-2)",
  summary: "var(--green, #2E7D52)",
};

export function CeoMemory() {
  const [items, setItems] = useState<MemoryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(q?: string) {
    setLoading(true);
    try {
      const url = q ? `/api/v2/ceo/memory?q=${encodeURIComponent(q)}` : "/api/v2/ceo/memory?limit=50";
      const r = await fetch(url);
      if (r.ok) setItems(await r.json());
    } finally { setLoading(false); }
  }
  useEffect(() => {
    load();
    const id = setInterval(() => { if (!query) load(); }, 15_000);
    return () => clearInterval(id);
  }, [query]);

  async function remove(id: string) {
    if (!confirm("删除此记忆？")) return;
    const r = await fetch(`/api/v2/ceo/memory/${id}`, { method: "DELETE" });
    if (r.ok) setItems(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div>
      <div style={{
        fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6, marginBottom: 10,
        padding: "8px 12px", background: "var(--paper-2)",
        border: "1px dashed var(--line-2)", borderRadius: 8,
      }}>
        CEO 助理的长期记忆：决策 / 事实 / 笔记 / 总结。<br />
        主聊天说『记一下…』或它在派任务/雇人时自动写入。
      </div>

      {/* Search */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 6,
          background: "var(--card)", border: "1px solid var(--line-2)",
          borderRadius: 8, padding: "6px 10px",
        }}>
          <Search size={12} style={{ color: "var(--ink-4)" }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") load(query); }}
            placeholder="搜记忆…"
            style={{
              flex: 1, border: "none", outline: "none",
              background: "none", fontSize: 12, color: "var(--ink)",
            }}
          />
          {query && (
            <button
              type="button" onClick={() => { setQuery(""); load(); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-4)", padding: 0 }}
            ><X size={12} /></button>
          )}
        </div>
        <button
          type="button" onClick={() => load(query)} disabled={loading}
          style={{
            padding: "6px 12px", border: "1px solid var(--line-2)",
            borderRadius: 8, background: "transparent",
            fontSize: 12, color: "var(--ink-3)", cursor: "pointer",
          }}
        >{loading ? "…" : "搜"}</button>
      </div>

      {items.length === 0 ? (
        <div style={{
          fontSize: 12, color: "var(--ink-4)", textAlign: "center",
          padding: "16px", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 6,
        }}>
          <Brain size={20} style={{ color: "var(--line-2)" }} />
          {query ? "没找到匹配的记忆" : "还没有任何记忆"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {items.map(it => {
            const color = KIND_COLOR[it.kind] ?? "var(--ink-3)";
            const date = new Date(it.created_at).toLocaleString("zh-CN", {
              month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
            });
            return (
              <div key={it.id} style={{
                display: "flex", gap: 8, alignItems: "flex-start",
                background: "var(--card)", border: "1px solid var(--line)",
                borderRadius: 8, padding: "8px 10px",
              }}>
                <div style={{
                  flexShrink: 0, width: 3, alignSelf: "stretch",
                  borderRadius: 2, background: color, minHeight: 24,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color, padding: "1px 6px", borderRadius: 999, background: `${color}18` }}>
                      {KIND_LABEL[it.kind]}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--ink-4)" }}>{date}</span>
                    {it.tags.length > 0 && (
                      <span style={{ fontSize: 10, color: "var(--ink-4)" }}>· {it.tags.join(" ")}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5, wordBreak: "break-word" }}>
                    {it.content}
                  </div>
                </div>
                <button
                  type="button" onClick={() => remove(it.id)}
                  title="删除"
                  style={{
                    flexShrink: 0, width: 22, height: 22, border: "none",
                    borderRadius: 5, background: "transparent",
                    cursor: "pointer", color: "var(--ink-4)",
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
