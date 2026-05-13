import { Play, Square } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { StatusBadge } from "../../components/StatusBadge";
import { decisionItems, operatingMetrics, workstreams } from "../../lib/ui-data";

export default function ChatPage() {
  return (
    <PageScaffold
      title="CEO Desk"
      subtitle="Delegate objectives to a virtual team, review live work, and make decisions only when your judgment is needed."
      action={
        <>
          <button className="button secondary" type="button">
            <Square size={15} />
            Pause team
          </button>
          <button className="button" type="button">
            <Play size={15} />
            Delegate objective
          </button>
        </>
      }
    >
      <div className="split" style={{ paddingTop: 18 }}>
        {operatingMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <section className="panel" key={metric.label}>
              <div className="metric">
                <div className="muted"><Icon size={15} /> {metric.label}</div>
                <div className="metric-value">{metric.value}</div>
                <div className="muted">{metric.note}</div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="chat-layout">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title">Today brief</span>
            <span className="badge completed">Live</span>
          </div>
          <div className="panel-body session-list">
            {workstreams.map((workstream) => (
              <div className="message" key={workstream.name}>
                <strong>{workstream.name}</strong>
                <div className="muted">{workstream.owner} · {workstream.deliverable}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <span className="panel-title">K-12 district outreach strategy</span>
            <StatusBadge state="running" />
          </div>
          <div className="panel-body message-list">
            <div className="message user">Find the 20 best districts to approach for robotics education pilots.</div>
            <div className="message">
              <strong>Chief of Staff</strong>
              <div className="muted">Split into research, scoring, and outreach draft. Research Lead owns first pass.</div>
            </div>
            <div className="tool-block">
              <strong>Research Lead · WebSearch</strong>
              <div className="mono muted">"2026 K-12 robotics education grants" · 3.2s · $0.004</div>
            </div>
            <div className="message">
              Early signal: public funding is concentrated around CTE, after-school STEM, and district-level
              workforce readiness programs. Analyst is building a district fit score.
            </div>
          </div>
          <div className="panel-header">
            <textarea
              aria-label="Manager instruction"
              placeholder="Add context, redirect the team, or ask for a decision memo..."
              rows={2}
              style={{ width: "100%", resize: "vertical", background: "transparent", color: "inherit", border: 0 }}
            />
            <button className="button" type="button">Send</button>
          </div>
        </section>

        <aside className="panel">
          <div className="panel-header">
            <span className="panel-title">Needs you</span>
            <span className="badge awaiting">{decisionItems.length}</span>
          </div>
          <div className="panel-body stack">
            {decisionItems.slice(0, 2).map((item) => (
              <div className="message" key={item.title}>
                <strong>{item.title}</strong>
                <div className="muted">{item.question}</div>
              </div>
            ))}
            <button className="button secondary" type="button">Open Decisions</button>
          </div>
        </aside>
      </div>
    </PageScaffold>
  );
}
