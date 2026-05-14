import { PageScaffold } from "../../components/PageScaffold";
import { settingRows } from "../../lib/ui-data";

export default function SettingsPage() {
  return (
    <PageScaffold title="Settings" subtitle="Owner controls for virtual team budget, notifications, safety, and invitations. Anthropic key is read-only in Stage 1.">
      <div className="content-grid">
        <section className="panel">
          <div className="panel-header"><span className="panel-title">Team owner</span></div>
          <table className="table">
            <tbody>
              {settingRows.map((row) => {
                const Icon = row.icon;
                return (
                  <tr key={row.label}>
                    <td><Icon size={15} /> {row.label}</td>
                    <td className="muted">{row.value}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <aside className="panel">
          <div className="panel-header"><span className="panel-title">Invite managers</span></div>
          <div className="panel-body stack">
            <p>Generate one-time invite codes for trusted managers or friends. Each invited user gets their own workspace and virtual team.</p>
            <button className="button" type="button">Generate invite</button>
          </div>
        </aside>
      </div>
    </PageScaffold>
  );
}
