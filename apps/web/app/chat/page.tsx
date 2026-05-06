import { Play, Square } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { StatusBadge } from "../../components/StatusBadge";

export default function ChatPage() {
  return (
    <PageScaffold
      title="Chat"
      subtitle="Streaming workspace for immediate sessions, tool events, budget control, and trace handoff."
      action={
        <>
          <button className="button secondary" type="button">
            <Square size={15} />
            Kill
          </button>
          <button className="button" type="button">
            <Play size={15} />
            New chat
          </button>
        </>
      }
    >
      <div className="chat-layout">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title">Sessions</span>
            <span className="badge">Search</span>
          </div>
          <div className="panel-body session-list">
            {["Today", "Yesterday", "Past 7 days"].map((group) => (
              <div key={group}>
                <div className="nav-label">{group}</div>
                <div className="message">
                  <strong>research_agent</strong>
                  <div className="muted">K-12 robotics market scan · 14:23</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <span className="panel-title">research_agent@3</span>
            <StatusBadge state="running" />
          </div>
          <div className="panel-body message-list">
            <div className="message user">Find current robotics education opportunities for US schools.</div>
            <div className="message">
              <span className="muted">Working...</span>
            </div>
            <div className="tool-block">
              <strong>WebSearch</strong>
              <div className="mono muted">"2026 K-12 robotics education grants" · 3.2s · $0.004</div>
            </div>
            <div className="message">
              Early signal: public funding is concentrated around CTE, after-school STEM, and district-level
              workforce readiness programs.
            </div>
          </div>
          <div className="panel-header">
            <textarea
              aria-label="Message"
              placeholder="Send a message or inject a correction..."
              rows={2}
              style={{ width: "100%", resize: "vertical", background: "transparent", color: "inherit", border: 0 }}
            />
            <button className="button" type="button">Send</button>
          </div>
        </section>

        <aside className="panel">
          <div className="panel-header">
            <span className="panel-title">Session info</span>
          </div>
          <div className="panel-body stack">
            <div>
              <div className="muted">Budget</div>
              <strong>$0.31 / $5.00</strong>
            </div>
            <div>
              <div className="muted">Tree</div>
              <div className="mono">root {">"} research_agent child</div>
            </div>
            <div>
              <div className="muted">Recent events</div>
              <div className="mono">tool_use · tool_result · message_chunk</div>
            </div>
          </div>
        </aside>
      </div>
    </PageScaffold>
  );
}
