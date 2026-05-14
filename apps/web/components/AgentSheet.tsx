"use client";

import { Send, Settings, X, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { AgentDetail, StaffRow } from "../lib/v2-data";
import { AssignTaskButton } from "./AssignTaskButton";
import { BudgetRow } from "./BudgetRow";
import { ConnectionsList } from "./ConnectionsList";
import { AgentTaskStrip } from "./AgentTaskStrip";
import { FacadeConfig } from "./FacadeConfig";

const TONE_MAP: Record<string, string> = {
  Atlas: "#B5892A", Nova: "#2E7D52", Ledger: "#1A5E8A",
  Quill: "#7B4FAB", Scheduler: "#8A5500", Beacon: "#444444",
};
function agentColor(name: string) { return TONE_MAP[name] ?? "#888888"; }

// ── Per-agent private chat ────────────────────────────────────────────────────

type AgentMsg = { role: "user" | "agent"; content: string; ts: number };

function AgentChatPanel({ agentId, agentName }: { agentId: string; agentName: string }) {
  const STORAGE_KEY = `mibusy-agent-chat-${agentId}-v1`;
  const [msgs, setMsgs] = useState<AgentMsg[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const color = agentColor(agentName);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-40))); } catch {}
  }, [msgs, STORAGE_KEY]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, pendingId]);

  useEffect(() => {
    if (!pendingId) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/v2/assignments/${pendingId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "completed" && data.deliverable_body) {
          setMsgs(prev => [...prev, { role: "agent", content: data.deliverable_body, ts: Date.now() }]);
          setPendingId(null);
        } else if (["failed", "cancelled"].includes(data.status)) {
          setMsgs(prev => [...prev, { role: "agent", content: "任务执行失败，请重试。", ts: Date.now() }]);
          setPendingId(null);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(id);
  }, [pendingId]);

  async function send() {
    const text = input.trim();
    if (!text || pendingId) return;
    setMsgs(prev => [...prev, { role: "user", content: text, ts: Date.now() }]);
    setInput("");
    try {
      const res = await fetch("/api/v2/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: text.slice(0, 60), prompt: text,
          assigned_to_agent_id: agentId,
          origin: "private_chat",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPendingId(data.id);
      }
    } catch {}
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div ref={scrollRef} style={{
        flex: 1, overflowY: "auto", display: "flex",
        flexDirection: "column", gap: 10, padding: "12px 4px 14px",
      }}>
        {msgs.length === 0 && (
          <div style={{
            textAlign: "center", color: "var(--ink-3)", fontSize: 13,
            padding: "40px 20px", lineHeight: 1.7,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            和 {agentName} 开始对话
            <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 6 }}>
              发任何消息，{agentName} 会执行并回复
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{
            display: "flex",
            flexDirection: m.role === "user" ? "row-reverse" : "row",
            gap: 8, alignItems: "flex-end",
          }}>
            {m.role === "agent" && (
              <div style={{
                flexShrink: 0, width: 26, height: 26, borderRadius: "50%",
                background: color, display: "flex",
                alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 12, fontWeight: 700,
              }}>{agentName.slice(0, 1)}</div>
            )}
            <div style={{
              maxWidth: "76%", fontSize: 14, lineHeight: 1.55,
              background: m.role === "user" ? "var(--gold)" : "var(--card)",
              color: m.role === "user" ? "#fff" : "var(--ink)",
              border: m.role === "user" ? "none" : "1px solid var(--line)",
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              padding: "10px 14px", whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>{m.content}</div>
          </div>
        ))}
        {pendingId && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{
              flexShrink: 0, width: 26, height: 26, borderRadius: "50%",
              background: color, display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 12, fontWeight: 700,
            }}>{agentName.slice(0, 1)}</div>
            <div style={{
              background: "var(--card)", border: "1px solid var(--line)",
              borderRadius: "16px 16px 16px 4px", padding: "10px 14px",
              display: "flex", gap: 4, alignItems: "center",
            }}>
              {[0, 1, 2].map(n => (
                <div key={n} className="pulse-dot" style={{
                  width: 6, height: 6, borderRadius: "50%", background: "var(--ink-4)",
                  animationDelay: `${n * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{
        flexShrink: 0, display: "flex", gap: 8, alignItems: "center",
        background: "var(--card)", border: "1px solid var(--line-2)",
        borderRadius: 999, padding: "8px 8px 8px 16px",
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={pendingId ? "思考中…" : "给 " + agentName + " 发消息…"}
          disabled={!!pendingId}
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            fontSize: 14, color: "var(--ink)",
          }}
        />
        <button
          type="button" onClick={send}
          disabled={!input.trim() || !!pendingId}
          style={{
            width: 36, height: 36, borderRadius: "50%", border: "none", flexShrink: 0,
            background: input.trim() && !pendingId ? "var(--gold)" : "var(--paper-2)",
            color: input.trim() && !pendingId ? "#fff" : "var(--ink-4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: input.trim() && !pendingId ? "pointer" : "default",
            transition: "background 150ms, color 150ms",
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Inline editable field ─────────────────────────────────────────────────────

function InlineField({
  label,
  value,
  onSave,
  multiline = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  onSave: (v: string) => Promise<void>;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  function startEdit() {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function save() {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(draft); } finally { setSaving(false); setEditing(false); }
  }

  const sharedInputStyle: React.CSSProperties = {
    display: "block", width: "100%", boxSizing: "border-box",
    padding: "10px 12px", borderRadius: 10,
    border: "1px solid var(--gold)", fontSize: 14,
    background: "var(--card)", color: "var(--ink)", outline: "none",
    fontFamily: "inherit", lineHeight: 1.5,
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        {label}
        {saving && <span style={{ color: "var(--ink-4)", fontStyle: "italic" }}>保存中…</span>}
      </div>
      {editing ? (
        multiline ? (
          <textarea
            ref={inputRef}
            value={draft}
            rows={6}
            onChange={e => setDraft(e.target.value)}
            onBlur={save}
            style={{ ...sharedInputStyle, resize: "vertical" }}
          />
        ) : (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            style={sharedInputStyle}
          />
        )
      ) : (
        <div
          onClick={startEdit}
          style={{
            fontSize: 14, color: value ? "var(--ink)" : "var(--ink-4)",
            lineHeight: 1.55, padding: "6px 2px", cursor: "text",
            borderBottom: "1px dashed var(--line)",
            transition: "border-color 150ms",
            minHeight: 22,
          }}
        >
          {value || <span style={{ color: "var(--ink-4)", fontStyle: "italic" }}>{placeholder || "点击编辑…"}</span>}
        </div>
      )}
    </div>
  );
}

// ── Manage drawer (slides over chat) ──────────────────────────────────────────

function ManageDrawer({
  agent,
  detail,
  allStaff,
  systemPrompt, setSystemPrompt,
  agentRole, setAgentRole,
  proxyAgentId, setProxyAgentId,
  workToken,
  lastSeen,
  isOnline,
  generatingToken,
  copied,
  onClose,
  onGenerateToken,
  onCopyToken,
  onSaveField,
  onRebuild,
  onDismiss,
  onReloadDetail,
}: {
  agent: StaffRow;
  detail: AgentDetail | null;
  allStaff: StaffRow[];
  systemPrompt: string; setSystemPrompt: (v: string) => void;
  agentRole: string; setAgentRole: (v: string) => void;
  proxyAgentId: string; setProxyAgentId: (v: string) => void;
  workToken: string | null;
  lastSeen: string | null;
  isOnline: boolean;
  generatingToken: boolean;
  copied: boolean;
  onClose: () => void;
  onGenerateToken: () => void;
  onCopyToken: () => void;
  onSaveField: (fields: { system_prompt?: string; role?: string; proxy_agent_id?: string | null; monthly_budget?: number | null }) => Promise<void>;
  onRebuild: () => void;
  onDismiss: () => void;
  onReloadDetail: () => void;
}) {
  return (
    <div style={{
      position: "absolute", inset: 0, background: "var(--paper)",
      display: "flex", flexDirection: "column",
      animation: "slideInRight 200ms ease-out",
    }}>
      {/* Drawer header */}
      <div style={{
        flexShrink: 0, padding: "16px 20px",
        borderBottom: "1px solid var(--line)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: 32, height: 32, border: "none", borderRadius: "50%",
            background: "var(--paper-2)", cursor: "pointer",
            color: "var(--ink-2)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 2 }}>配置</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>{agent.name}</div>
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: "auto", padding: "20px",
        display: "flex", flexDirection: "column", gap: 22,
      }}>
        {/* Stats */}
        {detail && (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{
              flex: 1, padding: "10px 12px", borderRadius: 12,
              background: "var(--card)", border: "1px solid var(--line)",
            }}>
              <div style={{ fontSize: 11, color: "var(--ink-4)" }}>总任务</div>
              <div style={{ fontSize: 20, fontFamily: "var(--serif)", fontWeight: 700 }}>{detail.totalAssignments}</div>
            </div>
            <div style={{
              flex: 1, padding: "10px 12px", borderRadius: 12,
              background: "var(--card)", border: "1px solid var(--line)",
            }}>
              <div style={{ fontSize: 11, color: "var(--ink-4)" }}>已完成</div>
              <div style={{ fontSize: 20, fontFamily: "var(--serif)", fontWeight: 700 }}>{detail.completedAssignments}</div>
            </div>
          </div>
        )}

        <InlineField
          label="职务"
          value={agentRole}
          placeholder="例：首席运营官、研究分析师…"
          onSave={async v => { setAgentRole(v); await onSaveField({ role: v }); }}
        />

        <InlineField
          label="角色设定 / 工作风格"
          value={systemPrompt}
          placeholder={`描述 ${agent.name} 的工作方式、擅长领域、行为风格…`}
          multiline
          onSave={async v => { setSystemPrompt(v); await onSaveField({ system_prompt: v }); }}
        />

        {/* Per-agent budget */}
        <BudgetRow
          label="月预算"
          budget={detail?.monthly_budget ?? null}
          spent={detail?.monthSpent ?? 0}
          onSave={async v => { await onSaveField({ monthly_budget: v }); }}
          hint="本月该员工完成任务累计消耗"
        />

        <div>
          <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 6 }}>离线代理</div>
          <select
            value={proxyAgentId}
            onChange={async e => {
              const v = e.target.value;
              setProxyAgentId(v);
              await onSaveField({ proxy_agent_id: v || null });
            }}
            style={{
              display: "block", width: "100%", padding: "10px 12px",
              borderRadius: 10, border: "1px solid var(--line-2)", fontSize: 14,
              background: "var(--card)", color: "var(--ink)", outline: "none",
            }}
          >
            <option value="">不设代理</option>
            {allStaff.filter(s => s.id !== agent.id).map(s => (
              <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
            节点 30 分钟无响应时由代理接管任务
          </div>
        </div>

        {/* Façade mode (V3) — config first because it changes the meaning of everything below */}
        {detail && (
          <FacadeConfig
            agentId={agent.id}
            agentName={agent.name}
            agentMode={detail.agent_mode ?? "ai"}
            peerUrl={detail.peer_url}
            peerToken={detail.peer_token}
            onChange={onReloadDetail}
          />
        )}

        <ConnectionsList agentId={agent.id} agentName={agent.name} />

        <button
          type="button"
          onClick={onRebuild}
          style={{
            padding: "10px 0", border: "1px solid var(--line-2)",
            borderRadius: 10, background: "var(--paper-2)",
            fontSize: 13, color: "var(--ink-2)", cursor: "pointer",
            fontWeight: 500,
          }}
        >
          用对话重建角色 →
        </button>

        {/* Danger zone — fire / dismiss (system agents can't be dismissed) */}
        {!agent.is_system ? (
          <div style={{
            marginTop: 14, paddingTop: 14,
            borderTop: "1px dashed oklch(0.58 0.19 25 / 0.3)",
          }}>
            <button
              type="button"
              onClick={onDismiss}
              style={{
                width: "100%", padding: "10px 0",
                border: "1px solid oklch(0.58 0.19 25 / 0.4)",
                borderRadius: 10, background: "transparent",
                fontSize: 13, color: "var(--red)", cursor: "pointer",
                fontWeight: 500,
              }}
            >
              解雇 {agent.name}
            </button>
            <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 6, textAlign: "center", lineHeight: 1.5 }}>
              员工归档，对外连接撤销，进行中的任务全部取消 — 历史交付保留
            </div>
          </div>
        ) : (
          <div style={{
            marginTop: 14, paddingTop: 14,
            borderTop: "1px dashed var(--line)",
            fontSize: 11, color: "var(--ink-4)", textAlign: "center", lineHeight: 1.5,
          }}>
            内置专家不能解雇 — 但你可以改 ta 的工作风格 / 月预算 / 离线代理
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AgentSheet({
  agent,
  allStaff,
  onClose,
}: {
  agent: StaffRow;
  allStaff: StaffRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [agentRole, setAgentRole] = useState(agent.role);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [workToken, setWorkToken] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [proxyAgentId, setProxyAgentId] = useState<string>("");
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/v2/agents/${agent.id}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/v2/agents/${agent.id}/token`).then(r => r.ok ? r.json() : null),
    ]).then(([d, t]) => {
      if (d) {
        setDetail(d);
        setSystemPrompt(d.system_prompt ?? "");
        setAgentRole(d.role ?? agent.role);
        setProxyAgentId(d.proxy_agent_id ?? "");
      }
      if (t) { setWorkToken(t.work_token); setLastSeen(t.last_seen_at); }
    });
  }, [agent.id, agent.role]);

  const isOnline = lastSeen ? (Date.now() - new Date(lastSeen).getTime()) < 2 * 60 * 1000 : false;
  const color = agentColor(agent.name);

  async function saveField(fields: { system_prompt?: string; role?: string; proxy_agent_id?: string | null; monthly_budget?: number | null }) {
    await fetch(`/api/v2/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
  }

  async function handleGenerateToken() {
    setGeneratingToken(true);
    try {
      const res = await fetch(`/api/v2/agents/${agent.id}/token`, { method: "POST" });
      if (res.ok) { const d = await res.json(); setWorkToken(d.token); }
    } finally { setGeneratingToken(false); }
  }

  function copyToken() {
    if (!workToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/my/${workToken}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleDismiss() {
    const confirmed = window.confirm(
      `解雇 ${agent.name}？\n\n• 该员工归档（status='archived'）\n• 进行中的任务全部取消\n• 对外连接全部撤销\n• 历史交付保留\n\n此操作不可逆。`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/v2/agents/${agent.id}`, { method: "DELETE" });
      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "解雇失败");
      }
    } catch { alert("网络错误"); }
  }

  function handleRebuild() {
    const prefill = `帮我重新配置 ${agent.name} 的角色设定。目前配置：\n\n${systemPrompt || "（暂无）"}\n\n请问我想要什么改变。`;
    localStorage.setItem("chat-prefill", prefill);
    onClose();
    router.push("/chat");
  }

  const runningTask = detail?.recentAssignments.find(a => a.status === "running");

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "stretch", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%", maxWidth: 640,
          background: "var(--paper)",
          boxShadow: "0 -8px 24px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: "16px 20px 14px",
          borderBottom: "1px solid var(--line)",
          display: "flex", alignItems: "center", gap: 12,
          background: "var(--paper)",
        }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: color, display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 17, fontWeight: 700,
            }}>
              {agent.name.slice(0, 1)}
            </div>
            <div style={{
              position: "absolute", bottom: 0, right: 0,
              width: 11, height: 11, borderRadius: "50%",
              background: isOnline ? "#22c55e" : "#d1d5db",
              border: "2px solid var(--paper)",
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>
              {agent.name}
            </div>
            {runningTask ? (
              <div style={{ fontSize: 12, color: "var(--gold)", marginTop: 1, display: "flex", alignItems: "center", gap: 5 }}>
                <span className="pulse-dot" style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "var(--gold)", display: "inline-block", flexShrink: 0,
                }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  正在: {runningTask.title}
                </span>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 1 }}>{agentRole}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            title="配置"
            style={{
              flexShrink: 0, width: 36, height: 36, border: "none",
              borderRadius: "50%", background: "var(--paper-2)",
              cursor: "pointer", color: "var(--ink-2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Settings size={16} />
          </button>
          <button
            type="button" onClick={onClose}
            title="关闭"
            style={{
              flexShrink: 0, width: 36, height: 36, border: "none",
              borderRadius: "50%", background: "var(--paper-2)",
              cursor: "pointer", color: "var(--ink-2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Task strip — horizontal task cards above chat */}
        <AgentTaskStrip agentId={agent.id} agentName={agent.name} allStaff={allStaff} />

        {/* Main: chat panel (dominant) */}
        <div style={{
          flex: 1, minHeight: 0,
          padding: "0 20px 16px",
          display: "flex", flexDirection: "column",
        }}>
          <AgentChatPanel agentId={agent.id} agentName={agent.name} />
        </div>

        {/* Footer action: assign task */}
        <div style={{
          flexShrink: 0, padding: "12px 20px 20px",
          borderTop: "1px solid var(--line)",
          background: "var(--paper-2)",
        }}>
          <AssignTaskButton
            staff={allStaff}
            label={`分配正式任务给 ${agent.name}`}
            defaultAgentId={agent.id}
          />
        </div>

        {/* Slide-over manage drawer */}
        {manageOpen && (
          <ManageDrawer
            agent={agent}
            detail={detail}
            allStaff={allStaff}
            systemPrompt={systemPrompt} setSystemPrompt={setSystemPrompt}
            agentRole={agentRole} setAgentRole={setAgentRole}
            proxyAgentId={proxyAgentId} setProxyAgentId={setProxyAgentId}
            workToken={workToken}
            lastSeen={lastSeen}
            isOnline={isOnline}
            generatingToken={generatingToken}
            copied={copied}
            onClose={() => setManageOpen(false)}
            onGenerateToken={handleGenerateToken}
            onCopyToken={copyToken}
            onSaveField={saveField}
            onRebuild={handleRebuild}
            onDismiss={handleDismiss}
            onReloadDetail={() => {
              // re-fetch detail (triggers useEffect indirectly via location)
              fetch(`/api/v2/agents/${agent.id}`).then(r => r.ok ? r.json() : null).then(d => { if (d) setDetail(d); });
            }}
          />
        )}
      </div>
    </div>
  );
}

// Suppress unused import warning if accordion icons ever re-introduced
void ChevronDown; void ChevronRight;
