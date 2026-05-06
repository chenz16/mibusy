import { Plus } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { schedules } from "../../lib/ui-data";

export default function SchedulesPage() {
  return (
    <PageScaffold
      title="Schedules"
      subtitle="Cron-triggered agent sessions with failure tracking and automatic disable rules."
      action={<button className="button" type="button"><Plus size={15} />New schedule</button>}
    >
      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-header">
          <span className="panel-title">Scheduled runs</span>
          <span className="badge failed">1 disabled</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Cron</th>
              <th>Status</th>
              <th>Last run</th>
              <th>Next run</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule) => (
              <tr key={schedule.name}>
                <td><strong>{schedule.name}</strong><div className="muted">template + prompt variables</div></td>
                <td>{schedule.cron}</td>
                <td><span className={`badge ${schedule.status === "disabled" ? "failed" : "completed"}`}>{schedule.status}</span></td>
                <td>{schedule.last}</td>
                <td>{schedule.next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageScaffold>
  );
}

