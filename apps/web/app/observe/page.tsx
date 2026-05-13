import { PageScaffold } from "../../components/PageScaffold";
import { StatusBadge } from "../../components/StatusBadge";
import { operatingMetrics, workstreams } from "../../lib/ui-data";

export default function ObservePage() {
  return (
    <PageScaffold
      title="Operating Dashboard"
      subtitle="Team health, throughput, cost, waiting decisions, and recent work logs for the manager."
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
      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-header"><span className="panel-title">Recent work logs</span><span className="badge">Last 50</span></div>
        <table className="table">
          <tbody>
            {workstreams.map((workstream) => (
              <tr key={workstream.name}>
                <td><strong>{workstream.name}</strong><div className="muted">{workstream.owner}</div></td>
                <td><StatusBadge state={workstream.status} /></td>
                <td>{workstream.cost}</td>
                <td className="muted">{workstream.next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageScaffold>
  );
}
