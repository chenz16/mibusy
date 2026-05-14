"use client";

import { Check, Send, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { AwaitingAssignment, DeliverableRow, StaffRow } from "../lib/v2-data";

const ATLAS_ID = "00000000-0000-0000-0001-000000000001";

const TONE_MAP: Record<string, string> = {
  Atlas: "#B5892A", Nova: "#2E7D52", Ledger: "#1A5E8A",
  Quill: "#7B4FAB", Scheduler: "#8A5500", Beacon: "#444444",
};

function agentColor(name: string) {
  return TONE_MAP[name] ?? "#888888";
}

// Parse hire intent: 雇/招 + name/role
function parseHireIntent(text: string): { name: string; role: string } | null {
  const t = text.trim();
  if (!/^(雇|招|hire)/i.test(t)) return null;
  // "雇一个写手叫Clara" / "招聘 Research Analyst Alex" / "雇 Alex 做写手"
  const m1 = t.match(/(?:雇|招)[一个聘]?\s*([\w\s]+?)\s*(?:叫|名叫|named?)\s*([\w一-龥]+)/i);
  if (m1) return { role: m1[1].trim(), name: m1[2].trim() };
  const m2 = t.match(/(?:雇|招)[一个聘]?\s*([\w一-龥]+)\s+(?:做|担任|as\s)([\w\s一-龥]+)/i);
  if (m2) return { name: m2[1].trim(), role: m2[2].trim() };
  const m3 = t.match(/(?:hire|雇|招)\s+([\w一-龥]+)\s+([\w\s一-龥]+)/i);
  if (m3) return { name: m3[1].trim(), role: m3[2].trim() };
  return null;
}

type FeedItem =
  | { kind: "deliverable"; ts: string; data: DeliverableRow }
  | { kind: "awaiting"; ts: string; data: AwaitingAssignment };

function buildFeed(
  deliverables: DeliverableRow[],
  awaiting: AwaitingAssignment[],
): FeedItem[] {
  const items: FeedItem[] = [
    ...awaiting.map((d) => ({ kind: "awaiting" as const, ts: d.created_at, data: d })),
    ...deliverables.map((d) => ({ kind: "deliverable" as const, ts: d.created_at, data: d })),
  ];
  // decisions first, then by date desc
  items.sort((a, b) => {
    if (a.kind === "awaiting" && b.kind !== "awaiting") return -1;
    if (b.kind === "awaiting" && a.kind !== "awaiting") return 1;
    return b.ts.localeCompare(a.ts);
  });
  return items;
}

function DeliverableCard({ item }: { item: DeliverableRow }) {
  const [expanded, setExpanded] = useState(false);
  const color = agentColor(item.agent_name ?? "");
  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      style={{
        display: "flex", gap: 12, width: "100%", textAlign: "left",
        background: "var(--card)", border: "1px solid var(--line)",
        borderRadius: 18, padding: "12px 14px", cursor: "pointer",
      }}
    >
      <div style={{
        flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
        background: color, display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: 13, fontWeight: 700,
      }}>
        {(item.agent_name ?? "?").slice(0, 1)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {item.agent_name ?? "Agent"} · {new Date(item.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="badge completed" style={{ flexShrink: 0 }}>delivered</span>
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
        <div style={{
          fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5,
          fontFamily: "var(--mono)",
          maxHeight: expanded ? "none" : 48,
          overflow: "hidden",
        }}>
          {item.body.slice(0, expanded ? 1200 : 120)}{!expanded && item.body.length > 120 ? "…" : ""}
        </div>
      </div>
    </button>
  );
}

function AwaitingCard({ item }: { item: AwaitingAssignment }) {
  const router = useRouter();
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function update(status: "completed" | "cancelled") {
    const key = status === "completed" ? "approve" : "reject";
    setLoading(key);
    try {
      await fetch(`/api/v2/assignments/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setDone(status === "completed" ? "approved" : "rejected");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{
      display: "flex", gap: 12, background: "var(--gold-soft)",
      border: "1px solid oklch(0.62 0.14 70 / 0.3)",
      borderRadius: 18, padding: "12px 14px",
    }}>
      <div style={{
        flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
        background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff",
      }}>
        <Zap size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "oklch(0.44 0.11 70)", marginBottom: 4 }}>
          需要决策 · {new Date(item.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{item.title}</div>
        {done ? (
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {done === "approved" ? "✓ 已批准" : "✗ 已拒绝"}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              disabled={!!loading}
              onClick={() => update("completed")}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                background: "var(--gold)", color: "#fff", border: "none",
                cursor: loading ? "not-allowed" : "pointer", opacity: loading === "reject" ? 0.5 : 1,
              }}
            >
              <Check size={13} />{loading === "approve" ? "…" : "批准"}
            </button>
            <button
              type="button"
              disabled={!!loading}
              onClick={() => update("cancelled")}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                background: "oklch(0.58 0.19 25 / 0.12)", color: "var(--red)",
                border: "1px solid oklch(0.58 0.19 25 / 0.25)",
                cursor: loading ? "not-allowed" : "pointer", opacity: loading === "approve" ? 0.5 : 1,
              }}
            >
              <X size={13} />{loading === "reject" ? "…" : "拒绝"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TodayFeed({
  deliverables,
  awaiting,
  staff,
}: {
  deliverables: DeliverableRow[];
  awaiting: AwaitingAssignment[];
  staff: StaffRow[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState("");
  const [error, setError] = useState("");

  const feed = buildFeed(deliverables, awaiting);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError("");
    try {
      const hireIntent = parseHireIntent(text);

      if (hireIntent) {
        const res = await fetch("/api/v2/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: hireIntent.name, role: hireIntent.role, kind: "specialist" }),
        });
        if (res.ok) {
          setLastSent(`已招聘 ${hireIntent.name}（${hireIntent.role}）`);
          setInput("");
          router.refresh();
        } else {
          const j = await res.json().catch(() => ({}));
          setError(j.error ?? `招聘失败 (${res.status})`);
        }
      } else {
        const atlasId = staff.find((s) => s.name === "Atlas")?.id ?? ATLAS_ID;
        const res = await fetch("/api/v2/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: text.slice(0, 60),
            prompt: text,
            assigned_to_agent_id: atlasId,
          }),
        });
        if (res.ok) {
          setLastSent(`已发送给 Atlas`);
          setInput("");
          router.refresh();
        } else {
          const j = await res.json().catch(() => ({}));
          setError(j.error ?? `发送失败 (${res.status}) — 请确认数据库已启动`);
        }
      }
    } catch (e) {
      setError("网络错误，请检查服务是否运行");
    } finally {
      setSending(false);
      setTimeout(() => { setLastSent(""); setError(""); }, 5000);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 140px)" }}>

      {/* Feed */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, paddingBottom: 16 }}>
        {feed.length === 0 ? (
          <div className="empty-state">
            暂无动态 — 在下方输入框发送第一条指令
          </div>
        ) : (
          feed.map((item, i) =>
            item.kind === "deliverable" ? (
              <DeliverableCard key={item.data.id} item={item.data} />
            ) : (
              <AwaitingCard key={item.data.id + i} item={item.data} />
            ),
          )
        )}
      </div>

      {/* Universal input — pinned to bottom of content area */}
      <div style={{ position: "sticky", bottom: 88, paddingBottom: 8 }}>
        {lastSent && (
          <div style={{
            fontSize: 12, color: "var(--ink-3)", textAlign: "center",
            marginBottom: 6, animation: "fade-in-up 220ms ease-out both",
          }}>
            {lastSent}
          </div>
        )}
        {error && (
          <div style={{
            fontSize: 12, color: "var(--red)", textAlign: "center",
            marginBottom: 6, animation: "fade-in-up 220ms ease-out both",
          }}>
            ⚠ {error}
          </div>
        )}
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          background: "var(--card)", border: "1px solid var(--line-2)",
          borderRadius: 999, padding: "8px 8px 8px 16px",
          boxShadow: "0 2px 12px rgb(0 0 0 / 0.08)",
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="给 Atlas 发指令，或「雇一个写手叫 Clara」…"
            disabled={sending}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: 14, color: "var(--ink)",
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            style={{
              width: 34, height: 34, borderRadius: "50%", border: "none",
              background: input.trim() && !sending ? "var(--gold)" : "var(--paper-2)",
              color: input.trim() && !sending ? "#fff" : "var(--ink-4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !sending ? "pointer" : "default",
              flexShrink: 0,
              transition: "background 150ms, color 150ms",
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
