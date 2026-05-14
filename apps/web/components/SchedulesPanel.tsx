"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Clock, Trash2, Pause, Play, Settings, X } from "lucide-react";
import type { ScheduledTask } from "../lib/v2-data";
import { describeCron } from "../lib/cron";

const TONE_MAP: Record<string, string> = {
  Atlas: "#B5892A", Nova: "#2E7D52", Ledger: "#1A5E8A",
  Quill: "#7B4FAB", Scheduler: "#8A5500", Beacon: "#444444",
};
function agentColor(name: string | null) { return name ? (TONE_MAP[name] ?? "#888") : "#888"; }

export function SchedulesPanel() {
  const [items, setItems] = useState<ScheduledTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [sectionOpen, setSectionOpen] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ScheduledTask | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    cron_expr: "",
    title_template: "",
    prompt_template: "",
    enabled: true,
  });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/v2/schedules");
      if (r.ok) setItems(await r.json());
    } finally { setLoaded(true); }
  }
  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  async function toggleEnabled(s: ScheduledTask) {
    setBusy(s.id);
    try {
      await fetch(`/api/v2/schedules/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !s.enabled }),
      });
      await load();
    } finally { setBusy(null); }
  }

  async function remove(s: ScheduledTask) {
    if (!confirm(`删除定时任务"${s.name}"？\n\n此操作不可撤销，但已经派出去的任务不受影响。`)) return;
    setBusy(s.id);
    try {
      const r = await fetch(`/api/v2/schedules/${s.id}`, { method: "DELETE" });
      if (r.ok) setItems(prev => prev.filter(p => p.id !== s.id));
    } finally { setBusy(null); }
  }

  function openEditor(s: ScheduledTask) {
    setEditing(s);
    setDraft({
      name: s.name,
      cron_expr: s.cron_expr,
      title_template: s.title_template,
      prompt_template: s.prompt_template,
      enabled: s.enabled,
    });
    setError(null);
  }

  async function saveEditing() {
    if (!editing || busy) return;
    const payload = {
      name: draft.name.trim(),
      cron_expr: draft.cron_expr.trim(),
      title_template: draft.title_template.trim(),
      prompt_template: draft.prompt_template.trim(),
      enabled: draft.enabled,
    };
    if (!payload.name || !payload.cron_expr || !payload.title_template || !payload.prompt_template) {
      setError("名称、时间、交付标题和任务说明都要填写。");
      return;
    }
    setBusy(editing.id);
    setError(null);
    try {
      const r = await fetch(`/api/v2/schedules/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        setError(data?.error ?? "保存失败。");
        return;
      }
      setEditing(null);
      await load();
    } finally { setBusy(null); }
  }

  if (!loaded) return null;

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
        <Clock size={11} style={{ color: "var(--gold)" }} />
        定时任务
        <span style={{ fontSize: 10, fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--ink-4)" }}>
          · {items.length} 项 · 即将自动产生的交付
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
          lineHeight: 1.6,
        }}>
          还没设定时任务。
          <br />
          在 CEO 主聊天里说『每周一让 Ledger 写复盘』或者进员工任务详情挂 schedule。
        </div>
      ) : sectionOpen ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(s => {
            const expanded = openId === s.id;
            const color = agentColor(s.assigned_to_name);
            const next = new Date(s.next_run_at);
            const nextStr = next.toLocaleString("zh-CN", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
            const isBusy = busy === s.id;
            return (
              <div key={s.id} style={{
                background: "var(--card)", border: "1px solid var(--line)",
                borderRadius: 14, overflow: "hidden",
                opacity: s.enabled ? (isBusy ? 0.6 : 1) : 0.55,
              }}>
                <button
                  type="button"
                  onClick={() => setOpenId(expanded ? null : s.id)}
                  style={{
                    width: "100%", border: "none", background: "transparent",
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{
                    flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
                    background: color, color: "#fff", fontWeight: 700, fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{(s.assigned_to_name ?? "?").slice(0, 1)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                      {s.assigned_to_name ?? "?"} · {describeCron(s.cron_expr)}
                    </div>
                    <div style={{ fontSize: 10, color: s.enabled ? "var(--ink-4)" : "var(--red)", marginTop: 1 }}>
                      {s.enabled ? `下次：${nextStr}` : "已暂停"}
                    </div>
                  </div>
                  {expanded ? <ChevronDown size={15} style={{ color: "var(--ink-3)" }} /> : <ChevronRight size={15} style={{ color: "var(--ink-3)" }} />}
                </button>
                {expanded && (
                  <div style={{
                    borderTop: "1px dashed var(--line)",
                    padding: "10px 12px 12px 54px",
                  }}>
                    <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 8 }}>
                      标题：{s.title_template}
                    </div>
                    <div style={{
                      fontSize: 12, color: "var(--ink-3)", lineHeight: 1.55,
                      background: "var(--paper-2)", borderRadius: 10, padding: "9px 10px",
                      whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 10,
                    }}>{s.prompt_template}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => openEditor(s)} disabled={isBusy} title="配置" style={smallButtonStyle}>
                        <Settings size={12} />配置
                      </button>
                      <button type="button" onClick={() => toggleEnabled(s)} disabled={isBusy} title={s.enabled ? "暂停" : "启用"} style={smallButtonStyle}>
                        {s.enabled ? <Pause size={12} /> : <Play size={12} />}{s.enabled ? "暂停" : "启用"}
                      </button>
                      <button type="button" onClick={() => remove(s)} disabled={isBusy} title="删除" style={{ ...smallButtonStyle, color: "var(--red)", borderColor: "oklch(0.58 0.19 25 / 0.3)" }}>
                        <Trash2 size={12} />删除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed", inset: 0, zIndex: 80,
            background: "oklch(0.18 0.02 80 / 0.32)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
          onClick={() => { if (!busy) setEditing(null); }}
        >
          <div
            style={{
              width: "min(100%, 520px)",
              maxHeight: "86vh", overflowY: "auto",
              background: "var(--paper)", border: "1px solid var(--line)",
              borderRadius: "18px 18px 0 0",
              padding: "14px 16px 20px",
              boxShadow: "0 -16px 48px oklch(0.18 0.02 80 / 0.16)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>配置定时任务</div>
                <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>
                  {editing.assigned_to_name ?? "?"} · 下次自动生成交付
                </div>
              </div>
              <button
                type="button"
                onClick={() => { if (!busy) setEditing(null); }}
                disabled={busy === editing.id}
                title="关闭"
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  border: "1px solid var(--line-2)", background: "transparent",
                  color: "var(--ink-3)", cursor: busy === editing.id ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              ><X size={14} /></button>
            </div>

            <label style={labelStyle}>
              名称
              <input
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              时间
              <input
                value={draft.cron_expr}
                onChange={e => setDraft(d => ({ ...d, cron_expr: e.target.value }))}
                placeholder="0 9 * * 1 或 ONCE:2026-05-19T12:00:00-07:00"
                style={inputStyle}
              />
            </label>
            <div style={{ fontSize: 11, color: "var(--ink-4)", margin: "-4px 0 10px" }}>
              当前：{describeCron(draft.cron_expr)}
            </div>
            <label style={labelStyle}>
              交付标题
              <input
                value={draft.title_template}
                onChange={e => setDraft(d => ({ ...d, title_template: e.target.value }))}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              任务说明
              <textarea
                value={draft.prompt_template}
                onChange={e => setDraft(d => ({ ...d, prompt_template: e.target.value }))}
                rows={5}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
              />
            </label>
            <label style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 12, color: "var(--ink-2)", marginBottom: 12,
            }}>
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={e => setDraft(d => ({ ...d, enabled: e.target.checked }))}
              />
              启用这个定时任务
            </label>
            {error && (
              <div style={{
                fontSize: 12, color: "var(--red)", marginBottom: 10,
                padding: "8px 10px", border: "1px solid oklch(0.58 0.19 25 / 0.3)",
                borderRadius: 10,
              }}>{error}</div>
            )}
            <button
              type="button"
              onClick={saveEditing}
              disabled={busy === editing.id}
              style={{
                width: "100%", padding: "11px 0",
                border: "none", borderRadius: 12,
                background: "var(--gold)", color: "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: busy === editing.id ? "not-allowed" : "pointer",
              }}
            >{busy === editing.id ? "保存中…" : "保存配置"}</button>
          </div>
        </div>
      )}
    </section>
  );
}

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  fontSize: 11,
  fontWeight: 700,
  color: "var(--ink-3)",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  marginBottom: 10,
} as const;

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--line-2)",
  borderRadius: 10,
  background: "var(--card)",
  color: "var(--ink)",
  padding: "10px 11px",
  fontSize: 13,
  fontWeight: 500,
  outline: "none",
  letterSpacing: 0,
} as const;

const smallButtonStyle = {
  flexShrink: 0,
  height: 30,
  padding: "0 10px",
  border: "1px solid var(--line-2)",
  borderRadius: 8,
  background: "transparent",
  cursor: "pointer",
  color: "var(--ink-3)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  fontSize: 12,
} as const;
