import { Plus } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { StatusBadge } from "../../components/StatusBadge";
import { tasks } from "../../lib/ui-data";

export default function TasksPage() {
  return (
    <PageScaffold
      title="Tasks"
      subtitle="Background sessions that can keep running after the browser closes."
      action={<button className="button" type="button"><Plus size={15} />New task</button>}
    >
      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title">Task queue</span>
            <div className="toolbar">
              <span className="badge">All</span>
              <span className="badge running">Running</span>
              <span className="badge awaiting">Awaiting input</span>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Cost</th>
                <th>Children</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.name}>
                  <td><strong>{task.name}</strong><div className="muted">{task.template}</div></td>
                  <td><StatusBadge state={task.status} /></td>
                  <td>{task.duration}</td>
                  <td>{task.cost}</td>
                  <td>{task.children}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="panel">
          <div className="panel-header">
            <span className="panel-title">Selected task</span>
            <StatusBadge state="awaiting" />
          </div>
          <div className="panel-body stack">
            <div><strong>Grant deadline monitor</strong><div className="muted">Waiting for your reply · worker released</div></div>
            <div className="mono">root $0.48 {">"} notifier_agent $0.03</div>
            <button className="button secondary" type="button">Reply in Inbox</button>
          </div>
        </aside>
      </div>
    </PageScaffold>
  );
}
