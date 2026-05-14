"use client";

import { Check, Crown, FileText, Inbox, Mic, MicOff, Send, UsersRound, X, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { AwaitingAssignment, DeliverableRow, DashboardMetrics, RunningAssignment, CompletedHandoff } from "../lib/v2-data";
import { MissionInbox } from "./MissionInbox";
import { CeoSheet } from "./CeoSheet";
import { MeetingInvites } from "./MeetingInvites";

const CHAT_KEY = "mibusy-chat-v1";
const CLEARED_AT_KEY = "mibusy-chat-cleared-at";
const SEEN_HANDOFFS_KEY = "mibusy-seen-handoffs-v1";

function loadSeenHandoffs(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_HANDOFFS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveSeenHandoffs(s: Set<string>) {
  try { localStorage.setItem(SEEN_HANDOFFS_KEY, JSON.stringify([...s])); } catch {}
}

function getClearedAt(): number {
  if (typeof window === "undefined") return 0;
  const v = localStorage.getItem(CLEARED_AT_KEY);
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

function markChatCleared(): string {
  const now = new Date().toISOString();
  try {
    localStorage.setItem(CLEARED_AT_KEY, now);
    localStorage.setItem(SEEN_HANDOFFS_KEY, "[]");
    localStorage.removeItem(CHAT_KEY);
  } catch {}
  return now;
}

// ── Types ────────────────────────────────────────────────────────────────────

type ChatMsg = { role: "user" | "assistant"; content: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

// Strip markdown syntax for plain-text preview
function cleanPreview(text: string): string {
  const lines = text.split('\n');
  // skip leading separator / header lines, find first real sentence
  const start = lines.findIndex(l => l.trim() && l.trim() !== '---' && !l.trim().startsWith('#'));
  const slice = start >= 0 ? lines.slice(start) : lines;
  return slice
    .filter(l => l.trim() !== '---')
    .map(l => l.replace(/^#+\s*/, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').trim())
    .filter(Boolean)
    .join(' ');
}

// Inline markdown → React elements (bold, HR, bullet, header)
function MdLine({ text }: { text: string }) {
  // Split on **...**
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i}>{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

type MdSegment = { type: 'lines'; lines: string[] } | { type: 'table'; rows: string[][] };

function parseSegments(content: string): MdSegment[] {
  const rawLines = content.split('\n');
  const segments: MdSegment[] = [];
  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];
    if (line.trim().startsWith('|') && line.includes('|', 1)) {
      const tableLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|')) {
        tableLines.push(rawLines[i]);
        i++;
      }
      // skip separator rows (only |, -, :, space)
      const rows = tableLines
        .filter(l => l.replace(/[|\s\-:]/g, '').length > 0)
        .map(l => l.split('|').slice(1, -1).map(c => c.trim()));
      if (rows.length > 0) segments.push({ type: 'table', rows });
    } else {
      const last = segments[segments.length - 1];
      if (last?.type === 'lines') last.lines.push(line);
      else segments.push({ type: 'lines', lines: [line] });
      i++;
    }
  }
  return segments;
}

function renderLine(line: string, key: string) {
  if (line.trim() === '---') return <hr key={key} style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '6px 0' }} />;
  const hm = line.match(/^(#{1,3})\s+(.*)/);
  if (hm) return <div key={key} style={{ fontWeight: 700, fontSize: hm[1].length === 1 ? 15 : 13, marginTop: 6 }}><MdLine text={hm[2]} /></div>;
  if (line.startsWith('* ') || line.startsWith('- ')) return <div key={key} style={{ paddingLeft: 12 }}>• <MdLine text={line.slice(2)} /></div>;
  return <div key={key}><MdLine text={line} /></div>;
}

function MarkdownText({ content }: { content: string }) {
  const segments = parseSegments(content);
  return (
    <div style={{ wordBreak: "break-word" }}>
      {segments.map((seg, si) => {
        if (seg.type === 'table') {
          const [header, ...body] = seg.rows;
          return (
            <table key={si} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, margin: '6px 0' }}>
              <thead>
                <tr>{header.map((cell, ci) => (
                  <th key={ci} style={{ textAlign: 'left', padding: '3px 6px', borderBottom: '1px solid var(--line)', fontWeight: 600 }}>
                    <MdLine text={cell} />
                  </th>
                ))}</tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: '2px 6px', borderBottom: '1px solid var(--line)', verticalAlign: 'top' }}>
                        <MdLine text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        return seg.lines.map((line, li) => renderLine(line, `${si}-${li}`));
      })}
    </div>
  );
}

function todayString() {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日 ${["星期日","星期一","星期二","星期三","星期四","星期五","星期六"][d.getDay()]}`;
}

const TONE_MAP: Record<string, string> = {
  Nova: "#2E7D52", Ledger: "#1A5E8A", Quill: "#7B4FAB",
  Scheduler: "#8A5500", Beacon: "#444444",
};
function agentColor(name: string) { return TONE_MAP[name] ?? "#888888"; }

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricsBar({ m, onOpenCeo }: { m: DashboardMetrics; onOpenCeo: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ color: "var(--ink-3)", fontSize: 13 }}>{todayString()}</div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink-3)" }}>
          <UsersRound size={13} />{m.activeStaff}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: m.needsDecision > 0 ? "oklch(0.44 0.11 70)" : "var(--ink-3)" }}>
          <Inbox size={13} />{m.needsDecision}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink-3)" }}>
          <FileText size={13} />{m.deliveredToday}
        </span>
        <button
          type="button" onClick={onOpenCeo}
          title="CEO 配置（你自己）"
          style={{
            width: 28, height: 28, border: "none", borderRadius: "50%",
            background: "var(--gold)", color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginLeft: 4,
          }}
        >
          <Crown size={14} />
        </button>
      </div>
    </div>
  );
}

function DecisionCard({ item, onDone }: { item: AwaitingAssignment; onDone: () => void }) {
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const router = useRouter();

  async function decide(status: "completed" | "cancelled") {
    const key = status === "completed" ? "approve" : "reject";
    setLoading(key);
    await fetch(`/api/v2/assignments/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    setDone(status === "completed" ? "approved" : "rejected");
    setLoading(null);
    router.refresh();
    onDone();
  }

  if (done) return null;

  return (
    <div style={{
      display: "flex", gap: 10, background: "var(--gold-soft)",
      border: "1px solid oklch(0.62 0.14 70 / 0.3)",
      borderRadius: 18, padding: "12px 14px",
    }}>
      <Zap size={15} style={{ color: "var(--gold)", flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "oklch(0.44 0.11 70)", marginBottom: 4 }}>需要决策</div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{item.title}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" disabled={!!loading} onClick={() => decide("completed")} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "4px 12px",
            borderRadius: 999, fontSize: 12, fontWeight: 600,
            background: "var(--gold)", color: "#fff", border: "none",
            cursor: loading ? "not-allowed" : "pointer",
          }}><Check size={11} />{loading === "approve" ? "…" : "批准"}</button>
          <button type="button" disabled={!!loading} onClick={() => decide("cancelled")} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "4px 12px",
            borderRadius: 999, fontSize: 12, fontWeight: 600,
            background: "oklch(0.58 0.19 25 / 0.1)", color: "var(--red)",
            border: "1px solid oklch(0.58 0.19 25 / 0.25)",
            cursor: loading ? "not-allowed" : "pointer",
          }}><X size={11} />{loading === "reject" ? "…" : "拒绝"}</button>
        </div>
      </div>
    </div>
  );
}

function DeliverableCard({ item }: { item: DeliverableRow }) {
  const [expanded, setExpanded] = useState(false);
  const color = agentColor(item.agent_name ?? "");
  return (
    <button type="button" onClick={() => setExpanded(v => !v)} style={{
      display: "flex", gap: 10, width: "100%", textAlign: "left",
      background: "var(--card)", border: "1px solid var(--line)",
      borderRadius: 18, padding: "12px 14px", cursor: "pointer",
    }}>
      <div style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: "50%",
        background: color, display: "flex", alignItems: "center",
        justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700,
      }}>{(item.agent_name ?? "?").slice(0, 1)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {item.agent_name} · {new Date(item.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="badge completed" style={{ flexShrink: 0 }}>delivered</span>
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
        <div style={{
          fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5,
          maxHeight: expanded ? "none" : 38, overflow: "hidden",
        }}>
          {expanded
            ? <MarkdownText content={item.body.slice(0, 2000)} />
            : <>{cleanPreview(item.body).slice(0, 100)}{cleanPreview(item.body).length > 100 ? "…" : ""}</>
          }
        </div>
      </div>
    </button>
  );
}

// Progress card for running/queued tasks
function ProgressCard({ item }: { item: RunningAssignment }) {
  const isRunning = item.status === "running";
  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "center",
      background: "var(--card)", border: "1px solid var(--line)",
      borderRadius: 18, padding: "12px 14px", opacity: 0.85,
    }}>
      <div className={isRunning ? "pulse-dot" : undefined} style={{
        flexShrink: 0, width: 8, height: 8, borderRadius: "50%",
        background: isRunning ? "var(--blue)" : "var(--ink-4)",
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 2 }}>
          {item.agent_name ?? "Agent"} · {isRunning ? "执行中…" : "排队中"}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>{item.title}</div>
      </div>
      <span className={`badge ${isRunning ? "running" : ""}`} style={{ flexShrink: 0, fontSize: 10 }}>
        {isRunning ? "running" : "queued"}
      </span>
    </div>
  );
}

// Scrollable running task list — shows 2 by default, expands to scrollable list
function RunningList({ items }: { items: RunningAssignment[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 2);
  const hidden = items.length - 2;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{
        display: "flex", flexDirection: "column", gap: 6,
        maxHeight: expanded ? 220 : "none",
        overflowY: expanded ? "auto" : "visible",
        paddingRight: expanded ? 2 : 0,
      }}>
        {visible.map(item => <ProgressCard key={item.id} item={item} />)}
      </div>
      {!expanded && hidden > 0 && (
        <button type="button" onClick={() => setExpanded(true)} style={{
          background: "none", border: "none", color: "var(--ink-3)",
          fontSize: 12, textAlign: "center", padding: "4px 0", cursor: "pointer",
        }}>
          还有 {hidden} 个任务在排队 ↑
        </button>
      )}
      {expanded && (
        <button type="button" onClick={() => setExpanded(false)} style={{
          background: "none", border: "none", color: "var(--ink-3)",
          fontSize: 12, textAlign: "center", padding: "4px 0", cursor: "pointer",
        }}>
          收起 ↑
        </button>
      )}
    </div>
  );
}

// Small neutral dot — no name
const AiDot = () => (
  <div style={{
    flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
    background: "var(--line-2)", marginBottom: 2,
  }} />
);

// ── Main component ────────────────────────────────────────────────────────────

export function TodayPage({
  deliverables,
  awaiting,
  metrics,
  initialRunning = [],
}: {
  deliverables: DeliverableRow[];
  awaiting: AwaitingAssignment[];
  metrics: DashboardMetrics;
  initialRunning?: RunningAssignment[];
}) {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  // Important: do NOT initialize from localStorage during render — that causes
  // SSR/CSR hydration mismatch and breaks click handlers throughout the page.
  // Always start [], hydrate in a useEffect AFTER mount.
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage post-mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_KEY);
      if (raw) setChat(JSON.parse(raw));
    } catch {}
    try {
      const prefill = localStorage.getItem("chat-prefill") ?? "";
      if (prefill) { setInput(prefill); localStorage.removeItem("chat-prefill"); }
    } catch {}
    setHydrated(true);
  }, []);
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [liveDeliverables, setLiveDeliverables] = useState<DeliverableRow[]>(deliverables);
  const [liveAwaiting, setLiveAwaiting] = useState<AwaitingAssignment[]>(awaiting);
  const [liveMetrics, setLiveMetrics] = useState<DashboardMetrics>(metrics);
  const [liveRunning, setLiveRunning] = useState<RunningAssignment[]>(initialRunning);
  const seenHandoffs = useRef<Set<string>>(loadSeenHandoffs());
  // Start poll cutoff at the later of: (a) 5 min ago, (b) the last chat-clear time.
  // This way, after a clear we don't re-inject already-completed handoffs.
  const lastPollRef = useRef<string>((() => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const clearedAt = getClearedAt();
    return new Date(Math.max(fiveMinAgo, clearedAt)).toISOString();
  })());

  // Persist chat to localStorage — but only after hydration so we don't
  // accidentally wipe stored chat with the empty initial state.
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(chat.slice(-60))); } catch {}
  }, [chat, hydrated]);

  // Poll feed every 8s — running tasks + handoffs + deliverables
  const pollFeed = useCallback(async () => {
    try {
      const since = lastPollRef.current;
      const res = await fetch(`/api/v2/feed?since=${encodeURIComponent(since)}`);
      if (!res.ok) return;
      lastPollRef.current = new Date().toISOString();
      const data = await res.json();
      setLiveDeliverables(data.deliverables ?? []);
      setLiveAwaiting(data.awaiting ?? []);
      setLiveMetrics(data.metrics ?? metrics);
      setLiveRunning(data.running ?? []);

      // Handoff: inject AI message for each newly-completed task — but
      // suppress anything completed before the most recent chat clear.
      const handoffs: CompletedHandoff[] = data.handoffs ?? [];
      const clearedAt = getClearedAt();
      let touched = false;
      for (const h of handoffs) {
        if (seenHandoffs.current.has(h.id)) continue;
        if (clearedAt > 0 && new Date(h.completed_at).getTime() < clearedAt) {
          // Pre-clear handoff — mark as seen so we never inject it, but don't render.
          seenHandoffs.current.add(h.id);
          touched = true;
          continue;
        }
        seenHandoffs.current.add(h.id);
        touched = true;
        const snippet = cleanPreview(h.deliverable_summary).slice(0, 120);
        const msg: ChatMsg = {
          role: "assistant",
          content: `✓ ${h.agent_name ?? "Agent"} 完成了「${h.title}」\n\n${snippet}…\n\n点击上方查看完整报告。`,
        };
        setChat(prev => [...prev, msg]);
      }
      if (touched) saveSeenHandoffs(seenHandoffs.current);
    } catch {}
  }, [metrics]);

  useEffect(() => {
    pollFeed(); // immediate on mount
    const id = setInterval(pollFeed, 8_000);
    return () => clearInterval(id);
  }, [pollFeed]);

  // Scheduler tick — dev fallback. In prod, system cron should hit this every minute.
  useEffect(() => {
    function tick() { fetch("/api/v2/tick", { method: "POST" }).catch(() => {}); }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Cross-component clear: listen for the broadcast event CeoSheet fires
  useEffect(() => {
    function onExternalClear() {
      setChat([]);
      markChatCleared();
      seenHandoffs.current.clear();
      lastPollRef.current = new Date().toISOString();
    }
    window.addEventListener("mibusy-chat-clear", onExternalClear);
    return () => window.removeEventListener("mibusy-chat-clear", onExternalClear);
  }, []);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat, sending]);

  const visibleAwaiting = liveAwaiting.filter(a => !dismissed.has(a.id));
  const hasFeedContent = visibleAwaiting.length > 0 || liveRunning.length > 0 || liveDeliverables.length > 0;
  const [feedOpen, setFeedOpen] = useState(false);
  const [ceoOpen, setCeoOpen] = useState(false);

  // Auto-open feed once when a new decision comes in
  const lastAwaitingCount = useRef(visibleAwaiting.length);
  useEffect(() => {
    if (visibleAwaiting.length > lastAwaitingCount.current) setFeedOpen(true);
    lastAwaitingCount.current = visibleAwaiting.length;
  }, [visibleAwaiting.length]);

  function toggleVoice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { alert("当前浏览器不支持语音输入"); return; }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const r = new SR();
    r.lang = "zh-CN";
    r.continuous = false;
    r.interimResults = false;
    recognitionRef.current = r;

    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      const transcript = Array.from(e.results as ArrayLike<{ 0: { transcript: string } }>)
        .map(res => res[0].transcript).join("");
      if (transcript) setInput(prev => prev ? prev + " " + transcript : transcript);
    };
    r.start();
  }

  function handleSlashCommand(text: string): boolean {
    if (!text.startsWith("/")) return false;
    const [cmd, ...rest] = text.slice(1).trim().split(/\s+/);
    const arg = rest.join(" ");

    switch (cmd.toLowerCase()) {
      case "clear":
      case "清空": {
        setInput("");
        setChat([]);
        markChatCleared();
        seenHandoffs.current.clear();
        lastPollRef.current = new Date().toISOString();
        return true;
      }
      case "compact":
      case "浓缩": {
        const n = parseInt(arg, 10);
        const keep = Number.isFinite(n) && n > 0 ? Math.min(200, n) : 20;
        setInput("");
        setChat(prev => {
          const kept = prev.slice(-keep);
          return [...kept, { role: "assistant", content: `已浓缩：保留最近 ${kept.length} 条。` }];
        });
        return true;
      }
      case "help":
      case "?": {
        setInput("");
        const helpMsg = `可用指令：
/clear（或 /清空） — 清空整个对话
/compact [N]（或 /浓缩 [N]） — 保留最近 N 条，默认 20
/help — 查看指令列表

或者直接用自然语言：『清空对话』『太长了，精简一下』，我也会处理。`;
        setChat(prev => [...prev, { role: "assistant", content: helpMsg }]);
        return true;
      }
      default:
        return false; // unknown slash → pass through to LLM
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    // Slash command — handle locally, don't hit the LLM
    if (handleSlashCommand(text)) return;

    const next: ChatMsg[] = [...chat, { role: "user", content: text }];
    setChat(next);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/v2/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      const reply = data.content ?? data.error ?? "出错了";

      // Side-effect actions from LLM tool calls
      if (data.action === "clear_chat") {
        // Show the LLM's reply briefly, then clear
        setChat([{ role: "assistant", content: reply }]);
        markChatCleared();
        seenHandoffs.current.clear();
        lastPollRef.current = new Date().toISOString();
        // After a beat, fully empty
        setTimeout(() => setChat([]), 1500);
        return;
      }
      if (data.action === "compact_chat") {
        const keep = Math.max(1, Math.min(200, data.keep ?? 20));
        setChat(prev => {
          const kept = prev.slice(-keep);
          return [...kept, { role: "assistant", content: reply }];
        });
        return;
      }

      setChat(prev => [...prev, { role: "assistant", content: reply }]);
      // If a task was delegated, poll feed sooner to pick up queued assignment
      if (data.delegated) setTimeout(pollFeed, 3000);
    } catch {
      setChat(prev => [...prev, { role: "assistant", content: "网络错误，请稍后再试。" }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>

      <MetricsBar m={liveMetrics} onOpenCeo={() => setCeoOpen(true)} />

      {ceoOpen && <CeoSheet onClose={() => setCeoOpen(false)} />}

      {/* ── Mission inbox: incoming work from upstream — top priority */}
      <MissionInbox />

      {/* ── Meeting invites (pending or live) */}
      <MeetingInvites />

      {/* ── Decisions are urgent — always visible if any */}
      {visibleAwaiting.map(item => (
        <DecisionCard key={item.id} item={item} onDone={() => setDismissed(s => new Set([...s, item.id]))} />
      ))}

      {/* ── Notice bar: collapsible feed of running + deliverables */}
      {hasFeedContent && (
        <div style={{ marginBottom: feedOpen ? 12 : 8 }}>
          <button
            type="button"
            onClick={() => setFeedOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              background: feedOpen ? "var(--card)" : "var(--paper-2)",
              border: "1px solid var(--line)",
              borderRadius: feedOpen ? "14px 14px 0 0" : 14,
              padding: "9px 14px", cursor: "pointer",
              fontSize: 13, color: "var(--ink-2)", textAlign: "left",
              transition: "background 150ms, border-radius 150ms",
            }}
          >
            <div style={{ display: "flex", gap: 14, alignItems: "center", flex: 1, flexWrap: "wrap" }}>
              {liveRunning.length > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue)", display: "inline-block" }} />
                  {liveRunning.length} 个执行中
                </span>
              )}
              {liveDeliverables.length > 0 && (
                <span style={{ color: "var(--ink-3)" }}>
                  {liveDeliverables.length} 项交付
                </span>
              )}
            </div>
            <span style={{ fontSize: 12, color: "var(--ink-4)" }}>
              {feedOpen ? "收起 ↑" : "查看 ↓"}
            </span>
          </button>

          {feedOpen && (
            <div style={{
              border: "1px solid var(--line)", borderTop: "none",
              borderRadius: "0 0 14px 14px",
              padding: "12px 14px",
              display: "flex", flexDirection: "column", gap: 8,
              maxHeight: 320, overflowY: "auto",
              background: "var(--paper)",
            }}>
              {liveRunning.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {liveRunning.map(item => <ProgressCard key={item.id} item={item} />)}
                </div>
              )}
              {liveDeliverables.map(item => (
                <DeliverableCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CHAT SECTION */}
      <div
        ref={chatScrollRef}
        style={{
          flex: 1, overflowY: "auto", minHeight: 0,
          display: "flex", flexDirection: "column", gap: 8, padding: "8px 0",
        }}
      >
        {chat.length === 0 && (
          <div className="empty-state">在下方发送消息开始对话</div>
        )}

        {chat.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            flexDirection: msg.role === "user" ? "row-reverse" : "row",
            gap: 8, alignItems: "flex-end",
          }}>
            {msg.role === "assistant" && <AiDot />}
            <div style={{
              maxWidth: "78%",
              background: msg.role === "user" ? "var(--gold)" : "var(--card)",
              color: msg.role === "user" ? "#fff" : "var(--ink)",
              border: msg.role === "user" ? "none" : "1px solid var(--line)",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "10px 14px", fontSize: 14, lineHeight: 1.5,
            }}>
              {msg.role === "assistant"
                ? <MarkdownText content={msg.content} />
                : <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</span>
              }
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <AiDot />
            <div style={{
              background: "var(--card)", border: "1px solid var(--line)",
              borderRadius: "18px 18px 18px 4px", padding: "10px 14px",
              display: "flex", gap: 4, alignItems: "center",
            }}>
              {[0,1,2].map(n => (
                <div key={n} className="pulse-dot" style={{
                  width: 6, height: 6, borderRadius: "50%", background: "var(--ink-4)",
                  animationDelay: `${n * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pinned input — outside both scrolls, clears tab bar */}
      <div style={{ flexShrink: 0, paddingBottom: 88, paddingTop: 6, background: "var(--paper)" }}>
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          background: "var(--card)", border: "1px solid var(--line-2)",
          borderRadius: 999, padding: "8px 8px 8px 16px",
          boxShadow: "0 2px 12px rgb(0 0 0 / 0.08)",
        }}>
          <button
            type="button"
            onClick={toggleVoice}
            style={{
              width: 34, height: 34, borderRadius: "50%", border: "none", flexShrink: 0,
              background: listening ? "oklch(0.58 0.19 25 / 0.15)" : "transparent",
              color: listening ? "oklch(0.58 0.19 25)" : "var(--ink-4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "background 150ms, color 150ms",
            }}
          >
            {listening ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={listening ? "正在聆听…" : "指令或问题…（/help 看快捷指令）"}
            disabled={sending}
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: "var(--ink)" }}
          />
          <button type="button" onClick={send} disabled={!input.trim() || sending} style={{
            width: 34, height: 34, borderRadius: "50%", border: "none",
            background: input.trim() && !sending ? "var(--gold)" : "var(--paper-2)",
            color: input.trim() && !sending ? "#fff" : "var(--ink-4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: input.trim() && !sending ? "pointer" : "default",
            flexShrink: 0, transition: "background 150ms, color 150ms",
          }}>
            <Send size={15} />
          </button>
        </div>
      </div>

    </div>
  );
}
