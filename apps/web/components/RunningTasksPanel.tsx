"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import type { RunningAssignment } from "../lib/v2-data";

const TONE_MAP: Record<string, string> = {
  Atlas: "#B5892A", Nova: "#2E7D52", Ledger: "#1A5E8A",
  Quill: "#7B4FAB", Scheduler: "#8A5500", Beacon: "#444444",
};
function agentColor(name: string | null) { return name ? (TONE_MAP[name] ?? "#888") : "#888"; }

export function RunningTasksPanel({ initialItems }: { initialItems: RunningAssignment[] }) {
  const [items] = useState(initialItems);
  const [sectionOpen, setSectionOpen] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section style={{ marginBottom: 22 }}>
      <button
        type="button"
        onClick={() => setSectionOpen(v => !v)}
        style={{
          width: "100%", border: "none", background: "transparent", padding: 0,
          display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
          fontSize: 11, fontWeight: 600, color: "var(--ink-3)",
          textTransform: "uppercase", letterSpacing: 0.5, cursor: "pointer",
          textAlign: "left",
        }}
      >
        <Loader2 size={11} className="pulse-dot" style={{ color: "var(--blue, #1A5E8A)" }} />
        正在执行
        <span style={{ fontSize: 10, fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--ink-4)" }}>
          · {items.length} 项 · 员工正在处理
        </span>
        <span style={{ marginLeft: "auto", color: "var(--ink-4)" }}>
          {sectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {sectionOpen && items.length === 0 ? (
        <div style={{
          fontSize: 12, color: "var(--ink-4)",
          padding: "12px 14px",
          background: "var(--paper-2)", border: "1px dashed var(--line-2)", borderRadius: 12,
        }}>
          当前没有正在执行的任务。
        </div>
      ) : sectionOpen ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(item => {
            const expanded = openId === item.id;
            const color = agentColor(item.agent_name);
            const created = new Date(item.created_at);
            const createdStr = created.toLocaleString("zh-CN", {
              month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
            });
            return (
              <div key={item.id} style={{
                background: "var(--card)", border: "1px solid var(--line)",
                borderRadius: 14, overflow: "hidden",
                borderColor: expanded ? color + "55" : "var(--line)",
              }}>
                <button
                  type="button"
                  onClick={() => setOpenId(expanded ? null : item.id)}
                  style={{
                    width: "100%", textAlign: "left", cursor: "pointer",
                    background: "transparent", border: "none",
                    padding: "10px 12px",
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  <div style={{
                    flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
                    background: color, color: "#fff", fontWeight: 700, fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{(item.agent_name ?? "?").slice(0, 1)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 650, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                      {item.agent_name ?? "?"} · {item.status === "running" ? "执行中" : "排队中"}
                    </div>
                  </div>
                  {expanded ? <ChevronDown size={15} style={{ color: "var(--ink-3)" }} /> : <ChevronRight size={15} style={{ color: "var(--ink-3)" }} />}
                </button>
                {expanded && (
                  <div style={{
                    borderTop: "1px dashed var(--line)",
                    padding: "10px 12px 12px 54px",
                    fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6,
                  }}>
                    <div>状态：{item.status === "running" ? "执行中" : "排队中"}</div>
                    <div>负责人：{item.agent_name ?? "?"}</div>
                    <div>创建：{createdStr}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
