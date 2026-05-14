"use client";

import { useEffect, useState } from "react";
import { Target, ChevronRight } from "lucide-react";
import type { Mission } from "../lib/v2-data";
import { MissionSheet } from "./MissionSheet";

const STATUS_LABEL: Record<string, string> = {
  queued: "待接受",
  awaiting_input: "进行中",
  completed: "已递交",
  cancelled: "已拒绝",
  failed: "失败",
};

const STATUS_COLOR: Record<string, string> = {
  queued: "var(--gold)",
  awaiting_input: "var(--blue, #1A5E8A)",
  completed: "var(--green, #2E7D52)",
  cancelled: "var(--ink-4)",
};

export function MissionInbox() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    try {
      const res = await fetch("/api/v2/missions");
      if (res.ok) setMissions(await res.json());
    } catch {}
    setLoaded(true);
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, []);

  if (!loaded) return null;
  if (missions.length === 0) return null;

  const pending = missions.filter(m => m.status === "queued" || m.status === "awaiting_input");
  const archived = missions.filter(m => m.status === "completed" || m.status === "cancelled");

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 11, fontWeight: 600, color: "var(--gold)",
          textTransform: "uppercase", letterSpacing: 0.7,
          marginBottom: 8,
        }}>
          <Target size={12} />
          我的使命
          <span style={{ color: "var(--ink-4)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
            · 来自上级
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pending.map(m => (
            <MissionCard key={m.id} mission={m} onOpen={() => setOpenId(m.id)} />
          ))}
          {archived.length > 0 && (
            <details style={{ marginTop: 2 }}>
              <summary style={{
                fontSize: 12, color: "var(--ink-4)", cursor: "pointer",
                padding: "4px 0", listStyle: "none",
              }}>
                已归档 {archived.length} 项 ▾
              </summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {archived.map(m => (
                  <MissionCard key={m.id} mission={m} onOpen={() => setOpenId(m.id)} dim />
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      {openId && (
        <MissionSheet
          missionId={openId}
          onClose={() => setOpenId(null)}
          onChange={refresh}
        />
      )}
    </>
  );
}

function MissionCard({
  mission,
  onOpen,
  dim,
}: {
  mission: Mission;
  onOpen: () => void;
  dim?: boolean;
}) {
  const isUrgent = mission.status === "queued";
  const statusColor = STATUS_COLOR[mission.status] ?? "var(--ink-4)";

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", textAlign: "left", cursor: "pointer",
        background: isUrgent ? "var(--gold-soft)" : "var(--card)",
        border: `1px solid ${isUrgent ? "oklch(0.62 0.14 70 / 0.35)" : "var(--line)"}`,
        borderRadius: 16, padding: "12px 14px",
        opacity: dim ? 0.6 : 1,
      }}
    >
      <div style={{
        flexShrink: 0, width: 3, alignSelf: "stretch",
        borderRadius: 2, background: statusColor, minHeight: 36,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: statusColor,
            padding: "1px 7px", borderRadius: 999,
            background: `${statusColor}18`,
          }}>
            {STATUS_LABEL[mission.status] ?? mission.status}
          </span>
          <span style={{ fontSize: 11, color: "var(--ink-4)" }}>
            来自 {mission.mission_source ?? "上级"}
          </span>
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", lineHeight: 1.4 }}>
          {mission.title}
        </div>
        {mission.subtask_count > 0 && (
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
            已拆解 {mission.subtask_count} 个子任务 · 完成 {mission.subtask_done}/{mission.subtask_count}
          </div>
        )}
      </div>
      <ChevronRight size={16} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
    </button>
  );
}
