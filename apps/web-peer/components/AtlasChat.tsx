"use client";

import { Check, Send, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { AwaitingAssignment } from "../lib/v2-data";

type Msg = { role: "user" | "assistant"; content: string };

function AwaitingBanner({ items }: { items: AwaitingAssignment[] }) {
  const router = useRouter();
  const [states, setStates] = useState<Record<string, "approved" | "rejected" | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function decide(id: string, status: "completed" | "cancelled") {
    setLoading((s) => ({ ...s, [id]: true }));
    await fetch(`/api/v2/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    setStates((s) => ({ ...s, [id]: status === "completed" ? "approved" : "rejected" }));
    setLoading((s) => ({ ...s, [id]: false }));
    router.refresh();
  }

  const pending = items.filter((item) => !states[item.id]);
  if (!pending.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
      {pending.map((item) => (
        <div key={item.id} style={{
          display: "flex", gap: 10, alignItems: "flex-start",
          background: "var(--gold-soft)", border: "1px solid oklch(0.62 0.14 70 / 0.3)",
          borderRadius: 16, padding: "10px 12px",
        }}>
          <Zap size={14} style={{ color: "var(--gold)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "oklch(0.44 0.11 70)", marginBottom: 3 }}>需要你决策</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{item.title}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" disabled={loading[item.id]}
                onClick={() => decide(item.id, "completed")}
                style={{
                  padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                  background: "var(--gold)", color: "#fff", border: "none",
                  cursor: loading[item.id] ? "not-allowed" : "pointer",
                }}>
                <Check size={11} style={{ marginRight: 3 }} />批准
              </button>
              <button type="button" disabled={loading[item.id]}
                onClick={() => decide(item.id, "cancelled")}
                style={{
                  padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                  background: "oklch(0.58 0.19 25 / 0.1)", color: "var(--red)",
                  border: "1px solid oklch(0.58 0.19 25 / 0.25)",
                  cursor: loading[item.id] ? "not-allowed" : "pointer",
                }}>
                <X size={11} style={{ marginRight: 3 }} />拒绝
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AtlasChat({ awaiting }: { awaiting: AwaitingAssignment[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "有什么需要处理的？" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/v2/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content ?? data.error ?? "（出错了）";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "网络错误，请稍后再试。" }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 140px)" }}>

      {/* Pending decisions at top */}
      <AwaitingBanner items={awaiting} />

      {/* Chat thread */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, paddingBottom: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            flexDirection: msg.role === "user" ? "row-reverse" : "row",
            gap: 8, alignItems: "flex-end",
          }}>
            <div style={{
              maxWidth: "80%",
              background: msg.role === "user" ? "var(--gold)" : "var(--card)",
              color: msg.role === "user" ? "#fff" : "var(--ink)",
              border: msg.role === "user" ? "none" : "1px solid var(--line)",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "10px 14px",
              fontSize: 14,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{
              background: "var(--card)", border: "1px solid var(--line)",
              borderRadius: "18px 18px 18px 4px", padding: "10px 14px",
              display: "flex", gap: 4, alignItems: "center",
            }}>
              {[0, 1, 2].map((n) => (
                <div key={n} className="pulse-dot" style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "var(--ink-4)",
                  animationDelay: `${n * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ position: "sticky", bottom: 88, paddingBottom: 8 }}>
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
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="和 Atlas 说话…"
            disabled={sending}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: 14, color: "var(--ink)",
            }}
          />
          <button
            type="button"
            onClick={send}
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
