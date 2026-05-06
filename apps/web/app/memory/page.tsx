import { Search } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";

export default function MemoryPage() {
  return (
    <PageScaffold title="Memory" subtitle="Layer 1 session summaries with semantic retrieval. Layer 2/3 stay read-only placeholders.">
      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title"><Search size={15} /> Search summaries</span>
            <span className="badge">Top 10</span>
          </div>
          <table className="table">
            <thead>
              <tr><th>Template</th><th>Summary</th><th>Cost</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr><td>research_agent</td><td>Robotics education market scan</td><td>$0.31</td><td>completed</td></tr>
              <tr><td>writer_agent</td><td>Outreach email draft</td><td>$0.07</td><td>completed</td></tr>
            </tbody>
          </table>
        </section>
        <aside className="panel">
          <div className="panel-header"><span className="panel-title">Selected summary</span></div>
          <div className="panel-body stack">
            <p>Terminal session summary, token count, cost, child sessions, and Langfuse trace link appear here.</p>
            <span className="badge cancelled">Layer 2/3 coming later</span>
          </div>
        </aside>
      </div>
    </PageScaffold>
  );
}

