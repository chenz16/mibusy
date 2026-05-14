"use client";

import { useEffect, useState } from "react";
import { Users, ChevronRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import type { Meeting } from "../lib/v2-data";

export function MeetingInvites() {
  const [items, setItems] = useState<Meeting[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Auto-expand when there's a pending meeting (CEO needs to decide).
  // Otherwise keep collapsed to save vertical space.
  const [open, setOpen] = useState(false);
  const [userToggled, setUserToggled] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/v2/meetings?status=pending,in_session");
      if (r.ok) {
        const rows = await r.json() as Meeting[];
        setItems(rows);
        if (!userToggled) {
          // auto-open if there's any pending decision; auto-collapse otherwise
          setOpen(rows.some(m => m.status === "pending"));
        }
      }
    } finally { setLoaded(true); }
  }
  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loaded || items.length === 0) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        type="button"
        onClick={() => { setUserToggled(true); setOpen(o => !o); }}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          width: "100%", padding: "4px 0", border: "none", background: "transparent",
          fontSize: 11, fontWeight: 600, color: "var(--gold)",
          textTransform: "uppercase", letterSpacing: 0.7, marginBottom: open ? 8 : 0,
          cursor: "pointer", textAlign: "left",
        }}
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <Users size={11} />
        会议室
        <span style={{ color: "var(--ink-4)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
          · {items.length} 进行中/待批准
        </span>
      </button>
      {open && (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(m => {
          const isPending = m.status === "pending";
          const color = isPending ? "var(--gold)" : "var(--blue, #1A5E8A)";
          return (
            <Link key={m.id} href={`/meeting/${m.id}`} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px",
              background: isPending ? "var(--gold-soft)" : "var(--card)",
              border: `1px solid ${isPending ? "oklch(0.62 0.14 70 / 0.3)" : "var(--line)"}`,
              borderRadius: 14,
              textDecoration: "none", color: "inherit",
            }}>
              <div style={{
                flexShrink: 0, width: 3, alignSelf: "stretch",
                borderRadius: 2, background: color, minHeight: 36,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color,
                    padding: "1px 7px", borderRadius: 999, background: `${color}18`,
                  }}>
                    {isPending ? "待批准" : "进行中"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ink-4)" }}>
                    {m.initiator_kind === "ceo"
                      ? "CEO"
                      : m.initiator_agent_name ?? "agent"} 发起
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", lineHeight: 1.35 }}>
                  {m.topic}
                </div>
                {m.participant_names.length > 0 && (
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 3 }}>
                    {m.participant_names.join(" · ")}
                  </div>
                )}
              </div>
              <ChevronRight size={14} style={{ color: "var(--ink-4)" }} />
            </Link>
          );
        })}
      </div>
      )}
    </div>
  );
}
