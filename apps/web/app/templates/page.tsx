import { GitBranch, Plus } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { getTemplateCatalog } from "../../lib/templates";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const catalog = await getTemplateCatalog();
  const roleByTemplate = new Map(catalog.templates.map((template) => [template.name, template.role]));

  return (
    <PageScaffold
      title="Virtual Team"
      subtitle="Roles, responsibilities, budgets, tools, and delegation rules for the manager's AI team."
      action={<button className="button secondary" type="button"><Plus size={15} />Fork role</button>}
    >
      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title">Team roles</span>
            <span className={`badge ${catalog.source === "database" ? "completed" : "pending"}`}>
              {catalog.source === "database" ? "Live DB" : "Static fallback"}
            </span>
          </div>
          <table className="table">
            <thead><tr><th>Role</th><th>Responsibility</th><th>Tools</th><th>Budget</th></tr></thead>
            <tbody>
              {catalog.templates.map((template) => (
                <tr key={template.id}>
                  <td>
                    <strong>{template.role}</strong>
                    <div className="muted">{template.name} · rev {template.revision} · {template.scope}</div>
                  </td>
                  <td>
                    {template.responsibility}
                    <div className="muted">{template.deliverable}</div>
                  </td>
                  <td>{template.tools.join(", ")}</td>
                  <td>{template.budget === null ? "No cap" : `$${template.budget.toFixed(2)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="panel">
          <div className="panel-header"><span className="panel-title"><GitBranch size={15} /> Delegation rules</span></div>
          <div className="panel-body mono stack">
            {catalog.edges.map((edge) => (
              <div key={`${edge.caller}-${edge.callee}`}>
                {roleByTemplate.get(edge.caller) ?? edge.caller} {">"} {roleByTemplate.get(edge.callee) ?? edge.callee}
                <div className="muted">{edge.caller} {">"} {edge.callee}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </PageScaffold>
  );
}
