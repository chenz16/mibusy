"use client";

import { useEffect, useState } from "react";
import { X, Target, Clock, Plus, Archive, FileText, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import type { TaskDetail, TaskExecution, ScheduledTask } from "../lib/v2-data";
import { describeCron } from "../lib/cron";

const CRON_PRESETS: Array<{ label: string; cron: string; hint: string }> = [
  { label: "每天 09:00",    cron: "0 9 * * *",   hint: "每天上午 9 点" },
  { label: "工作日 09:00",  cron: "0 9 * * 1-5", hint: "周一到周五 9 点" },
  { label: "每周一 09:00",  cron: "0 9 * * 1",   hint: "每周一 9 点" },
  { label: "每周五 17:00",  cron: "0 17 * * 5",  hint: "周五下班前" },
  { label: "每月 1 号 09:00",cron: "0 9 1 * *",  hint: "月初" },
];

const STATUS_LABEL: Record<string, string> = {
  queued: "排队中", running: "执行中", awaiting_input: "等待 CEO",
  completed: "已完成", cancelled: "已取消", failed: "失败",
};
const STATUS_COLOR: Record<string, string> = {
  queued: "var(--ink-3)",
  running: "var(--blue, #1A5E8A)",
  awaiting_input: "var(--gold)",
  completed: "var(--green, #2E7D52)",
  cancelled: "var(--ink-4)",
  failed: "var(--red)",
};

export function TaskSheet({
  taskId, onClose, onChange,
}: { taskId: string; onClose: () => void; onChange?: () => void }) {
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [openExecId, setOpenExecId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPrompt, setNewPrompt] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/v2/tasks/${taskId}`);
      if (r.ok) setDetail(await r.json());
    } finally { setLoading(false); }
  }
  useEffect(() => {
    load();
    const id = setInterval(load, 8_000);
    return () => clearInterval(id);
  }, [taskId]);

  async function addRun() {
    if (!newTitle.trim() || !newPrompt.trim()) return;
    setWorking(true);
    try {
      const r = await fetch(`/api/v2/tasks/${taskId}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), prompt: newPrompt.trim() }),
      });
      if (r.ok) {
        setNewTitle(""); setNewPrompt(""); setAddOpen(false);
        await load(); onChange?.();
      }
    } finally { setWorking(false); }
  }

  async function archive() {
    if (!confirm("完结此任务？\n\n• 进行中的子任务会被取消\n• 任务标记为已完成\n• 历史交付保留")) return;
    setWorking(true);
    try {
      const r = await fetch(`/api/v2/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      if (r.ok) { onChange?.(); onClose(); }
    } finally { setWorking(false); }
  }

  const t = detail?.task;
  const execs = detail?.executions ?? [];
  const archivedStatuses = ["completed", "cancelled", "failed"];
  const archived = t && archivedStatuses.includes(t.status);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 110,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "stretch", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 640,
          background: "var(--paper)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: "16px 20px 14px",
          borderBottom: "1px solid var(--line)",
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <div style={{
            flexShrink: 0, width: 36, height: 36, borderRadius: 10,
            background: "var(--gold-soft)", color: "var(--gold)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Target size={17} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 1 }}>
              任务 · {t?.agent_name ?? "?"}{t?.mission_source ? ` · 来自 ${t.mission_source}` : ""}
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>
              {t?.title ?? "加载中…"}
            </div>
            {t && (
              <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
                创建 {new Date(t.created_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                {" · "}最近活动 {new Date(t.last_activity_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
          <button
            type="button" onClick={onClose}
            style={{
              flexShrink: 0, width: 32, height: 32, border: "none",
              borderRadius: "50%", background: "var(--paper-2)",
              cursor: "pointer", color: "var(--ink-2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          ><X size={15} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading && !detail && <div className="muted">加载中…</div>}
          {detail && t && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Status + stats */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  padding: "3px 10px", borderRadius: 999,
                  color: STATUS_COLOR[t.status],
                  background: `${STATUS_COLOR[t.status]}18`,
                }}>
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
                <span style={{
                  fontSize: 12, padding: "3px 10px", borderRadius: 999,
                  background: "var(--paper-2)", border: "1px solid var(--line)",
                  color: "var(--ink-2)",
                }}>
                  执行 {execs.length}
                </span>
                {t.child_running > 0 && (
                  <span style={{
                    fontSize: 12, padding: "3px 10px", borderRadius: 999,
                    background: "oklch(0.40 0.10 240 / 0.10)", color: "var(--blue, #1A5E8A)",
                    border: "1px solid oklch(0.40 0.10 240 / 0.25)",
                  }}>
                    {t.child_running} 在跑
                  </span>
                )}
                {t.budget_limit != null && (
                  <span style={{
                    fontSize: 12, padding: "3px 10px", borderRadius: 999,
                    background: "var(--paper-2)", border: "1px solid var(--line)",
                    color: "var(--ink-2)",
                  }}>
                    预算 ${t.budget_limit}
                  </span>
                )}
              </div>

              {/* Task brief */}
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                  任务描述
                </div>
                <div style={{
                  fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6,
                  background: "var(--card)", border: "1px solid var(--line)",
                  borderRadius: 10, padding: "10px 12px",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                  maxHeight: 200, overflowY: "auto",
                }}>
                  {t.prompt}
                </div>
              </div>

              {/* Schedule block — real */}
              <TaskScheduleSection taskId={taskId} />

              {/* Execution timeline */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--ink-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    执行历史
                  </div>
                  {!archived && (
                    <button
                      type="button" onClick={() => setAddOpen(o => !o)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "3px 10px", borderRadius: 999,
                        border: "1px solid var(--line-2)", background: "transparent",
                        fontSize: 11, color: "var(--ink-3)", cursor: "pointer",
                      }}
                    >
                      <Plus size={11} />{addOpen ? "取消" : "派一次 ad-hoc"}
                    </button>
                  )}
                </div>

                {/* Ad-hoc add form */}
                {addOpen && (
                  <div style={{
                    marginBottom: 8, padding: "10px 12px",
                    background: "var(--gold-soft)",
                    border: "1px solid oklch(0.62 0.14 70 / 0.3)",
                    borderRadius: 10,
                    display: "flex", flexDirection: "column", gap: 6,
                  }}>
                    <input
                      placeholder="子任务标题（如：补一份最新数据）"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      style={{
                        padding: "7px 10px", borderRadius: 8,
                        border: "1px solid var(--line-2)", fontSize: 13,
                        background: "var(--card)", color: "var(--ink)", outline: "none",
                      }}
                    />
                    <textarea
                      placeholder="给员工的详细说明…"
                      value={newPrompt}
                      onChange={e => setNewPrompt(e.target.value)}
                      rows={3}
                      style={{
                        padding: "7px 10px", borderRadius: 8,
                        border: "1px solid var(--line-2)", fontSize: 13,
                        background: "var(--card)", color: "var(--ink)", outline: "none",
                        resize: "vertical", lineHeight: 1.5, fontFamily: "inherit",
                      }}
                    />
                    <button
                      type="button"
                      onClick={addRun}
                      disabled={working || !newTitle.trim() || !newPrompt.trim()}
                      style={{
                        padding: "7px 0", border: "none", borderRadius: 8,
                        background: !working && newTitle.trim() && newPrompt.trim() ? "var(--gold)" : "var(--paper-2)",
                        color: !working && newTitle.trim() && newPrompt.trim() ? "#fff" : "var(--ink-4)",
                        fontSize: 12, fontWeight: 600,
                        cursor: working ? "not-allowed" : "pointer",
                      }}
                    >{working ? "派发中…" : "派发"}</button>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {execs.map(e => (
                    <ExecutionRow
                      key={e.id} exec={e}
                      open={openExecId === e.id}
                      onToggle={() => setOpenExecId(openExecId === e.id ? null : e.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Archive */}
              {!archived && (
                <div style={{ paddingTop: 8, borderTop: "1px dashed var(--line)" }}>
                  <button
                    type="button" onClick={archive} disabled={working}
                    style={{
                      width: "100%", padding: "9px 0",
                      border: "1px solid var(--line-2)", borderRadius: 10,
                      background: "transparent", fontSize: 12,
                      color: "var(--ink-3)", cursor: working ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    }}
                  >
                    <Archive size={12} />完结此任务
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExecutionRow({ exec, open, onToggle }: { exec: TaskExecution; open: boolean; onToggle: () => void }) {
  const color = STATUS_COLOR[exec.status] ?? "var(--ink-3)";
  const date = new Date(exec.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--line)",
      borderRadius: 10, overflow: "hidden",
    }}>
      <button
        type="button" onClick={onToggle}
        style={{
          width: "100%", textAlign: "left", cursor: "pointer",
          background: "transparent", border: "none",
          padding: "9px 12px", display: "flex", alignItems: "center", gap: 8,
        }}
      >
        {open ? <ChevronDown size={12} style={{ color: "var(--ink-4)" }} /> : <ChevronRight size={12} style={{ color: "var(--ink-4)" }} />}
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
            {exec.is_root && <span style={{ fontSize: 10, color: "var(--ink-4)", marginRight: 4 }}>[起点]</span>}
            {exec.title}
          </div>
          <div style={{ fontSize: 10, color: "var(--ink-4)" }}>
            {date} · {STATUS_LABEL[exec.status] ?? exec.status}
            {exec.deliverable_title && " · ✓ 有交付"}
          </div>
        </div>
      </button>
      {open && (
        <div style={{
          padding: "8px 12px 12px 30px",
          borderTop: "1px dashed var(--line)",
        }}>
          {exec.prompt && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "var(--ink-4)", marginBottom: 3 }}>说明</div>
              <div style={{
                fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5,
                background: "var(--paper-2)", borderRadius: 6, padding: "6px 8px",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                maxHeight: 120, overflowY: "auto",
              }}>{exec.prompt}</div>
            </div>
          )}
          {exec.deliverable_body && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--green, #2E7D52)", marginBottom: 3, fontWeight: 600 }}>
                <FileText size={10} />交付：{exec.deliverable_title}
              </div>
              <div style={{
                fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55,
                background: "var(--paper-2)", borderRadius: 6, padding: "8px 10px",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                maxHeight: 240, overflowY: "auto",
              }}>{exec.deliverable_body}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Schedule section inside TaskSheet ─────────────────────────────────────────

function TaskScheduleSection({ taskId }: { taskId: string }) {
  const [schedules, setSchedules] = useState<ScheduledTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [presetCron, setPresetCron] = useState<string>(CRON_PRESETS[0].cron);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");

  async function load() {
    try {
      const r = await fetch(`/api/v2/schedules?parent_task_id=${taskId}`);
      if (r.ok) setSchedules(await r.json());
    } finally { setLoaded(true); }
  }
  useEffect(() => { load(); const id = setInterval(load, 15_000); return () => clearInterval(id); }, [taskId]);

  async function create() {
    if (!name.trim() || !title.trim() || !prompt.trim() || working) return;
    setWorking(true);
    try {
      const r = await fetch("/api/v2/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          parent_task_id: taskId,
          cron_expr: presetCron,
          title_template: title.trim(),
          prompt_template: prompt.trim(),
        }),
      });
      if (r.ok) {
        setName(""); setTitle(""); setPrompt(""); setAddOpen(false);
        load();
      }
    } finally { setWorking(false); }
  }

  async function toggleEnabled(s: ScheduledTask) {
    const r = await fetch(`/api/v2/schedules/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !s.enabled }),
    });
    if (r.ok) load();
  }

  async function remove(id: string) {
    if (!confirm("删除此 schedule？")) return;
    const r = await fetch(`/api/v2/schedules/${id}`, { method: "DELETE" });
    if (r.ok) setSchedules(prev => prev.filter(p => p.id !== id));
  }

  if (!loaded) return null;

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 8,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 11, color: "var(--ink-4)", fontWeight: 600,
          textTransform: "uppercase", letterSpacing: 0.5,
        }}>
          <Clock size={11} />
          定时执行
        </div>
        <button
          type="button" onClick={() => setAddOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 3,
            padding: "3px 10px", borderRadius: 999,
            border: "1px solid var(--line-2)", background: "transparent",
            fontSize: 11, color: "var(--ink-3)", cursor: "pointer",
          }}
        >
          <Plus size={11} />{addOpen ? "取消" : "新建"}
        </button>
      </div>

      {addOpen && (
        <div style={{
          marginBottom: 8, padding: "10px 12px",
          background: "var(--gold-soft)", borderRadius: 10,
          border: "1px solid oklch(0.62 0.14 70 / 0.3)",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <input
            placeholder="schedule 名称（如：周一财务复盘）"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              padding: "7px 10px", borderRadius: 8,
              border: "1px solid var(--line-2)", fontSize: 13,
              background: "var(--card)", color: "var(--ink)", outline: "none",
            }}
          />
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}>触发频率</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {CRON_PRESETS.map(p => (
                <button
                  key={p.cron} type="button"
                  onClick={() => setPresetCron(p.cron)}
                  style={{
                    padding: "5px 8px", fontSize: 11,
                    border: `1px solid ${presetCron === p.cron ? "var(--gold)" : "var(--line-2)"}`,
                    background: presetCron === p.cron ? "var(--paper)" : "var(--card)",
                    borderRadius: 6, cursor: "pointer",
                    color: presetCron === p.cron ? "var(--ink)" : "var(--ink-2)",
                    fontWeight: presetCron === p.cron ? 600 : 400,
                  }}
                >{p.label}</button>
              ))}
            </div>
          </div>
          <input
            placeholder="每次任务标题（如：本周财务复盘）"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              padding: "7px 10px", borderRadius: 8,
              border: "1px solid var(--line-2)", fontSize: 13,
              background: "var(--card)", color: "var(--ink)", outline: "none",
            }}
          />
          <textarea
            placeholder="给员工的具体说明…"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
            style={{
              padding: "7px 10px", borderRadius: 8,
              border: "1px solid var(--line-2)", fontSize: 13,
              background: "var(--card)", color: "var(--ink)", outline: "none",
              resize: "vertical", lineHeight: 1.5, fontFamily: "inherit",
            }}
          />
          <button
            type="button" onClick={create}
            disabled={working || !name.trim() || !title.trim() || !prompt.trim()}
            style={{
              padding: "7px 0", border: "none", borderRadius: 8,
              background: !working && name && title && prompt ? "var(--gold)" : "var(--paper-2)",
              color: !working && name && title && prompt ? "#fff" : "var(--ink-4)",
              fontSize: 12, fontWeight: 600,
              cursor: working ? "not-allowed" : "pointer",
            }}
          >{working ? "创建中…" : "创建 schedule"}</button>
        </div>
      )}

      {schedules.length === 0 ? (
        <div style={{
          padding: "10px 12px",
          background: "var(--paper-2)", borderRadius: 10,
          border: "1px dashed var(--line-2)",
          fontSize: 12, color: "var(--ink-4)",
        }}>
          还没设定时执行。点上方"新建"挂一个 — 比如每周一自动跑一次。
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {schedules.map(s => {
            const next = new Date(s.next_run_at);
            const nextStr = next.toLocaleString("zh-CN", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
            return (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px",
                background: "var(--card)", border: "1px solid var(--line)",
                borderRadius: 10, opacity: s.enabled ? 1 : 0.55,
              }}>
                <Clock size={12} style={{ color: s.enabled ? "var(--gold)" : "var(--ink-4)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-4)" }}>
                    {describeCron(s.cron_expr)} · 下次 {nextStr}
                    {!s.enabled && " · 已暂停"}
                  </div>
                </div>
                <button
                  type="button" onClick={() => toggleEnabled(s)}
                  style={{
                    padding: "3px 8px", fontSize: 10,
                    border: "1px solid var(--line-2)", borderRadius: 6,
                    background: "transparent", cursor: "pointer", color: "var(--ink-3)",
                  }}
                >{s.enabled ? "暂停" : "启用"}</button>
                <button
                  type="button" onClick={() => remove(s.id)}
                  title="删除"
                  style={{
                    flexShrink: 0, width: 22, height: 22, border: "none",
                    borderRadius: 5, background: "transparent",
                    cursor: "pointer", color: "var(--ink-4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                ><Trash2 size={11} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
