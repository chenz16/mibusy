"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import type { DeliverableRow } from "../lib/v2-data";

const TONE_MAP: Record<string, string> = {
  Atlas: "#B5892A", Nova: "#2E7D52", Ledger: "#1A5E8A",
  Quill: "#7B4FAB", Scheduler: "#8A5500", Beacon: "#444444",
};
function agentColor(name: string | null) { return name ? (TONE_MAP[name] ?? "#888") : "#888"; }

function cleanPreview(text: string): string {
  return text.split("\n")
    .filter(l => l.trim() && l.trim() !== "---")
    .map(l => l.replace(/^#+\s*/, "").replace(/\*\*(.+?)\*\*/g, "$1"))
    .join(" ")
    .slice(0, 140);
}

export function DeliveryCenter({ initialItems }: { initialItems: DeliverableRow[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [sectionOpen, setSectionOpen] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const agents = useMemo(() => {
    const set = new Map<string, number>();
    for (const it of initialItems) {
      const name = it.agent_name ?? "未知";
      set.set(name, (set.get(name) ?? 0) + 1);
    }
    return Array.from(set.entries()); // [name, count]
  }, [initialItems]);

  const visible = filter ? initialItems.filter(i => (i.agent_name ?? "未知") === filter) : initialItems;

  if (initialItems.length === 0) {
    return (
      <section style={{ marginBottom: 22 }}>
        <SectionHeader open={sectionOpen} onToggle={() => setSectionOpen(v => !v)} count={0} />
        {sectionOpen && (
          <div className="empty-state" style={{ marginTop: 12 }}>
            还没有任何交付物 — 派任务给员工后，结果会汇总在这里
          </div>
        )}
      </section>
    );
  }

  return (
    <section style={{ marginBottom: 22 }}>
      <SectionHeader open={sectionOpen} onToggle={() => setSectionOpen(v => !v)} count={initialItems.length} />
      {sectionOpen && (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Inline dropdown filter — replaces the chip row */}
      {agents.length > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 2 }}>
          <select
            value={filter ?? ""}
            onChange={e => setFilter(e.target.value || null)}
            style={{
              padding: "4px 8px", borderRadius: 8,
              border: "1px solid var(--line-2)", fontSize: 11,
              background: "var(--paper-2)", color: "var(--ink-3)",
              cursor: "pointer", outline: "none",
            }}
          >
            <option value="">全部 {initialItems.length}</option>
            {agents.map(([name, count]) => (
              <option key={name} value={name}>{name} · {count}</option>
            ))}
          </select>
        </div>
      )}

      {/* Deliverable cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.map(d => (
          <DeliveryCard
            key={d.id}
            item={d}
            expanded={openId === d.id}
            onToggle={() => setOpenId(openId === d.id ? null : d.id)}
          />
        ))}
      </div>
      </div>
      )}
    </section>
  );
}

function SectionHeader({ open, onToggle, count }: { open: boolean; onToggle: () => void; count: number }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: "100%", border: "none", background: "transparent", padding: 0,
        display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
        fontSize: 11, fontWeight: 600, color: "var(--ink-3)",
        textTransform: "uppercase", letterSpacing: 0.5, cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span style={{ color: "var(--green, #2E7D52)" }}>✓</span>
      已交付
      <span style={{ fontSize: 10, fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--ink-4)" }}>
        · {count} 项 · 已产出的交付物
      </span>
      <span style={{ marginLeft: "auto", color: "var(--ink-4)" }}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </span>
    </button>
  );
}

function DeliveryCard({
  item, expanded, onToggle,
}: {
  item: DeliverableRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const color = agentColor(item.agent_name);
  const date = new Date(item.created_at);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--line)",
      borderRadius: 16, overflow: "hidden",
      transition: "border-color 150ms",
      borderColor: expanded ? color + "55" : "var(--line)",
    }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%", textAlign: "left", cursor: "pointer",
          background: "transparent", border: "none",
          padding: "12px 14px",
          display: "flex", gap: 12, alignItems: "flex-start",
        }}
      >
        {/* Big agent avatar — highlights WHO */}
        <div style={{
          flexShrink: 0, width: 38, height: 38, borderRadius: "50%",
          background: color, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 15, fontWeight: 700,
        }}>
          {(item.agent_name ?? "?").slice(0, 1)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{
              fontSize: 12, fontWeight: 600, color,
            }}>
              {item.agent_name ?? "?"}
            </span>
            <span style={{ fontSize: 11, color: "var(--ink-4)" }}>交付 · {dateStr}</span>
          </div>
          <div style={{
            fontSize: 14.5, fontWeight: 600, color: "var(--ink)",
            lineHeight: 1.4, marginBottom: 4,
          }}>
            {item.title}
          </div>
          {!expanded && (
            <div style={{
              fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.55,
              maxHeight: 36, overflow: "hidden",
            }}>
              {cleanPreview(item.body)}
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0, padding: "8px 0" }}>
          {expanded ? <ChevronDown size={16} style={{ color: "var(--ink-3)" }} /> : <ChevronRight size={16} style={{ color: "var(--ink-3)" }} />}
        </div>
      </button>

      {expanded && (
        <div style={{
          padding: "0 14px 14px 64px",
          borderTop: "1px dashed var(--line)",
          marginTop: 2, paddingTop: 12,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 11, color: "var(--ink-4)", marginBottom: 8,
            textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600,
          }}>
            <FileText size={11} />
            交付物全文
          </div>
          <div style={{
            fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            background: "var(--paper-2)", borderRadius: 10,
            padding: "12px 14px",
            maxHeight: 420, overflowY: "auto",
          }}>
            {item.body}
          </div>
        </div>
      )}
    </div>
  );
}
