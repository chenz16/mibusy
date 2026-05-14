"use client";

import { useEffect, useState } from "react";
import { RotateCcw, ChevronDown, ChevronRight, Archive, Zap } from "lucide-react";

import { RecruitButton } from "./RecruitButton";
import { AgentSheet } from "./AgentSheet";
import { CeoSkills } from "./CeoSkills";
import type { StaffRow, ArchivedAgent } from "../lib/v2-data";

const TONE_MAP: Record<string, string> = {
  Atlas: "#B5892A", Nova: "#2E7D52", Ledger: "#1A5E8A",
  Quill: "#7B4FAB", Scheduler: "#8A5500",
};

function agentColor(name: string) {
  return TONE_MAP[name] ?? "#888888";
}

export function TeamClientView({ staff }: { staff: StaffRow[] }) {
  const [selected, setSelected] = useState<StaffRow | null>(null);
  const [archived, setArchived] = useState<ArchivedAgent[]>([]);
  const [archivedLoaded, setArchivedLoaded] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [systemOpen, setSystemOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [skillCount, setSkillCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/v2/ceo/skills")
      .then(r => r.ok ? r.json() : [])
      .then((rows: unknown[]) => setSkillCount(Array.isArray(rows) ? rows.length : 0))
      .catch(() => setSkillCount(0));
  }, []);

  async function loadArchived() {
    try {
      const r = await fetch("/api/v2/agents/archived");
      if (r.ok) setArchived(await r.json());
    } finally { setArchivedLoaded(true); }
  }
  useEffect(() => { loadArchived(); }, []);

  async function restore(id: string, name: string) {
    if (!confirm(`恢复 ${name}？ta 会重新出现在团队列表。\n注意：旧的对外 token 和连接不会自动恢复，需要重新生成。`)) return;
    setRestoring(id);
    try {
      const r = await fetch(`/api/v2/agents/${id}/restore`, { method: "POST" });
      if (r.ok) {
        await loadArchived();
        // Force a hard refresh so server-fetched staff list reloads
        window.location.reload();
      }
    } finally { setRestoring(null); }
  }

  return (
    <section className="page">

      <header style={{
        display: "flex", alignItems: "flex-end",
        justifyContent: "space-between", gap: 8, marginBottom: 4,
      }}>
        <h1 style={{
          fontFamily: "var(--serif)", fontSize: 32, fontWeight: 500,
          margin: 0, color: "var(--ink)",
        }}>
          团队
        </h1>
        <RecruitButton />
      </header>

      <p style={{ color: "var(--ink-3)", fontSize: 13, margin: "4px 0 20px" }}>
        点击成员查看详情和最近交付。
      </p>

      {staff.length === 0 ? (
        <div className="empty-state">暂无成员 — 点击右上角招募</div>
      ) : (
        <>
          {/* My hires — non-system agents */}
          {(() => {
            const myHires = staff.filter(s => !s.is_system);
            const systemAgents = staff.filter(s => s.is_system);
            return (
              <>
                {myHires.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{
                      fontSize: 11, color: "var(--ink-4)", fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
                    }}>
                      我的员工 · {myHires.length}
                    </div>
                    <div className="stack">
                      {myHires.map(agent => <AgentCard key={agent.id} agent={agent} onClick={() => setSelected(agent)} />)}
                    </div>
                  </div>
                )}
                {systemAgents.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <button
                      type="button"
                      onClick={() => setSystemOpen(o => !o)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        width: "100%", padding: "4px 0 8px",
                        border: "none", background: "transparent", cursor: "pointer",
                        fontSize: 11, color: "var(--ink-4)", fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: 0.5,
                      }}
                    >
                      {systemOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      内置专家 · {systemAgents.length}
                      <span style={{ fontSize: 10, fontWeight: 400, color: "var(--ink-4)", textTransform: "none", letterSpacing: 0 }}>
                        （出厂自带，可配置不可解雇）
                      </span>
                    </button>
                    {systemOpen && (
                      <div className="stack">
                        {systemAgents.map(agent => <AgentCard key={agent.id} agent={agent} onClick={() => setSelected(agent)} isSystem />)}
                      </div>
                    )}
                  </div>
                )}

                {/* Skills — parallel to system agents */}
                <div>
                  <button
                    type="button"
                    onClick={() => setSkillsOpen(o => !o)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      width: "100%", padding: "4px 0 8px",
                      border: "none", background: "transparent", cursor: "pointer",
                      fontSize: 11, color: "var(--ink-4)", fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: 0.5,
                    }}
                  >
                    {skillsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <Zap size={11} style={{ color: "var(--gold)" }} />
                    技能库 · {skillCount ?? "…"}
                    <span style={{ fontSize: 10, fontWeight: 400, color: "var(--ink-4)", textTransform: "none", letterSpacing: 0 }}>
                      （挂在 CEO 名下，全员继承）
                    </span>
                  </button>
                  {skillsOpen && (
                    <div style={{ paddingTop: 4 }}>
                      <CeoSkills />
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </>
      )}

      {/* Archived employees — collapsed by default, expand inline */}
      {archivedLoaded && archived.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <button
            type="button"
            onClick={() => setArchivedOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              width: "100%", padding: "8px 10px",
              border: "none", background: "transparent", cursor: "pointer",
              fontSize: 12, color: "var(--ink-4)", fontWeight: 500,
            }}
          >
            {archivedOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Archive size={12} />
            <span style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
              已离职 / 归档（{archived.length}）
            </span>
          </button>
          {archivedOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4, paddingLeft: 4 }}>
              {archived.map(a => {
                const hired = new Date(a.hired_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
                const fired = a.archived_at ? new Date(a.archived_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) : "—";
                const isBusy = restoring === a.id;
                return (
                  <div key={a.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "var(--paper-2)", border: "1px solid var(--line)",
                    borderRadius: 14, padding: "10px 12px",
                    opacity: isBusy ? 0.6 : 0.78,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: agentColor(a.name),
                      filter: "grayscale(0.6)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0,
                    }}>{a.name.slice(0, 1)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: 13.5, color: "var(--ink-2)",
                        textDecoration: "line-through", textDecorationColor: "var(--ink-4)",
                      }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-4)" }}>
                        {a.role} · {hired} → {fired} · 交付 {a.total_deliverables}
                      </div>
                    </div>
                    <button
                      type="button" onClick={() => restore(a.id, a.name)} disabled={isBusy}
                      title="恢复"
                      style={{
                        padding: "5px 10px", fontSize: 11,
                        border: "1px solid var(--line-2)", borderRadius: 999,
                        background: "var(--card)", color: "var(--ink-2)",
                        cursor: isBusy ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      <RotateCcw size={11} />{isBusy ? "…" : "复职"}
                    </button>
                  </div>
                );
              })}
              <div style={{ fontSize: 11, color: "var(--ink-4)", padding: "6px 4px 0" }}>
                永久删除 / 详细历史在 CEO 配置（👑）→ 高级设置 → 已归档员工
              </div>
            </div>
          )}
        </div>
      )}

      {selected && (
        <AgentSheet
          agent={selected}
          allStaff={staff}
          onClose={() => setSelected(null)}
        />
      )}

    </section>
  );
}

function AgentCard({ agent, onClick, isSystem }: { agent: StaffRow; onClick: () => void; isSystem?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        width: "100%", textAlign: "left",
        background: isSystem ? "var(--paper-2)" : "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 18, padding: "12px 14px", cursor: "pointer",
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: "50%",
        background: agentColor(agent.name),
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0,
      }}>
        {agent.name.slice(0, 1)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{agent.name}</div>
          {isSystem && (
            <span style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 999,
              background: "var(--paper)", color: "var(--ink-4)",
              border: "1px solid var(--line)",
            }}>系统</span>
          )}
        </div>
        <div className="muted" style={{ fontSize: 13 }}>{agent.role}</div>
      </div>
      <span className={`badge ${agent.status}`}>{agent.status}</span>
    </button>
  );
}

export type { StaffRow };
