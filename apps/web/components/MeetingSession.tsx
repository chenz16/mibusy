"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, Check, X, FileText, Loader2, RotateCcw } from "lucide-react";
import type { Meeting, MeetingMessage } from "../lib/v2-data";

const TONE_MAP: Record<string, string> = {
  Atlas: "#B5892A", Nova: "#2E7D52", Ledger: "#1A5E8A",
  Quill: "#7B4FAB", Scheduler: "#8A5500", Beacon: "#444444",
};
function agentColor(name: string) { return TONE_MAP[name] ?? "#888888"; }

export function MeetingSession({ meetingId }: { meetingId: string }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch(`/api/v2/meetings/${meetingId}`);
      if (r.ok) {
        const d = await r.json();
        setMeeting(d.meeting); setMessages(d.messages);
      }
    } catch {}
  }
  useEffect(() => {
    load();
    const id = setInterval(load, 4_000);
    return () => clearInterval(id);
  }, [meetingId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function send() {
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    try {
      await fetch(`/api/v2/meetings/${meetingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, sender_kind: "ceo", broadcast: true }),
      });
      await load();
    } finally { setSending(false); }
  }

  async function approve() {
    await fetch(`/api/v2/meetings/${meetingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    load();
  }

  async function reject() {
    if (!confirm("拒绝这场会议？")) return;
    await fetch(`/api/v2/meetings/${meetingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    load();
  }

  async function summarize() {
    if (!confirm("结束会议并生成总结？\n\n• AI 会汇总讨论 → 写入会议总结\n• 如果是 agent 发起：总结自动作为子任务交付物挂回 ta 的任务\n• 之后仍可重新打开继续讨论")) return;
    setSummarizing(true);
    try {
      await fetch(`/api/v2/meetings/${meetingId}/summarize`, { method: "POST" });
      await load();
    } finally { setSummarizing(false); }
  }

  async function reopen() {
    if (reopening) return;
    setReopening(true);
    try {
      await fetch(`/api/v2/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reopen" }),
      });
      await load();
    } finally { setReopening(false); }
  }

  if (!meeting) {
    return <div className="muted" style={{ padding: 20 }}>加载会议中…</div>;
  }

  const isPending = meeting.status === "pending";
  const isLive = meeting.status === "in_session";
  const isDone = meeting.status === "summarized" || meeting.status === "rejected" || meeting.status === "cancelled";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <Link href="/meeting" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none" }}>← 会议室列表</Link>
        <h1 style={{
          fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600,
          margin: "8px 0 4px", lineHeight: 1.3,
        }}>{meeting.topic}</h1>
        {meeting.agenda && (
          <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>议程：{meeting.agenda}</div>
        )}
        <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
          {meeting.initiator_kind === "ceo" ? "CEO 发起" : `${meeting.initiator_agent_name ?? "?"} 申请`}
          {meeting.complexity_reason && ` · ${meeting.complexity_reason}`}
        </div>
      </div>

      {/* Participants strip */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, flexShrink: 0,
      }}>
        <span style={{
          padding: "3px 10px", borderRadius: 999,
          background: "var(--gold)", color: "#fff", fontSize: 11, fontWeight: 600,
        }}>CEO</span>
        {meeting.participant_names.map((n, i) => (
          <span key={meeting.participant_agent_ids[i] || n} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 10px 3px 4px", borderRadius: 999,
            background: "var(--paper-2)", border: "1px solid var(--line)",
            fontSize: 11, color: "var(--ink-2)",
          }}>
            <span style={{
              width: 14, height: 14, borderRadius: "50%",
              background: agentColor(n), color: "#fff",
              fontSize: 8, fontWeight: 700,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>{n.slice(0, 1)}</span>
            {n}
          </span>
        ))}
      </div>

      {/* Pending decision */}
      {isPending && (
        <div style={{
          padding: 12, marginBottom: 12,
          background: "var(--gold-soft)",
          border: "1px solid oklch(0.62 0.14 70 / 0.3)",
          borderRadius: 12, flexShrink: 0,
          display: "flex", gap: 8,
        }}>
          <button
            type="button" onClick={approve}
            style={{
              flex: 1, padding: "9px 0", border: "none", borderRadius: 10,
              background: "var(--gold)", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}
          ><Check size={13} />批准 + 开始</button>
          <button
            type="button" onClick={reject}
            style={{
              flex: 1, padding: "9px 0",
              border: "1px solid oklch(0.58 0.19 25 / 0.3)", borderRadius: 10,
              background: "transparent", color: "var(--red)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}
          ><X size={13} />拒绝</button>
        </div>
      )}

      {/* Summary display when done */}
      {isDone && meeting.summary && (
        <div style={{
          padding: "12px 14px", marginBottom: 12, flexShrink: 0,
          background: "var(--card)", border: "1px solid var(--line)",
          borderRadius: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--green, #2E7D52)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            <FileText size={11} />会议总结
          </div>
          <div style={{
            fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            maxHeight: 360, overflowY: "auto",
          }}>{meeting.summary}</div>
          {meeting.summary_assignment_id && (
            <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 8 }}>
              ✓ 已挂回发起人任务历史
            </div>
          )}
          <button
            type="button"
            onClick={reopen}
            disabled={reopening}
            style={{
              marginTop: 10, width: "100%", padding: "9px 0",
              border: "1px solid var(--line-2)", borderRadius: 10,
              background: "var(--paper)", color: "var(--ink-2)",
              fontSize: 12, fontWeight: 600,
              cursor: reopening ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}
          >
            {reopening ? <Loader2 size={12} className="pulse-dot" /> : <RotateCcw size={12} />}
            {reopening ? "重新打开中…" : "继续讨论"}
          </button>
        </div>
      )}

      {isDone && !meeting.summary && (
        <div style={{
          padding: 12, marginBottom: 12, flexShrink: 0,
          background: "var(--card)", border: "1px solid var(--line)",
          borderRadius: 12,
        }}>
          <button
            type="button"
            onClick={reopen}
            disabled={reopening}
            style={{
              width: "100%", padding: "9px 0",
              border: "1px solid var(--line-2)", borderRadius: 10,
              background: "var(--paper)", color: "var(--ink-2)",
              fontSize: 12, fontWeight: 600,
              cursor: reopening ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}
          >
            {reopening ? <Loader2 size={12} className="pulse-dot" /> : <RotateCcw size={12} />}
            {reopening ? "重新打开中…" : "继续讨论"}
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: "auto", minHeight: 0,
          display: "flex", flexDirection: "column", gap: 8, padding: "4px 0 8px",
        }}
      >
        {messages.length === 0 && (
          <div className="empty-state" style={{ fontSize: 12 }}>
            {isLive ? "开始讨论吧，发条消息看 agent 们回应。" : "还没有发言。"}
          </div>
        )}
        {messages.map(m => {
          const isCEO = m.sender_kind === "ceo";
          const isSystem = m.sender_kind === "system";
          const name = isCEO ? "CEO" : m.sender_agent_name ?? "?";
          const color = isCEO ? "var(--gold)" : agentColor(name);

          if (isSystem) {
            return (
              <div key={m.id} style={{
                textAlign: "center", fontSize: 11, color: "var(--ink-4)",
                padding: "4px 0",
              }}>
                — {m.content} —
              </div>
            );
          }

          return (
            <div key={m.id} style={{
              display: "flex",
              flexDirection: isCEO ? "row-reverse" : "row",
              gap: 6, alignItems: "flex-end",
            }}>
              <div style={{
                flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
                background: color, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700,
              }}>{name.slice(0, 1)}</div>
              <div style={{ maxWidth: "82%" }}>
                {!isCEO && (
                  <div style={{ fontSize: 10, color: "var(--ink-4)", marginBottom: 2, paddingLeft: 4 }}>
                    {name}
                  </div>
                )}
                <div style={{
                  fontSize: 13, lineHeight: 1.55,
                  background: isCEO ? "var(--gold)" : "var(--card)",
                  color: isCEO ? "#fff" : "var(--ink)",
                  border: isCEO ? "none" : "1px solid var(--line)",
                  borderRadius: isCEO ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  padding: "9px 12px",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>{m.content}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer + end-meeting (sticky bottom, clears bottom-tabs) */}
      {isLive && (
        <div style={{ flexShrink: 0, paddingTop: 6, paddingBottom: 92, background: "var(--paper)" }}>
          <div style={{
            display: "flex", gap: 8, alignItems: "center",
            background: "var(--card)", border: "1px solid var(--line-2)",
            borderRadius: 999, padding: "7px 7px 7px 14px",
            marginBottom: 8,
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={sending}
              placeholder={sending ? "发送中…" : "你说点什么 → 参与者会依次回应"}
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                fontSize: 13, color: "var(--ink)",
              }}
            />
            <button
              type="button" onClick={send}
              disabled={!input.trim() || sending}
              style={{
                width: 32, height: 32, borderRadius: "50%", border: "none",
                background: input.trim() && !sending ? "var(--gold)" : "var(--paper-2)",
                color: input.trim() && !sending ? "#fff" : "var(--ink-4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: input.trim() && !sending ? "pointer" : "default",
              }}
            >{sending ? <Loader2 size={13} className="pulse-dot" /> : <Send size={13} />}</button>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button" onClick={summarize} disabled={summarizing}
              style={{
                padding: "7px 10px",
                border: "1px solid var(--line)", borderRadius: 999,
                background: "transparent", fontSize: 11, color: "var(--ink-3)",
                cursor: summarizing ? "not-allowed" : "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}
            >
              <FileText size={11} />
              {summarizing ? "总结中…" : "总结并结束"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
