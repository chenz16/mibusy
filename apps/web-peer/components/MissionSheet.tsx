"use client";

import { X, Check, Target, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import type { Mission, AssignmentRow } from "../lib/v2-data";

type Detail = { mission: Mission; subtasks: AssignmentRow[] };

const STATUS_LABEL: Record<string, string> = {
  queued: "待接受",
  awaiting_input: "进行中",
  completed: "已递交",
  cancelled: "已拒绝",
};

export function MissionSheet({
  missionId,
  onClose,
  onChange,
}: {
  missionId: string;
  onClose: () => void;
  onChange: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState("");
  const [working, setWorking] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/missions/${missionId}`);
      if (res.ok) {
        const d: Detail = await res.json();
        setDetail(d);
        setReport(d.mission.report_body ?? "");
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [missionId]);

  async function patchStatus(status: "awaiting_input" | "cancelled") {
    setWorking(true);
    try {
      await fetch(`/api/v2/missions/${missionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
      onChange();
    } finally { setWorking(false); }
  }

  async function submitReport() {
    if (!report.trim()) return;
    setWorking(true);
    try {
      await fetch(`/api/v2/missions/${missionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_body: report }),
      });
      await load();
      onChange();
    } finally { setWorking(false); }
  }

  const m = detail?.mission;
  const subtasks = detail?.subtasks ?? [];
  const submitted = m?.status === "completed";
  const rejected = m?.status === "cancelled";
  const accepted = m?.status === "awaiting_input";
  const pending = m?.status === "queued";

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
          display: "flex", alignItems: "center", gap: 12,
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
              使命 · 来自 {m?.mission_source ?? "上级"}
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>
              {m?.title ?? "加载中…"}
            </div>
          </div>
          <button
            type="button" onClick={onClose}
            style={{
              flexShrink: 0, width: 32, height: 32, border: "none",
              borderRadius: "50%", background: "var(--paper-2)",
              cursor: "pointer", color: "var(--ink-2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {loading && <div className="muted">加载中…</div>}
          {!loading && m && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {/* Status + budget chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={{
                  padding: "3px 10px", borderRadius: 999,
                  background: "var(--paper-2)", border: "1px solid var(--line)",
                  fontSize: 12, color: "var(--ink-2)",
                }}>
                  状态 · {STATUS_LABEL[m.status]}
                </span>
                {m.budget_limit != null && (
                  <span style={{
                    padding: "3px 10px", borderRadius: 999,
                    background: "var(--paper-2)", border: "1px solid var(--line)",
                    fontSize: 12, color: "var(--ink-2)",
                  }}>
                    预算 ${m.budget_limit}
                  </span>
                )}
                <span style={{
                  padding: "3px 10px", borderRadius: 999,
                  background: "var(--paper-2)", border: "1px solid var(--line)",
                  fontSize: 12, color: "var(--ink-2)",
                }}>
                  子任务 {m.subtask_done}/{m.subtask_count}
                </span>
              </div>

              {/* Mission brief */}
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
                  使命描述
                </div>
                <div style={{
                  fontSize: 14, color: "var(--ink-2)", lineHeight: 1.65,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                  background: "var(--card)", border: "1px solid var(--line)",
                  borderRadius: 12, padding: "12px 14px",
                }}>
                  {m.prompt}
                </div>
              </div>

              {/* Decision (only for queued) */}
              {pending && (
                <div style={{
                  display: "flex", gap: 8,
                  padding: "12px", background: "var(--gold-soft)",
                  border: "1px solid oklch(0.62 0.14 70 / 0.3)",
                  borderRadius: 12,
                }}>
                  <button
                    type="button" disabled={working}
                    onClick={() => patchStatus("awaiting_input")}
                    style={{
                      flex: 1, padding: "10px 0", border: "none", borderRadius: 10,
                      background: "var(--gold)", color: "#fff",
                      fontSize: 13, fontWeight: 600, cursor: working ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <Check size={14} />接受使命
                  </button>
                  <button
                    type="button" disabled={working}
                    onClick={() => patchStatus("cancelled")}
                    style={{
                      flex: 1, padding: "10px 0",
                      border: "1px solid oklch(0.58 0.19 25 / 0.3)", borderRadius: 10,
                      background: "transparent", color: "var(--red)",
                      fontSize: 13, fontWeight: 600, cursor: working ? "not-allowed" : "pointer",
                    }}
                  >
                    拒绝并退回
                  </button>
                </div>
              )}

              {/* Subtasks */}
              {(accepted || submitted) && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
                      拆解的子任务
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-4)" }}>
                      在主聊天「@员工」拆解 →
                    </div>
                  </div>
                  {subtasks.length === 0 ? (
                    <div style={{
                      fontSize: 13, color: "var(--ink-4)", fontStyle: "italic",
                      padding: "12px 14px", textAlign: "center",
                      background: "var(--paper-2)", borderRadius: 10,
                      border: "1px dashed var(--line-2)",
                    }}>
                      还没拆解子任务 — 在主聊天派活给员工后，会自动归到这里
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {subtasks.map(t => (
                        <div key={t.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          background: "var(--card)", border: "1px solid var(--line)",
                          borderRadius: 10, padding: "8px 12px",
                        }}>
                          <div style={{
                            width: 7, height: 7, borderRadius: "50%",
                            background: t.status === "completed" ? "var(--green, #2E7D52)" :
                                        t.status === "running" ? "var(--blue, #1A5E8A)" : "var(--ink-4)",
                            flexShrink: 0,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                            <div style={{ fontSize: 11, color: "var(--ink-4)" }}>
                              {t.assigned_to_name ?? "未分配"} · {STATUS_LABEL[t.status] ?? t.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 述职报告 + 递交 */}
              {(accepted || submitted) && (
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <FileText size={11} />
                    述职报告 {submitted && <span style={{ color: "var(--green, #2E7D52)", textTransform: "none", letterSpacing: 0 }}>· 已递交</span>}
                  </div>
                  <textarea
                    value={report}
                    onChange={e => setReport(e.target.value)}
                    disabled={submitted}
                    rows={8}
                    placeholder="向上级汇报：完成了什么 · 进展 · 风险 · 下一步…"
                    style={{
                      display: "block", width: "100%", boxSizing: "border-box",
                      padding: "12px 14px", borderRadius: 12, fontSize: 14,
                      border: "1px solid var(--line-2)",
                      background: submitted ? "var(--paper-2)" : "var(--card)",
                      color: "var(--ink)", outline: "none",
                      resize: "vertical", lineHeight: 1.6,
                      fontFamily: "inherit",
                    }}
                  />
                  {!submitted && (
                    <button
                      type="button"
                      onClick={submitReport}
                      disabled={working || !report.trim()}
                      style={{
                        marginTop: 10, width: "100%", padding: "12px 0",
                        border: "none", borderRadius: 10,
                        background: report.trim() && !working ? "var(--gold)" : "var(--paper-2)",
                        color: report.trim() && !working ? "#fff" : "var(--ink-4)",
                        fontSize: 14, fontWeight: 600,
                        cursor: report.trim() && !working ? "pointer" : "not-allowed",
                      }}
                    >
                      {working ? "递交中…" : "递交给上级"}
                    </button>
                  )}
                </div>
              )}

              {rejected && (
                <div style={{
                  padding: 14, background: "var(--paper-2)",
                  border: "1px dashed var(--line)", borderRadius: 12,
                  fontSize: 13, color: "var(--ink-3)", textAlign: "center",
                }}>
                  你已拒绝此使命。退回上级的动作目前是 placeholder。
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
