import { PageScaffold } from "../../components/PageScaffold";
import { StatusBadge } from "../../components/StatusBadge";
import { observeMetrics, tasks } from "../../lib/ui-data";

export default function ObservePage() {
  return (
    <PageScaffold title="Observe" subtitle="Cost, health, recent traces, and tenant-level attribution for Stage 1 usage.">
      <div className="split" style={{ paddingTop: 18 }}>
        {observeMetrics.map((metric) => (
          <section className="panel" key={metric.label}>
            <div className="metric">
              <div className="muted">{metric.label}</div>
              <div className="metric-value">{metric.value}</div>
              <div className="muted">{metric.note}</div>
            </div>
          </section>
        ))}
      </div>
      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-header"><span className="panel-title">Recent sessions</span><span className="badge">Last 50</span></div>
        <table className="table">
          <tbody>
            {tasks.map((task) => (
              <tr key={task.name}>
                <td>{task.name}</td>
                <td><StatusBadge state={task.status} /></td>
                <td>{task.cost}</td>
                <td className="muted">Langfuse trace</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageScaffold>
  );
}

