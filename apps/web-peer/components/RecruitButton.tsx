"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

type Generated = {
  id: string;
  name: string;
  role: string;
  system_prompt: string;
  monthly_budget: number;
};

const EXAMPLES = [
  "雇个市场总监，懂小红书和公众号",
  "我需要一个会写专业邮件的助理",
  "招个法务，看合同的",
  "找个数据分析师，会做财务模型",
];

export function RecruitButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Generated | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  // Manual fields (fallback)
  const [mName, setMName] = useState("");
  const [mRole, setMRole] = useState("");
  const [mBudget, setMBudget] = useState("50");

  function reset() {
    setDesc(""); setError(""); setDraft(null); setManualOpen(false);
    setMName(""); setMRole(""); setMBudget("50");
  }

  async function generate() {
    if (!desc.trim() || loading) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/v2/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "生成失败"); return; }
      setDraft(data);
      router.refresh();
    } catch { setError("网络错误"); }
    finally { setLoading(false); }
  }

  async function manualHire(e: React.FormEvent) {
    e.preventDefault();
    if (!mName.trim() || !mRole.trim() || loading) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/v2/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mName.trim(),
          role: mRole.trim(),
          kind: "specialist",
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "招聘失败"); return; }
      // Patch budget separately if not default
      const budget = parseFloat(mBudget);
      if (Number.isFinite(budget) && budget !== 50 && d.id) {
        await fetch(`/api/v2/agents/${d.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monthly_budget: budget }),
        });
      }
      setOpen(false); reset();
      router.refresh();
    } catch { setError("网络错误"); }
    finally { setLoading(false); }
  }

  function close() { setOpen(false); reset(); }

  return (
    <>
      <button
        type="button"
        onClick={() => { reset(); setOpen(true); }}
        style={{
          padding: "8px 14px", borderRadius: 999, fontSize: 13,
          fontWeight: 600, border: "1px solid var(--gold)",
          color: "var(--gold)", background: "var(--card)",
          cursor: "pointer",
        }}
      >
        + 雇人
      </button>

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
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
              padding: "20px 20px 28px",
              boxShadow: "0 -8px 24px rgba(0,0,0,0.18)",
              maxHeight: "88vh", overflowY: "auto",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600 }}>
                  雇个人
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
                  一句话描述，AI 自动生成完整档案
                </div>
              </div>
              <button type="button" onClick={close} style={{ fontSize: 13, color: "var(--ink-3)" }}>关闭</button>
            </div>

            {/* Result card */}
            {draft ? (
              <div>
                <div style={{
                  padding: "16px 16px 14px",
                  background: "var(--gold-soft)",
                  border: "1px solid oklch(0.62 0.14 70 / 0.3)",
                  borderRadius: 14,
                  marginBottom: 14,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--gold)", fontWeight: 600, marginBottom: 8 }}>
                    <Sparkles size={11} />已入职
                  </div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 600, marginBottom: 2 }}>
                    {draft.name}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 10 }}>
                    {draft.role} · 月预算 ${draft.monthly_budget}
                  </div>
                  <div style={{
                    fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6,
                    background: "var(--card)", border: "1px solid var(--line)",
                    borderRadius: 10, padding: "10px 12px",
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                    maxHeight: 200, overflowY: "auto",
                  }}>
                    {draft.system_prompt}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => { reset(); }}
                    style={{
                      flex: 1, padding: "10px 0",
                      border: "1px solid var(--line-2)", borderRadius: 10,
                      background: "transparent", fontSize: 13, color: "var(--ink-2)",
                      cursor: "pointer",
                    }}
                  >
                    再雇一个
                  </button>
                  <button
                    type="button" onClick={close}
                    style={{
                      flex: 1, padding: "10px 0",
                      border: "none", borderRadius: 10,
                      background: "var(--gold)", color: "#fff",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    完成
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* NL input */}
                <textarea
                  autoFocus
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault(); generate();
                    }
                  }}
                  disabled={loading}
                  placeholder="例：雇个市场总监，懂小红书和公众号；或：一个会写邮件的助理…"
                  rows={3}
                  style={{
                    display: "block", width: "100%", boxSizing: "border-box",
                    padding: "12px 14px", borderRadius: 12,
                    border: "1px solid var(--line-2)", fontSize: 14,
                    background: "var(--card)", color: "var(--ink)",
                    outline: "none", resize: "vertical", lineHeight: 1.5,
                    fontFamily: "inherit", marginBottom: 8,
                  }}
                />

                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
                  {EXAMPLES.map(ex => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setDesc(ex)}
                      style={{
                        background: "var(--paper-2)", border: "1px solid var(--line)",
                        borderRadius: 999, padding: "3px 10px",
                        fontSize: 11, color: "var(--ink-3)", cursor: "pointer",
                      }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>

                {error && (
                  <div style={{
                    marginBottom: 12, padding: "8px 12px", fontSize: 12,
                    color: "var(--red)", background: "oklch(0.58 0.19 25 / 0.10)",
                    borderRadius: 8,
                  }}>{error}</div>
                )}

                <button
                  type="button"
                  onClick={generate}
                  disabled={loading || !desc.trim()}
                  style={{
                    width: "100%", padding: "12px 0",
                    border: "none", borderRadius: 12,
                    background: !loading && desc.trim() ? "var(--gold)" : "var(--paper-2)",
                    color: !loading && desc.trim() ? "#fff" : "var(--ink-4)",
                    fontSize: 14, fontWeight: 600,
                    cursor: loading ? "not-allowed" : (desc.trim() ? "pointer" : "default"),
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <Sparkles size={14} />
                  {loading ? "AI 在生成档案…" : "让助理生成 →"}
                </button>

                {/* Manual fallback */}
                <button
                  type="button"
                  onClick={() => setManualOpen(o => !o)}
                  style={{
                    marginTop: 14, background: "none", border: "none",
                    fontSize: 12, color: "var(--ink-4)", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  {manualOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  手动填表
                </button>

                {manualOpen && (
                  <form onSubmit={manualHire} style={{
                    marginTop: 10, padding: "14px",
                    background: "var(--paper-2)", borderRadius: 10,
                    border: "1px dashed var(--line-2)",
                    display: "flex", flexDirection: "column", gap: 10,
                  }}>
                    <input
                      placeholder="名字"
                      value={mName}
                      onChange={e => setMName(e.target.value)}
                      disabled={loading}
                      style={{
                        padding: "9px 12px", borderRadius: 8,
                        border: "1px solid var(--line-2)", fontSize: 13,
                        background: "var(--card)", color: "var(--ink)", outline: "none",
                      }}
                    />
                    <input
                      placeholder="职位 / 角色"
                      value={mRole}
                      onChange={e => setMRole(e.target.value)}
                      disabled={loading}
                      style={{
                        padding: "9px 12px", borderRadius: 8,
                        border: "1px solid var(--line-2)", fontSize: 13,
                        background: "var(--card)", color: "var(--ink)", outline: "none",
                      }}
                    />
                    <input
                      placeholder="月预算 USD（默认 50）"
                      value={mBudget}
                      onChange={e => setMBudget(e.target.value)}
                      disabled={loading}
                      inputMode="decimal"
                      style={{
                        padding: "9px 12px", borderRadius: 8,
                        border: "1px solid var(--line-2)", fontSize: 13,
                        background: "var(--card)", color: "var(--ink)", outline: "none",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={loading || !mName.trim() || !mRole.trim()}
                      style={{
                        padding: "9px 0", border: "none", borderRadius: 8,
                        background: !loading && mName.trim() && mRole.trim() ? "var(--ink)" : "var(--paper-2)",
                        color: "#fff", fontSize: 13, fontWeight: 600,
                        cursor: loading ? "not-allowed" : "pointer",
                      }}
                    >
                      {loading ? "入职中…" : "确认入职（手动）"}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
