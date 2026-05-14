import { Check, Edit3, Eye, FileText, X } from "lucide-react";

import { InboxActions } from "../../components/InboxActions";
import { getAwaitingAssignments, getDeliverables } from "../../lib/v2-data";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const [deliverables, awaiting] = await Promise.all([
    getDeliverables(),
    getAwaitingAssignments(),
  ]);

  return (
    <section className="page">

      <h1 style={{
        fontFamily: "var(--serif)", fontSize: 32, fontWeight: 500,
        margin: "0 0 4px", color: "var(--ink)",
      }}>
        待审
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 13, margin: "4px 0 20px" }}>
        员工把需要 CEO 判断的点集中到这里：看上下文、看建议、批准或改写。
      </p>

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <section className="stack" style={{ marginBottom: 24 }}>
          <div className="panel-header" style={{ border: 0, padding: "4px 2px", marginBottom: 8 }}>
            <span className="panel-title"><FileText size={16} /> 已完成交付</span>
            <span className="badge completed">{deliverables.length} items</span>
          </div>
          {deliverables.map((d) => (
            <article className="inbox-item" key={d.id}>
              <header className="toolbar" style={{ justifyContent: "space-between" }}>
                <div>
                  <strong>{d.title}</strong>
                  <div className="muted">
                    {d.agent_name ? `by ${d.agent_name} · ` : ""}
                    {new Date(d.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <span className="badge completed">delivered</span>
              </header>
              <section style={{
                fontFamily: "var(--mono)", fontSize: 12,
                color: "var(--ink-2)", lineHeight: 1.5,
                maxHeight: 120, overflow: "hidden",
                maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
              }}>
                {d.body.slice(0, 400)}
              </section>
              <footer className="toolbar">
                <button className="button secondary" type="button"><Eye size={15} />查看全文</button>
                <button className="button secondary" type="button"><Edit3 size={15} />归档</button>
              </footer>
            </article>
          ))}
        </section>
      )}

      {/* Awaiting decisions — real from DB */}
      <section className="stack">
        <div className="panel-header" style={{ border: 0, padding: "4px 2px", marginBottom: 8 }}>
          <span className="panel-title">等你拍板</span>
          <span className="badge awaiting">{awaiting.length} pending</span>
        </div>
        {awaiting.length === 0 ? (
          <div className="empty-state">暂无等待审批的任务</div>
        ) : (
          awaiting.map((item, index) => (
            <article className={`inbox-item ${index === 0 ? "highlight" : ""}`} key={item.id}>
              <header className="toolbar" style={{ justifyContent: "space-between" }}>
                <div>
                  <strong>{item.title}</strong>
                  <div className="muted">
                    {item.agent_name ?? "unknown"} · {new Date(item.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <span className={`badge ${item.status}`}>{item.status}</span>
              </header>
              {item.prompt ? (
                <section className="muted" style={{ fontSize: 13, lineHeight: 1.4 }}>
                  {item.prompt.slice(0, 200)}{item.prompt.length > 200 ? "…" : ""}
                </section>
              ) : null}
              <InboxActions assignmentId={item.id} />
            </article>
          ))
        )}
      </section>

    </section>
  );
}
