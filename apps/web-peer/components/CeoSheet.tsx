"use client";

import { X, Crown, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CeoProfile } from "../lib/v2-data";
import { BudgetRow } from "./BudgetRow";
import { CeoIntegrations } from "./CeoIntegrations";
import { CeoSkills } from "./CeoSkills";
import { CeoMemory } from "./CeoMemory";
import { ArchivedAgents } from "./ArchivedAgents";

// ── Inline editable field (same pattern as AgentSheet) ────────────────────────

function InlineField({
  label, value, onSave, multiline = false, placeholder = "",
}: {
  label: string;
  value: string;
  onSave: (v: string) => Promise<void>;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  function startEdit() {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }
  async function save() {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(draft); } finally { setSaving(false); setEditing(false); }
  }

  const sharedInputStyle: React.CSSProperties = {
    display: "block", width: "100%", boxSizing: "border-box",
    padding: "10px 12px", borderRadius: 10,
    border: "1px solid var(--gold)", fontSize: 14,
    background: "var(--card)", color: "var(--ink)", outline: "none",
    fontFamily: "inherit", lineHeight: 1.5,
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        {label}
        {saving && <span style={{ fontStyle: "italic" }}>保存中…</span>}
      </div>
      {editing ? (
        multiline ? (
          <textarea
            ref={inputRef} value={draft} rows={6}
            onChange={e => setDraft(e.target.value)} onBlur={save}
            style={{ ...sharedInputStyle, resize: "vertical" }}
          />
        ) : (
          <input
            ref={inputRef} value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            style={sharedInputStyle}
          />
        )
      ) : (
        <div onClick={startEdit} style={{
          fontSize: 14, color: value ? "var(--ink)" : "var(--ink-4)",
          lineHeight: 1.55, padding: "6px 2px", cursor: "text",
          borderBottom: "1px dashed var(--line)",
          whiteSpace: "pre-wrap", wordBreak: "break-word",
          minHeight: 22,
        }}>
          {value || <span style={{ fontStyle: "italic" }}>{placeholder || "点击编辑…"}</span>}
        </div>
      )}
    </div>
  );
}

// ── CEO Sheet ─────────────────────────────────────────────────────────────────

export function CeoSheet({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<CeoProfile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/v2/ceo");
      if (res.ok) setProfile(await res.json());
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function saveField(fields: Partial<CeoProfile>) {
    await fetch("/api/v2/ceo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    setProfile(prev => prev ? { ...prev, ...fields } as CeoProfile : prev);
  }

  async function generateToken() {
    setGenerating(true);
    try {
      const res = await fetch("/api/v2/ceo", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setProfile(prev => prev ? { ...prev, upstream_token: d.upstream_token } : prev);
      }
    } finally { setGenerating(false); }
  }

  function copyToken() {
    if (!profile?.upstream_token) return;
    navigator.clipboard.writeText(`${window.location.origin}/my/${profile.upstream_token}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  function clearChat() {
    if (!confirm("清空 CEO 主聊天的所有消息？此操作不可恢复。")) return;
    setClearingChat(true);
    try {
      localStorage.setItem("mibusy-chat-cleared-at", new Date().toISOString());
      localStorage.setItem("mibusy-seen-handoffs-v1", "[]");
      localStorage.removeItem("mibusy-chat-v1");
      window.dispatchEvent(new CustomEvent("mibusy-chat-clear"));
    } finally {
      setClearingChat(false);
      onClose();
    }
  }

  function compactChat() {
    try {
      const raw = localStorage.getItem("mibusy-chat-v1");
      if (!raw) { alert("聊天为空"); return; }
      const msgs = JSON.parse(raw) as Array<{ role: string; content: string }>;
      const kept = msgs.slice(-20);
      localStorage.setItem("mibusy-chat-v1", JSON.stringify(kept));
      alert(`已浓缩：保留最近 ${kept.length} 条 / 原 ${msgs.length} 条`);
      // No reload — user can navigate back to see the trimmed chat
    } catch {
      alert("浓缩失败");
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
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
            flexShrink: 0, width: 44, height: 44, borderRadius: "50%",
            background: "var(--gold)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Crown size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 1 }}>CEO 配置 · 你自己</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>
              {profile?.name ?? "—"}
            </div>
          </div>
          <button
            type="button" onClick={onClose}
            style={{
              flexShrink: 0, width: 32, height: 32, border: "none",
              borderRadius: "50%", background: "var(--paper-2)", cursor: "pointer",
              color: "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          ><X size={15} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {!profile ? (
            <div className="muted">加载中…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {/* Identity — name + role on a single row */}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: "0 0 38%", minWidth: 0 }}>
                  <InlineField
                    label="名字" value={profile.name}
                    placeholder="叫我什么"
                    onSave={v => saveField({ name: v })}
                  />
                </div>
                <div style={{ flex: "1 1 0%", minWidth: 0 }}>
                  <InlineField
                    label="职务" value={profile.role}
                    placeholder="例：CEO、产品负责人、技术合伙人…"
                    onSave={v => saveField({ role: v })}
                  />
                </div>
              </div>
              <InlineField
                label="角色设定 / 工作风格"
                value={profile.system_prompt}
                placeholder="描述你的工作方式、风格、关注点…会用在主聊天里塑造对话风格"
                multiline
                onSave={v => saveField({ system_prompt: v })}
              />

              {/* Budget */}
              <BudgetRow
                label="月预算"
                budget={profile.monthly_budget}
                spent={profile.monthSpent}
                onSave={async n => {
                  await fetch("/api/v2/ceo", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ monthly_budget: n }),
                  });
                  setProfile(prev => prev ? { ...prev, monthly_budget: n } : prev);
                }}
                hint="本月所有员工已花费的累计 — 月初自动清零"
              />

              {/* Workspace sandbox */}
              <div style={{ paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                <div style={{
                  fontSize: 11, color: "var(--ink-4)", fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: 0.5,
                  marginBottom: 6,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ color: "var(--gold)" }}>📁</span>
                  工作沙盒
                  <span style={{ fontSize: 10, fontWeight: 400, color: "var(--ink-4)", textTransform: "none", letterSpacing: 0 }}>
                    （文件读写根目录，agent 在这里产出文件）
                  </span>
                </div>
                <InlineField
                  label="目录绝对路径"
                  value={profile.workspace_dir ?? ""}
                  placeholder="例：/Users/chen/mibusy-workspace 或 ~/Dropbox/Mibusy"
                  onSave={v => saveField({ workspace_dir: v || null })}
                />
                <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 6, lineHeight: 1.5 }}>
                  PDF / 数据 / 参考资料放进这个目录，agent 干活时会 `cd` 进来读写。<br />
                  指向 Dropbox / iCloud 目录可跨设备同步。
                </div>
              </div>

              {/* CEO's Skill toolbox — promoted to high visibility, right under Budget */}
              <div style={{ paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                <div style={{
                  fontSize: 11, color: "var(--ink-4)", fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: 0.5,
                  marginBottom: 10,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ color: "var(--gold)" }}>⚡</span>
                  我的 Skill 工具箱
                  <span style={{ fontSize: 10, fontWeight: 400, color: "var(--ink-4)", textTransform: "none", letterSpacing: 0 }}>
                    （全员继承使用）
                  </span>
                </div>
                <CeoSkills />
              </div>

              {/* Upstream connection */}
              <div style={{
                paddingTop: 18, borderTop: "1px solid var(--line)",
                display: "flex", flexDirection: "column", gap: 14,
              }}>
                <div style={{
                  fontSize: 11, color: "var(--ink-4)", fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>
                  上级连接
                </div>

                <InlineField
                  label="上级名称（显示用）"
                  value={profile.upstream_name ?? ""}
                  placeholder="例：联合创始人 · 王总 / 董事会"
                  onSave={v => saveField({ upstream_name: v || null })}
                />

                <div>
                  <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 6 }}>
                    上级用此令牌给你派 mission
                  </div>
                  {!profile.upstream_token ? (
                    <button
                      type="button" onClick={generateToken} disabled={generating}
                      style={{
                        width: "100%", padding: "10px 0",
                        border: "1px dashed var(--line-2)", borderRadius: 10,
                        background: "transparent", fontSize: 13, color: "var(--ink-3)",
                        cursor: generating ? "not-allowed" : "pointer",
                      }}
                    >
                      {generating ? "生成中…" : "+ 生成上级令牌"}
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{
                        flex: 1, background: "var(--paper-2)", borderRadius: 8, padding: "8px 10px",
                        fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-3)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        /my/{profile.upstream_token}
                      </div>
                      <button
                        type="button" onClick={copyToken}
                        style={{
                          padding: "8px 12px", border: "1px solid var(--line-2)", borderRadius: 8,
                          background: "transparent", fontSize: 12, cursor: "pointer",
                          color: copied ? "var(--gold)" : "var(--ink-3)",
                        }}
                      >
                        {copied ? "已复制" : "复制"}
                      </button>
                      <button
                        type="button" onClick={generateToken} disabled={generating}
                        title="重新生成（旧令牌作废）"
                        style={{
                          padding: "8px 12px", border: "1px solid var(--line-2)", borderRadius: 8,
                          background: "transparent", fontSize: 12, cursor: "pointer",
                          color: "var(--ink-4)",
                        }}
                      >
                        ↻
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat maintenance */}
              <div style={{
                paddingTop: 18, borderTop: "1px solid var(--line)",
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{
                  fontSize: 11, color: "var(--ink-4)", fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>
                  主聊天维护
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
                  CEO 主聊天存在浏览器本地。时间长了会变长，可以浓缩（保留最近 20 条）或全部清空。
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button" onClick={compactChat}
                    style={{
                      flex: 1, padding: "9px 0",
                      border: "1px solid var(--line-2)", borderRadius: 10,
                      background: "transparent", fontSize: 13, fontWeight: 500,
                      cursor: "pointer", color: "var(--ink-2)",
                    }}
                  >
                    浓缩对话
                  </button>
                  <button
                    type="button" onClick={clearChat} disabled={clearingChat}
                    style={{
                      flex: 1, padding: "9px 0",
                      border: "1px solid oklch(0.58 0.19 25 / 0.3)", borderRadius: 10,
                      background: "transparent", fontSize: 13, fontWeight: 500,
                      cursor: clearingChat ? "not-allowed" : "pointer",
                      color: "var(--red)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    }}
                  >
                    <Trash2 size={13} />
                    清空全部
                  </button>
                </div>
              </div>

              {/* External integrations — live */}
              <div style={{
                paddingTop: 18, borderTop: "1px solid var(--line)",
              }}>
                <CeoIntegrations />
              </div>

              {/* Advanced settings — collapsed by default */}
              <div style={{ paddingTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setAdvancedOpen(o => !o)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "10px 12px",
                    border: "1px solid var(--line)",
                    borderRadius: advancedOpen ? "10px 10px 0 0" : 10,
                    background: "var(--paper-2)", cursor: "pointer",
                    fontSize: 13, color: "var(--ink-2)",
                  }}
                >
                  <span style={{ fontWeight: 500 }}>高级设置</span>
                  {advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {advancedOpen && (
                  <div style={{
                    border: "1px solid var(--line)", borderTop: "none",
                    borderRadius: "0 0 10px 10px",
                    padding: "14px 14px 18px",
                    display: "flex", flexDirection: "column", gap: 18,
                  }}>
                    {/* Memory — long-term */}
                    <div>
                      <div style={{
                        fontSize: 11, color: "var(--ink-4)", fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: 0.5,
                        marginBottom: 10,
                      }}>
                        长期记忆
                      </div>
                      <CeoMemory />
                    </div>

                    {/* Archived agents — sub-section */}
                    <div>
                      <div style={{
                        fontSize: 11, color: "var(--ink-4)", fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: 0.5,
                        marginBottom: 10,
                      }}>
                        已归档员工
                      </div>
                      <ArchivedAgents />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
