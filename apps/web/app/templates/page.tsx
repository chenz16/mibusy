import { GitBranch, Plus } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { getTemplateCatalog } from "../../lib/templates";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const catalog = await getTemplateCatalog();

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
            <span className={`badge ${catalog.source === "database" ? "completed" : "pending"}`}>
              {catalog.source === "database" ? "Live DB" : "Static fallback"}
            </span>
          </div>
          <table className="table">
            <thead><tr><th>Name</th><th>Scope</th><th>Tools</th><th>Budget</th><th>Max hours</th></tr></thead>
            <tbody>
              {catalog.templates.map((template) => (
                <tr key={template.id}>
                  <td><strong>{template.name}</strong><div className="muted">revision {template.revision}</div></td>
                  <td><span className="badge">{template.scope}</span></td>
                  <td>{template.tools.join(", ")}</td>
                  <td>{template.budget === null ? "No cap" : `$${template.budget.toFixed(2)}`}</td>
                  <td>{template.maxSessionHours === null ? "No cap" : `${template.maxSessionHours}h`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="panel">
          <div className="panel-header"><span className="panel-title"><GitBranch size={15} /> Invocation graph</span></div>
          <div className="panel-body mono stack">
            {catalog.edges.map((edge) => (
              <div key={`${edge.caller}-${edge.callee}`}>{edge.caller} {">"} {edge.callee}</div>
            ))}
          </div>
        </aside>
      </div>
    </PageScaffold>
  );
}
