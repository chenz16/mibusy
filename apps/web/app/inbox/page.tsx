import { Check, Edit3, Eye, X } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { decisionItems } from "../../lib/ui-data";

export default function InboxPage() {
  return (
    <PageScaffold
      title="待审"
      subtitle="员工把需要 CEO 判断的点集中到这里：看上下文、看建议、批准或改写。"
      action={<span className="badge awaiting">{decisionItems.length} pending</span>}
    >
      <div className="stack">
        {decisionItems.map((item, index) => (
          <article className={`inbox-item ${index === 0 ? "highlight" : ""}`} key={item.title}>
            <header className="toolbar" style={{ justifyContent: "space-between" }}>
              <div>
                <strong>{item.title}</strong>
                <div className="muted">{item.age} ago · urgency {item.urgency}</div>
              </div>
              <span className="badge awaiting">decision</span>
            </header>
            <section>{item.question}</section>
            <section className="muted">{item.context}</section>
            <section>
              <strong>推荐动作</strong>
              <div className="muted">{item.recommendation}</div>
            </section>
            <footer className="toolbar">
              <button className="button" type="button"><Check size={15} />批准</button>
              <button className="button secondary" type="button"><Eye size={15} />看草稿</button>
              <button className="button secondary" type="button"><Edit3 size={15} />改写</button>
              <button className="button danger" type="button"><X size={15} />拒绝</button>
            </footer>
          </article>
        ))}
      </div>
    </PageScaffold>
  );
}
