import Link from "next/link";
import { listMeetings } from "../../lib/v2-data";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "待批准",
  in_session: "进行中",
  summarized: "已总结",
  rejected: "已拒绝",
  cancelled: "已取消",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--gold)",
  in_session: "var(--blue, #1A5E8A)",
  summarized: "var(--green, #2E7D52)",
  rejected: "var(--ink-4)",
  cancelled: "var(--ink-4)",
};

export default async function MeetingPage() {
  const meetings = await listMeetings();

  return (
    <section className="page">
      <h1 style={{
        fontFamily: "var(--serif)", fontSize: 32, fontWeight: 500,
        margin: "0 0 4px", color: "var(--ink)",
      }}>
        会议室
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 13, margin: "4px 0 20px" }}>
        多员工讨论室。CEO 主聊天里说『跟 X 和 Y 讨论 Z』可发起，agent 遇到难题也能申请。
      </p>

      {meetings.length === 0 ? (
        <div className="empty-state">
          还没有会议。在 CEO 主聊天里说『跟 Nova 和 Ledger 一起讨论一下 Q2 预算』即可发起。
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {meetings.map(m => {
            const color = STATUS_COLOR[m.status] ?? "var(--ink-4)";
            const date = new Date(m.created_at).toLocaleString("zh-CN", {
              month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
            });
            return (
              <Link key={m.id} href={`/meeting/${m.id}`} style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                background: "var(--card)", border: "1px solid var(--line)",
                borderRadius: 16, padding: "12px 14px",
                textDecoration: "none", color: "inherit",
              }}>
                <div style={{
                  flexShrink: 0, width: 3, alignSelf: "stretch",
                  borderRadius: 2, background: color, minHeight: 36,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color,
                      padding: "1px 7px", borderRadius: 999, background: `${color}18`,
                    }}>
                      {STATUS_LABEL[m.status] ?? m.status}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ink-4)" }}>{date}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", lineHeight: 1.35 }}>
                    {m.topic}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 3 }}>
                    {m.initiator_kind === "ceo"
                      ? "由 CEO 发起"
                      : m.initiator_kind === "agent" && m.initiator_agent_name
                      ? `由 ${m.initiator_agent_name} 申请`
                      : "系统发起"}
                    {m.participant_names.length > 0 && ` · 参与：${m.participant_names.join("、")}`}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
