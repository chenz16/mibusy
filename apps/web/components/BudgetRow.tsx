"use client";

import { useEffect, useRef, useState } from "react";

export function BudgetRow({
  label = "月预算",
  budget,
  spent,
  onSave,
  hint,
}: {
  label?: string;
  budget: number | null;
  spent: number;
  onSave: (next: number | null) => Promise<void>;
  hint?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(budget != null ? String(budget) : "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(budget != null ? String(budget) : ""); }, [budget, editing]);

  const remaining = budget != null ? Math.max(0, budget - spent) : null;
  const pct = budget != null && budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const danger = pct >= 90;
  const warn = pct >= 70 && pct < 90;
  const barColor = danger ? "var(--red)" : warn ? "var(--gold)" : "var(--green, #2E7D52)";

  async function save() {
    const v = draft.trim();
    let next: number | null = null;
    if (v !== "") {
      const n = parseFloat(v);
      if (!Number.isFinite(n) || n < 0) { setEditing(false); return; }
      next = Math.round(n * 100) / 100;
    }
    if (next === budget) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(next); } finally { setSaving(false); setEditing(false); }
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        {label}
        {saving && <span style={{ fontStyle: "italic" }}>保存中…</span>}
      </div>

      {/* Budget input + spent display */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div
          onClick={() => {
            setDraft(budget != null ? String(budget) : "");
            setEditing(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          style={{
            flex: 1, cursor: "text",
            display: "flex", alignItems: "baseline", gap: 4,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--ink-4)" }}>$</span>
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={save}
              onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              type="text" inputMode="decimal"
              placeholder="不限"
              style={{
                width: 80, padding: "4px 8px",
                borderRadius: 6, border: "1px solid var(--gold)",
                background: "var(--card)", color: "var(--ink)",
                fontSize: 18, fontWeight: 600, outline: "none",
                fontFamily: "var(--serif)",
              }}
            />
          ) : (
            <span style={{
              fontSize: 22, fontWeight: 700, fontFamily: "var(--serif)",
              color: budget == null ? "var(--ink-4)" : "var(--ink)",
              borderBottom: "1px dashed transparent",
            }}>
              {budget == null ? "不限" : budget.toFixed(2)}
            </span>
          )}
          <span style={{ fontSize: 11, color: "var(--ink-4)", marginLeft: 2 }}>/月</span>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "var(--ink-4)" }}>本月已花</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: danger ? "var(--red)" : "var(--ink-2)" }}>
            ${spent.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Progress bar — only if budget is set */}
      {budget != null && (
        <div style={{
          height: 6, background: "var(--paper-2)", borderRadius: 3, overflow: "hidden",
          marginBottom: 4,
        }}>
          <div style={{
            width: `${pct}%`, height: "100%", background: barColor,
            transition: "width 300ms ease",
          }} />
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--ink-4)", display: "flex", justifyContent: "space-between" }}>
        <span>{hint ?? "点击数字编辑预算（留空 = 不限）"}</span>
        {budget != null && remaining != null && (
          <span style={{ color: danger ? "var(--red)" : warn ? "var(--gold)" : "var(--ink-3)" }}>
            剩 ${remaining.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
