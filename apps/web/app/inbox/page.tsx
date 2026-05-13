import { Check, Edit3, X } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { decisionItems } from "../../lib/ui-data";

export default function InboxPage() {
  return (
    <PageScaffold
      title="Decisions"
      subtitle="Approvals and judgment calls raised by the virtual team, with context, recommendation, cost, and risk."
      action={<span className="badge awaiting">{decisionItems.length} waiting</span>}
    >
      <div className="stack" style={{ paddingTop: 18 }}>
        {decisionItems.map((item) => (
          <article className="inbox-item" key={item.title}>
            <header>
              <strong>{item.title}</strong>
              <div className="muted">{item.age} ago · manager decision required · worker released</div>
            </header>
            <section>{item.question}</section>
            <section className="muted">{item.context}</section>
            <section>
              <strong>Recommendation</strong>
              <div className="muted">{item.recommendation}</div>
            </section>
            <footer className="toolbar">
              <button className="button" type="button"><Check size={15} />Approve</button>
              <button className="button secondary" type="button"><Edit3 size={15} />Edit response</button>
              <button className="button danger" type="button"><X size={15} />Reject</button>
            </footer>
          </article>
        ))}
      </div>
    </PageScaffold>
  );
}
