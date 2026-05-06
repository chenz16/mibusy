import { GitBranch, Plus } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { templates } from "../../lib/ui-data";

export default function TemplatesPage() {
  return (
    <PageScaffold
      title="Templates"
      subtitle="Agent blueprints, revisions, tool boundaries, and invocation DAG visibility."
      action={<button className="button secondary" type="button"><Plus size={15} />Fork template</button>}
    >
      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title">Seed and private templates</span>
            <span className="badge">DAG only, no visual editor</span>
          </div>
          <table className="table">
            <thead><tr><th>Name</th><th>Scope</th><th>Tools</th><th>Budget</th></tr></thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.name}>
                  <td><strong>{template.name}</strong><div className="muted">revision {template.revision}</div></td>
                  <td>{template.scope}</td>
                  <td>{template.tools}</td>
                  <td>{template.budget}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="panel">
          <div className="panel-header"><span className="panel-title"><GitBranch size={15} /> Invocation graph</span></div>
          <div className="panel-body mono stack">
            <div>general_assistant {">"} research_agent</div>
            <div>research_agent {">"} writer_agent</div>
            <div>research_agent {">"} notifier_agent</div>
          </div>
        </aside>
      </div>
    </PageScaffold>
  );
}
