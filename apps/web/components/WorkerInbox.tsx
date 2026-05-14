"use client";

import { useEffect, useRef, useState } from "react";

import type { WorkerAgent, WorkerAssignment } from "../lib/v2-data";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "刚刚";
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  return `${Math.floor(s / 86400)} 天前`;
}

function AssignmentCard({
  item,
  token,
  onDone,
}: {
  item: WorkerAssignment;
  token: string;
  onDone: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [started, setStarted] = useState(item.status === "running");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  async function handleStart() {
    await fetch("/api/v2/work/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, assignment_id: item.id }),
    });
    setStarted(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true); setErr("");
    const res = await fetch("/api/v2/work/done", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, assignment_id: item.id, title: title.trim() || item.title, body: body.trim() }),
    });
    if (res.ok) {
      onDone(item.id);
    } else {
      setErr("提交失败，请重试");
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      background: "var(--card, #fff)", border: "1px solid var(--line, #e8e3dc)",
      borderRadius: 16, overflow: "hidden",
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          padding: "14px 16px", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{item.title}</div>
          <div style={{ fontSize: 12, color: "var(--ink-3, #888)" }}>{timeAgo(item.created_at)}</div>
        </div>
        <span style={{
          flexShrink: 0, fontSize: 11, fontWeight: 600, padding: "3px 10px",
          borderRadius: 999,
          background: started ? "oklch(0.35 0.09 200 / 0.12)" : "oklch(0.62 0.14 70 / 0.12)",
          color: started ? "oklch(0.35 0.09 200)" : "oklch(0.44 0.11 70)",
        }}>
          {started ? "进行中" : "待处理"}
        </span>
      </div>

      {/* Expandable detail + form */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            background: "var(--paper-2, #f5f2ef)", borderRadius: 10,
            padding: "10px 12px", fontSize: 13, lineHeight: 1.6,
            color: "var(--ink-2, #444)", whiteSpace: "pre-wrap", maxHeight: 180, overflowY: "auto",
          }}>
            {item.prompt}
          </div>

          {!started && (
            <button
              type="button" onClick={handleStart}
              style={{
                padding: "9px 0", border: "1px solid var(--line, #e8e3dc)",
                borderRadius: 8, background: "transparent", fontSize: 13,
                fontWeight: 500, cursor: "pointer", color: "var(--ink-2, #444)",
              }}
            >
              开始处理
            </button>
          )}

          {started && (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={`交付标题（默认：${item.title}）`}
                style={{
                  padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line-2, #ddd)",
                  fontSize: 13, background: "var(--card, #fff)", color: "var(--ink, #111)", outline: "none",
                }}
              />
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="填写交付内容…"
                rows={5}
                required
                style={{
                  padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line-2, #ddd)",
                  fontSize: 13, background: "var(--card, #fff)", color: "var(--ink, #111)",
                  outline: "none", resize: "vertical", lineHeight: 1.6,
                }}
              />
              {err && <div style={{ fontSize: 12, color: "#c0392b" }}>{err}</div>}
              <button
                type="submit" disabled={!body.trim() || submitting}
                style={{
                  padding: "11px 0", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14,
                  background: body.trim() && !submitting ? "#B5892A" : "#ccc",
                  color: "#fff", cursor: body.trim() && !submitting ? "pointer" : "default",
                }}
              >
                {submitting ? "提交中…" : "提交交付物"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export function WorkerInbox({
  token,
  agent,
  initialAssignments,
}: {
  token: string;
  agent: WorkerAgent;
  initialAssignments: WorkerAssignment[];
}) {
  const [assignments, setAssignments] = useState<WorkerAssignment[]>(initialAssignments);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Heartbeat every 30s + poll for new assignments
  useEffect(() => {
    async function tick() {
      try {
        const res = await fetch(`/api/v2/work?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          setAssignments(data.pending ?? []);
        }
      } catch {}
    }
    tick();
    heartbeatRef.current = setInterval(tick, 30_000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [token]);

  function remove(id: string) {
    setAssignments(prev => prev.filter(a => a.id !== id));
  }

  const isOnline = true; // always online since we're on the page

  return (
    <div style={{
      minHeight: "100dvh", background: "var(--paper, #faf8f5)",
      padding: "24px 16px 48px", maxWidth: 480, margin: "0 auto",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isOnline ? "#2E7D52" : "#ccc" }} />
          <span style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>
            {isOnline ? "在线" : "离线"}
          </span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#111", letterSpacing: -0.5 }}>
          {agent.name}
        </div>
        <div style={{ fontSize: 14, color: "#888", marginTop: 2 }}>{agent.role}</div>
      </div>

      {/* Assignment list */}
      {assignments.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 0",
          color: "#aaa", fontSize: 14,
        }}>
          暂无待处理任务
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
            待处理 ({assignments.length})
          </div>
          {assignments.map(a => (
            <AssignmentCard key={a.id} item={a} token={token} onDone={remove} />
          ))}
        </div>
      )}

      {/* Footer: API info for programmatic workers */}
      <div style={{
        marginTop: 40, padding: "14px 16px",
        background: "#f0ede8", borderRadius: 12,
        fontSize: 11, color: "#888", lineHeight: 1.8,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: "#555" }}>自动化接入</div>
        <code style={{ display: "block", wordBreak: "break-all" }}>
          GET /api/v2/work?token={token}
        </code>
        <code style={{ display: "block" }}>
          POST /api/v2/work/done
        </code>
      </div>
    </div>
  );
}
