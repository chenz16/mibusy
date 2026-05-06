import { Check, Edit3, X } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { inboxItems } from "../../lib/ui-data";

export default function InboxPage() {
  return (
    <PageScaffold
      title="Inbox"
      subtitle="Human-in-the-loop queue for AskUserQuestion, approvals, and reviews."
      action={<span className="badge awaiting">{inboxItems.length} waiting</span>}
    >
      <div className="stack" style={{ paddingTop: 18 }}>
        {inboxItems.map((item) => (
          <article className="inbox-item" key={item.title}>
            <header>
              <strong>{item.title}</strong>
              <div className="muted">{item.age} ago · awaiting_input · worker released</div>
            </header>
            <section>{item.question}</section>
            <section className="muted">{item.context}</section>
            <footer className="toolbar">
              <button className="button" type="button"><Check size={15} />Approve</button>
              <button className="button secondary" type="button"><Edit3 size={15} />Edit answer</button>
              <button className="button danger" type="button"><X size={15} />Reject</button>
            </footer>
          </article>
        ))}
      </div>
    </PageScaffold>
  );
}

