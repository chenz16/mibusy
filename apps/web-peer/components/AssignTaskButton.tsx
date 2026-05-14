"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type StaffOption = { id: string; name: string; role: string };

export function AssignTaskButton({
  staff,
  label = "分配新任务",
  icon,
  primary = false,
  defaultAgentId,
}: {
  staff: StaffOption[];
  label?: string;
  icon?: React.ReactNode;
  primary?: boolean;
  defaultAgentId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [agentId, setAgentId] = useState(defaultAgentId ?? staff[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setTitle(""); setPrompt(""); setAgentId(defaultAgentId ?? staff[0]?.id ?? ""); setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !prompt.trim() || !agentId) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/v2/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          prompt: prompt.trim(),
          assigned_to_agent_id: agentId,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "提交失败");
        return;
      }
      setOpen(false); reset();
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { reset(); setOpen(true); }}
        className={`button${primary ? "" : " secondary"}`}
        style={{ gap: 6 }}
      >
        {icon ?? <Plus size={14} />}{label}
      </button>

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 480, margin: "0 auto",
              background: "var(--paper)",
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: "20px 20px 36px",
              boxShadow: "0 -8px 24px rgba(0,0,0,0.18)",
            }}
          >
            <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, color: "var(--ink)" }}>
                  分配新任务
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
                  任务将排队等待员工执行
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}
              >
                关闭
              </button>
            </header>

            <form onSubmit={submit}>
              <label style={{ display: "block", fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>
                任务标题
              </label>
              <input
                autoFocus
                placeholder="例：分析 K-12 机器人市场趋势"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                required
                style={{
                  display: "block", width: "100%",
                  padding: "10px 12px", borderRadius: 10,
                  border: "1px solid var(--line-2)",
                  fontFamily: "var(--mono)", fontSize: 13,
                  background: "var(--card)", color: "var(--ink)",
                  outline: "none", marginBottom: 16,
                }}
              />

              <label style={{ display: "block", fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>
                任务描述（给员工的指令）
              </label>
              <textarea
                placeholder="详细描述任务目标、背景和期望的交付成果…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                required
                rows={4}
                style={{
                  display: "block", width: "100%",
                  padding: "10px 12px", borderRadius: 10,
                  border: "1px solid var(--line-2)", fontSize: 13,
                  background: "var(--card)", color: "var(--ink)",
                  outline: "none", marginBottom: 16, resize: "vertical",
                }}
              />

              <label style={{ display: "block", fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>
                分配给
              </label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                disabled={loading}
                style={{
                  display: "block", width: "100%",
                  padding: "10px 12px", borderRadius: 10,
                  border: "1px solid var(--line-2)", fontSize: 14,
                  background: "var(--card)", color: "var(--ink)",
                  outline: "none", marginBottom: 16,
                }}
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.role}
                  </option>
                ))}
              </select>

              {error && (
                <div style={{
                  marginBottom: 14, padding: 10, fontSize: 12,
                  color: "var(--red)", background: "oklch(0.58 0.19 25 / 0.10)",
                  borderRadius: 8,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !title.trim() || !prompt.trim()}
                style={{
                  width: "100%", padding: "13px 0",
                  background: !loading && title.trim() && prompt.trim() ? "var(--gold)" : "var(--ink-4)",
                  color: "#fff", borderRadius: 10,
                  fontWeight: 600, fontSize: 15, border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "正在提交…" : "确认分配"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
