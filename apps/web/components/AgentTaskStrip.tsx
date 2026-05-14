"use client";

import { useEffect, useState } from "react";
import { Target, Plus, Pin } from "lucide-react";
import type { TaskSummary, StaffRow } from "../lib/v2-data";
import { TaskSheet } from "./TaskSheet";
import { AssignTaskButton } from "./AssignTaskButton";

const STATUS_DOT: Record<string, string> = {
  queued: "var(--ink-4)",
  running: "var(--blue, #1A5E8A)",
  awaiting_input: "var(--gold)",
  completed: "var(--green, #2E7D52)",
  cancelled: "var(--ink-4)",
  failed: "var(--red)",
};

export function AgentTaskStrip({
  agentId, agentName, allStaff,
}: { agentId: string; agentName: string; allStaff: StaffRow[] }) {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  async function load() {
    try {
      const r = await fetch(`/api/v2/tasks?agent_id=${encodeURIComponent(agentId)}`);
      if (r.ok) setTasks(await r.json());
    } finally { setLoaded(true); }
  }
  useEffect(() => {
    load();
    const id = setInterval(load, 12_000);
    return () => clearInterval(id);
  }, [agentId]);

  const archivedStatuses = new Set(["completed", "cancelled", "failed"]);
  const active = tasks.filter(t => !archivedStatuses.has(t.status));
  const archived = tasks.filter(t => archivedStatuses.has(t.status));
  const visible = showArchived ? tasks : active;

  if (!loaded) return null;

  return (
    <div style={{ flexShrink: 0, padding: "12px 20px 12px" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 6,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          fontSize: 11, color: "var(--ink-4)", fontWeight: 600,
          textTransform: "uppercase", letterSpacing: 0.5,
        }}>
          <Pin size={10} />
          {agentName} 的任务
          <span style={{ fontWeight: 400, marginLeft: 4 }}>
            ({active.length} 进行中{archived.length > 0 ? ` · ${archived.length} 已完结` : ""})
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {archived.length > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived(s => !s)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 11, color: "var(--ink-4)",
                textDecoration: "underline", textDecorationStyle: "dotted",
              }}
            >
              {showArchived ? "只看进行中" : "看全部"}
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 12px", borderRadius: 10,
          background: "var(--paper-2)", border: "1px dashed var(--line-2)",
          fontSize: 12, color: "var(--ink-4)",
        }}>
          <Target size={12} />
          {agentName} 还没有任何任务 — 点下方按钮派一个
        </div>
      ) : (
        <div style={{
          display: "flex", gap: 8, overflowX: "auto",
          paddingBottom: 4, marginBottom: 2,
        }}>
          {visible.map(t => (
            <TaskCard key={t.id} task={t} onClick={() => setOpenTaskId(t.id)} archived={archivedStatuses.has(t.status)} />
          ))}
          {/* + add task card */}
          <div style={{ flexShrink: 0, minWidth: 80 }}>
            <AssignTaskButton
              staff={allStaff}
              defaultAgentId={agentId}
              label="+ 任务"
            />
          </div>
        </div>
      )}

      {openTaskId && (
        <TaskSheet
          taskId={openTaskId}
          onClose={() => setOpenTaskId(null)}
          onChange={load}
        />
      )}
    </div>
  );
}

function TaskCard({ task, onClick, archived }: { task: TaskSummary; onClick: () => void; archived: boolean }) {
  const dot = STATUS_DOT[task.status] ?? "var(--ink-4)";
  const recent = new Date(task.last_activity_at);
  const mins = Math.max(0, Math.round((Date.now() - recent.getTime()) / 60000));
  const ago = mins < 60 ? `${mins}分钟前` : mins < 60 * 24 ? `${Math.round(mins / 60)}小时前` : `${Math.round(mins / 60 / 24)}天前`;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0, minWidth: 200, maxWidth: 240,
        textAlign: "left", cursor: "pointer",
        background: "var(--card)",
        border: `1px solid ${task.status === "running" ? "var(--blue, #1A5E8A)" : "var(--line)"}`,
        borderRadius: 12, padding: "10px 12px",
        display: "flex", flexDirection: "column", gap: 4,
        opacity: archived ? 0.55 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span
          className={task.status === "running" ? "pulse-dot" : undefined}
          style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }}
        />
        <span style={{ fontSize: 10, color: "var(--ink-4)" }}>{ago}</span>
      </div>
      <div style={{
        fontSize: 13, fontWeight: 600, color: "var(--ink)",
        overflow: "hidden", textOverflow: "ellipsis",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        lineHeight: 1.35,
      }}>
        {task.title}
      </div>
      <div style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 2 }}>
        {task.child_count > 0 ? (
          <>执行 {task.child_done}/{task.child_count}{task.child_running > 0 ? ` · ${task.child_running} 在跑` : ""}</>
        ) : (
          <>{task.status === "completed" || task.status === "cancelled" ? "已结束" : "等待首次执行"}</>
        )}
      </div>
    </button>
  );
}
