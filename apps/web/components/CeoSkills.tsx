"use client";

import { useEffect, useState } from "react";
import { Trash2, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import type { CeoSkill } from "../lib/v2-data";

export function CeoSkills() {
  const [items, setItems] = useState<CeoSkill[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/v2/ceo/skills");
      if (r.ok) setItems(await r.json());
    } finally { setLoaded(true); }
  }
  useEffect(() => {
    load();
    const id = setInterval(load, 12_000); // pick up new skills created via chat
    return () => clearInterval(id);
  }, []);

  async function remove(id: string) {
    if (!confirm("删除此 skill？")) return;
    const r = await fetch(`/api/v2/ceo/skills/${id}`, { method: "DELETE" });
    if (r.ok) setItems(prev => prev.filter(i => i.id !== id));
  }

  async function toggleEnabled(it: CeoSkill) {
    const r = await fetch(`/api/v2/ceo/skills/${it.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !it.enabled }),
    });
    if (r.ok) setItems(prev => prev.map(p => p.id === it.id ? { ...p, enabled: !p.enabled } : p));
  }

  if (!loaded) return null;

  return (
    <div>
      <div style={{
        fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6, marginBottom: 12,
        padding: "8px 12px", background: "var(--paper-2)",
        border: "1px dashed var(--line-2)", borderRadius: 8,
      }}>
        在主聊天里说『沉淀一个 skill：…』『把这套流程记成 skill』，AI 会自动生成并入库。这里只看 / 管理列表。
      </div>

      {items.length === 0 ? (
        <div style={{
          fontSize: 12, color: "var(--ink-4)", textAlign: "center",
          padding: "20px 12px", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 6,
        }}>
          <BookOpen size={20} style={{ color: "var(--line-2)" }} />
          还没沉淀任何 skill
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map(it => {
            const open = openId === it.id;
            return (
              <div key={it.id} style={{
                background: "var(--card)", border: "1px solid var(--line)",
                borderRadius: 10, overflow: "hidden",
                opacity: it.enabled ? 1 : 0.55,
              }}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : it.id)}
                  style={{
                    width: "100%", textAlign: "left", border: "none",
                    background: "transparent", padding: "10px 12px",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  }}
                >
                  {open ? <ChevronDown size={12} style={{ color: "var(--ink-3)" }} /> : <ChevronRight size={12} style={{ color: "var(--ink-3)" }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{it.name}</div>
                    <div style={{
                      fontSize: 11, color: "var(--ink-4)", marginTop: 1,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{it.description}</div>
                  </div>
                  {!it.enabled && (
                    <span style={{ fontSize: 10, color: "var(--ink-4)" }}>已禁用</span>
                  )}
                </button>
                {open && (
                  <div style={{
                    padding: "0 12px 12px 32px",
                    borderTop: "1px dashed var(--line)",
                    paddingTop: 10,
                  }}>
                    <div style={{
                      fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6,
                      background: "var(--paper-2)", borderRadius: 8, padding: "8px 10px",
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                      maxHeight: 200, overflowY: "auto",
                    }}>{it.body}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button
                        type="button" onClick={() => toggleEnabled(it)}
                        style={{
                          flex: 1, padding: "5px 0", fontSize: 11, cursor: "pointer",
                          border: "1px solid var(--line-2)", borderRadius: 6,
                          background: "transparent", color: "var(--ink-3)",
                        }}
                      >{it.enabled ? "禁用" : "启用"}</button>
                      <button
                        type="button" onClick={() => remove(it.id)}
                        title="删除"
                        style={{
                          padding: "5px 10px", fontSize: 11, cursor: "pointer",
                          border: "1px solid oklch(0.58 0.19 25 / 0.3)", borderRadius: 6,
                          background: "transparent", color: "var(--red)",
                          display: "flex", alignItems: "center", gap: 3,
                        }}
                      ><Trash2 size={11} />删除</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
