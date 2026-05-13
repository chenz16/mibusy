import { Search } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { memoryRows } from "../../lib/ui-data";

export default function MemoryPage() {
  return (
    <PageScaffold
      title="Company Memory"
      subtitle="Searchable decisions, staff reports, company facts, and manager preferences that the virtual team should reuse."
    >
      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title"><Search size={15} /> Search operating memory</span>
            <span className="badge">Layer 1 + retrieval</span>
          </div>
          <table className="table">
            <thead>
              <tr><th>Type</th><th>Memory</th><th>Owner</th><th>Source</th></tr>
            </thead>
            <tbody>
              {memoryRows.map((row) => (
                <tr key={row.title}>
                  <td><span className="badge">{row.type}</span></td>
                  <td><strong>{row.title}</strong></td>
                  <td>{row.owner}</td>
                  <td className="muted">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="panel">
          <div className="panel-header"><span className="panel-title">Selected memory</span></div>
          <div className="panel-body stack">
            <p>Memory starts as session summaries and staff reports. Later layers add topic digests and manager preference facts.</p>
            <span className="badge cancelled">Layer 2/3 placeholders</span>
          </div>
        </aside>
      </div>
    </PageScaffold>
  );
}
