import { Plus } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { rhythms } from "../../lib/ui-data";

export default function SchedulesPage() {
  return (
    <PageScaffold
      title="Operating Rhythms"
      subtitle="Recurring virtual team routines for briefings, scans, follow-ups, and exception reporting."
      action={<button className="button" type="button"><Plus size={15} />New rhythm</button>}
    >
      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-header">
          <span className="panel-title">Recurring routines</span>
          <span className="badge failed">1 paused</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Rhythm</th>
              <th>Owner</th>
              <th>Cadence</th>
              <th>Status</th>
              <th>Last</th>
              <th>Next</th>
            </tr>
          </thead>
          <tbody>
            {rhythms.map((rhythm) => (
              <tr key={rhythm.name}>
                <td><strong>{rhythm.name}</strong><div className="muted">briefing instructions + escalation rules</div></td>
                <td>{rhythm.owner}</td>
                <td>{rhythm.cadence}</td>
                <td><span className={`badge ${rhythm.status === "disabled" ? "failed" : "completed"}`}>{rhythm.status}</span></td>
                <td>{rhythm.last}</td>
                <td>{rhythm.next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageScaffold>
  );
}
