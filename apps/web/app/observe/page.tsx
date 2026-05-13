import { MessageSquare, Radio } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { meetingThread, meetings } from "../../lib/ui-data";

export default function ObservePage() {
  const live = meetings[0];

  return (
    <PageScaffold
      title="会议室"
      subtitle="任务驱动的多员工讨论。你只需要进来做决策、纠偏或要求交付。"
      action={<span className="badge running">1 live</span>}
    >
      <section className="stack">
        {meetings.map((meeting, index) => (
          <article className={`meeting-card ${index === 0 ? "highlight" : ""}`} key={meeting.title}>
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <strong>{meeting.title}</strong>
              <span className={`badge ${meeting.status === "Live" ? "running" : "awaiting"}`}>{meeting.status}</span>
            </div>
            <div className="muted">{meeting.task} · owner {meeting.owner}</div>
            <div>{meeting.summary}</div>
            <div className="toolbar">
              {meeting.agents.map((agent) => <span className="badge" key={agent}>{agent}</span>)}
            </div>
          </article>
        ))}
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header">
          <span className="panel-title"><Radio size={16} /> {live.title}</span>
          <span className="badge running">live thread</span>
        </div>
        <div className="panel-body message-list">
          {meetingThread.map((item) => (
            <div className="message" key={`${item.speaker}-${item.text}`}>
              <strong>{item.speaker}</strong>
              <div>{item.text}</div>
            </div>
          ))}
          <div className="message user">
            <strong>CEO decision needed</strong>
            <div>Approve paid sources for top 6 only, or force a free-source first pass?</div>
          </div>
          <div className="toolbar">
            <button className="button" type="button"><MessageSquare size={15} />批准 top 6</button>
            <button className="button secondary" type="button">先免费源</button>
          </div>
        </div>
      </section>
    </PageScaffold>
  );
}
