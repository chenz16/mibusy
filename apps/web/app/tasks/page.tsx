import { Plus } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { StatusBadge } from "../../components/StatusBadge";
import { workstreams } from "../../lib/ui-data";

export default function TasksPage() {
  return (
    <PageScaffold
      title="Workstreams"
      subtitle="Business objectives delegated to virtual team roles, tracked by owner, next step, deliverable, cost, and decision state."
      action={<button className="button" type="button"><Plus size={15} />New workstream</button>}
    >
      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title">Active initiatives</span>
            <div className="toolbar">
              <span className="badge">All</span>
              <span className="badge running">In progress</span>
              <span className="badge awaiting">Needs decision</span>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Objective</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Cost</th>
                <th>Subtasks</th>
              </tr>
            </thead>
            <tbody>
              {workstreams.map((workstream) => (
                <tr key={workstream.name}>
                  <td>
                    <strong>{workstream.name}</strong>
                    <div className="muted">{workstream.deliverable}</div>
                  </td>
                  <td>{workstream.owner}</td>
                  <td><StatusBadge state={workstream.status} /></td>
                  <td>{workstream.cost}</td>
                  <td>{workstream.subtasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="panel">
          <div className="panel-header">
            <span className="panel-title">Selected workstream</span>
            <StatusBadge state="awaiting" />
          </div>
          <div className="panel-body stack">
            <div>
              <strong>Grant deadline monitor</strong>
              <div className="muted">Scheduler is waiting for approval before paid-source retrieval.</div>
            </div>
            <div className="table compact">
              <div className="row"><span>Owner role</span><strong>Scheduler</strong></div>
              <div className="row"><span>Next step</span><strong>Approve source strategy</strong></div>
              <div className="row"><span>Deliverable</span><strong>weekly deadline briefing</strong></div>
            </div>
            <button className="button secondary" type="button">Open decision</button>
          </div>
        </aside>
      </div>
    </PageScaffold>
  );
}
