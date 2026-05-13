import { Play, Plus, ShieldCheck } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { decisionItems, employees, operatingMetrics, workstreams } from "../../lib/ui-data";

export default function ChatPage() {
  const atlas = employees[0];

  return (
    <PageScaffold
      title="今日"
      subtitle="你的虚拟团队今天正在推进什么、哪里需要你判断、哪些任务可以继续自动跑。"
      action={<span className="badge awaiting">{decisionItems.length} 待审</span>}
    >
      <section className="hero-card">
        <div className="hero-kicker">Atlas · Chief of Staff</div>
        <h2 className="hero-title">今天有 3 个判断点，团队其余工作继续推进。</h2>
        <p className="muted" style={{ margin: 0 }}>{atlas.nowDoing}</p>
        <div className="toolbar">
          <button className="button" type="button"><Play size={15} />继续推进</button>
          <button className="button secondary" type="button"><Plus size={15} />分配新任务</button>
        </div>
      </section>

      <div className="split" style={{ marginTop: 12 }}>
        {operatingMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <section className="metric" key={metric.label}>
              <div className="muted"><Icon size={15} /> {metric.label}</div>
              <div className="metric-value">{metric.value}</div>
              <div className="muted">{metric.note}</div>
            </section>
          );
        })}
      </div>

      <section className="stack" style={{ marginTop: 14 }}>
        <div className="panel-header" style={{ border: 0, padding: "4px 2px" }}>
          <span className="panel-title">等待你拍板</span>
          <span className="badge awaiting">highest urgency</span>
        </div>
        <article className="task-card highlight">
          <div className="toolbar" style={{ justifyContent: "space-between" }}>
            <strong>{decisionItems[0].title}</strong>
            <span className="badge awaiting">{decisionItems[0].age}</span>
          </div>
          <div>{decisionItems[0].question}</div>
          <div className="muted">{decisionItems[0].recommendation}</div>
        </article>
      </section>

      <section className="stack" style={{ marginTop: 14 }}>
        <div className="panel-header" style={{ border: 0, padding: "4px 2px" }}>
          <span className="panel-title">运行中的任务</span>
          <ShieldCheck size={16} color="var(--gold)" />
        </div>
        {workstreams.map((task) => (
          <article className="task-card" key={task.name}>
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <strong>{task.name}</strong>
              <span className={`badge ${task.status}`}>{task.status}</span>
            </div>
            <div className="muted">{task.owner} · {task.deliverable}</div>
            <div>{task.next}</div>
            <div className="toolbar">
              <span className="badge">{task.subtasks} subtasks</span>
              <span className="badge">{task.cost}</span>
              <span className="badge">{task.kind}</span>
            </div>
          </article>
        ))}
      </section>
    </PageScaffold>
  );
}
