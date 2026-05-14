"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { AssignmentRow } from "../lib/v2-data";

const HIDE_KEY = "mibusy-hidden-assignments-v1";

function loadHidden(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(HIDE_KEY) ?? "[]")); } catch { return new Set(); }
}

function saveHidden(ids: Set<string>) {
  try { localStorage.setItem(HIDE_KEY, JSON.stringify([...ids])); } catch {}
}

const STATUS_COLOR: Record<string, string> = {
  completed: "var(--green, #2E7D52)",
  failed: "var(--red, #c0392b)",
  running: "var(--blue, #1A5E8A)",
  queued: "var(--ink-3)",
  cancelled: "var(--ink-4)",
};
const STATUS_LABEL: Record<string, string> = {
  completed: "已完成", failed: "失败", running: "执行中",
  queued: "排队中", cancelled: "已取消",
};

type SwipeState = { id: string; x: number } | null;

function AssignmentCard({
  item,
  onHide,
  onDelete,
}: {
  item: AssignmentRow;
  onHide: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const REVEAL = 100;
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fullBody, setFullBody] = useState<string | null>(null);
  const [loadingBody, setLoadingBody] = useState(false);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    if (!expanded || fullBody != null || !item.deliverable_title) return;
    setLoadingBody(true);
    fetch(`/api/v2/assignments/${item.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.deliverable_body) setFullBody(d.deliverable_body); })
      .finally(() => setLoadingBody(false));
  }, [expanded, fullBody, item.id, item.deliverable_title]);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx > 0 && !revealed) return;
    const target = revealed ? dx - REVEAL : dx;
    setOffset(Math.max(-REVEAL, Math.min(0, target)));
  }
  function onTouchEnd() {
    if (offset < -REVEAL / 2) {
      setOffset(-REVEAL);
      setRevealed(true);
    } else {
      setOffset(0);
      setRevealed(false);
    }
    startX.current = null;
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/v2/assignments/${item.id}`, { method: "DELETE" }).catch(() => null);
    onDelete(item.id);
  }

  const d = new Date(item.created_at);
  const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div style={{ position: "relative", borderRadius: 18, overflow: "hidden" }}>
      {/* Action buttons revealed behind the card */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        display: "flex", alignItems: "stretch", width: REVEAL,
      }}>
        <button
          type="button"
          onClick={() => onHide(item.id)}
          style={{
            flex: 1, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
            background: "var(--paper-2)", color: "var(--ink-3)",
          }}
        >隐藏</button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          style={{
            flex: 1, border: "none", cursor: deleting ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600,
            background: "oklch(0.58 0.19 25)", color: "#fff",
          }}
        >{deleting ? "…" : "删除"}</button>
      </div>

      {/* Card — slides left on swipe, click to expand */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (offset === 0) setExpanded(e => !e); }}
        style={{
          transform: `translateX(${offset}px)`,
          transition: startX.current ? "none" : "transform 220ms ease",
          background: "var(--card)", border: "1px solid var(--line)",
          borderRadius: 18, padding: "12px 14px",
          display: "flex", flexDirection: "column", gap: 6,
          position: "relative", zIndex: 1, cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
            {expanded ? <ChevronDown size={14} style={{ color: "var(--ink-3)", flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: "var(--ink-3)", flexShrink: 0 }} />}
            <div style={{ fontWeight: 600, fontSize: 14, flex: 1, minWidth: 0 }}>{item.title}</div>
          </div>
          <span style={{
            flexShrink: 0, fontSize: 11, fontWeight: 600, padding: "2px 8px",
            borderRadius: 999, background: `${STATUS_COLOR[item.status] ?? "#888"}18`,
            color: STATUS_COLOR[item.status] ?? "#888",
          }}>
            {STATUS_LABEL[item.status] ?? item.status}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--ink-3)", paddingLeft: 20 }}>
          <span>{item.assigned_to_name ?? "—"}</span>
          <span>·</span>
          <span>{dateStr}</span>
          {item.budget_limit != null && (
            <>
              <span>·</span>
              <span>预算 ${item.budget_limit}</span>
            </>
          )}
        </div>
        {item.deliverable_title && !expanded && (
          <div style={{ fontSize: 12, color: "var(--green, #2E7D52)", fontWeight: 500, paddingLeft: 20 }}>
            ✓ {item.deliverable_title}
          </div>
        )}
        {expanded && (
          <div style={{
            marginTop: 8, paddingTop: 10, paddingLeft: 20,
            borderTop: "1px solid var(--line)",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            {item.deliverable_title && (
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green, #2E7D52)" }}>
                ✓ {item.deliverable_title}
              </div>
            )}
            {loadingBody && <div style={{ fontSize: 12, color: "var(--ink-4)" }}>加载交付内容…</div>}
            {fullBody && (
              <div style={{
                fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6,
                background: "var(--paper-2)", borderRadius: 10, padding: "10px 12px",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                maxHeight: 360, overflowY: "auto",
              }}>{fullBody}</div>
            )}
            {!loadingBody && !fullBody && !item.deliverable_title && (
              <div style={{ fontSize: 12, color: "var(--ink-4)" }}>暂无交付内容</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ExecutionList({ initialItems }: { initialItems: AssignmentRow[] }) {
  const [hidden, setHidden] = useState<Set<string>>(loadHidden);
  const [items, setItems] = useState<AssignmentRow[]>(initialItems);

  function hide(id: string) {
    const next = new Set(hidden).add(id);
    setHidden(next);
    saveHidden(next);
  }

  function remove(id: string) {
    setItems(prev => prev.filter(a => a.id !== id));
    const next = new Set(hidden);
    next.delete(id);
    setHidden(next);
    saveHidden(next);
  }

  const visible = items.filter(a => !hidden.has(a.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {hidden.size > 0 && (
        <button
          type="button"
          onClick={() => { setHidden(new Set()); saveHidden(new Set()); }}
          style={{
            background: "none", border: "none", color: "var(--ink-3)",
            fontSize: 12, textAlign: "right", padding: "0 2px 4px", cursor: "pointer",
          }}
        >
          显示已隐藏 ({hidden.size})
        </button>
      )}
      {visible.length === 0 ? (
        <div className="empty-state">暂无执行记录</div>
      ) : (
        visible.map(item => (
          <AssignmentCard
            key={item.id}
            item={item}
            onHide={hide}
            onDelete={remove}
          />
        ))
      )}
    </div>
  );
}
