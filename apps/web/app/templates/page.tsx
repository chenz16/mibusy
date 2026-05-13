import { Bot, Cog, Plus, ShieldCheck, UsersRound } from "lucide-react";

import { PageScaffold } from "../../components/PageScaffold";
import { beaconChecks, employees, skills, tempAgents } from "../../lib/ui-data";

export const dynamic = "force-dynamic";

export default function TemplatesPage() {
  return (
    <PageScaffold
      title="团队"
      subtitle="长期员工、Beacon 质检、可复用技能池和临时员工都在这里管理。"
      action={<button className="button secondary" type="button"><Plus size={15} />招聘</button>}
    >
      <section className="stack">
        <div className="panel-header" style={{ border: 0, padding: "4px 2px" }}>
          <span className="panel-title"><UsersRound size={16} /> 员工</span>
          <span className="badge completed">{employees.length} permanent</span>
        </div>
        {employees.map((agent) => (
          <article className="agent-row" key={agent.name}>
            <div className="agent-head">
              <div className="avatar" style={{ background: agent.tone }}>{agent.name.slice(0, 1)}</div>
              <div>
                <strong>{agent.name}</strong>
                <div className="muted">{agent.title} · {agent.seniority} · tenure {agent.tenure}</div>
              </div>
              <span className="badge">{agent.monthly}</span>
            </div>
            <div>{agent.nowDoing}</div>
            <div className="trust-bar" aria-label={`${agent.trust} trust`}>
              <div className="trust-fill" style={{ width: `${agent.trust}%` }} />
            </div>
            <div className="muted">{agent.kpi}</div>
          </article>
        ))}
      </section>

      <section className="stack" style={{ marginTop: 18 }}>
        <div className="panel-header" style={{ border: 0, padding: "4px 2px" }}>
          <span className="panel-title"><Bot size={16} /> Beacon</span>
          <span className="badge running">QA agent</span>
        </div>
        <article className="panel">
          <div className="panel-body stack">
            <div>
              <strong>系统质检员，不计入团队 headcount</strong>
              <div className="muted">新技能先跑 5 个测试 case，通过后才提升信任等级。</div>
            </div>
            {beaconChecks.map((check) => (
              <div className="toolbar" style={{ justifyContent: "space-between" }} key={check.name}>
                <span>{check.name}</span>
                <span className={`badge ${check.status}`}>{check.result}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="stack" style={{ marginTop: 18 }}>
        <div className="panel-header" style={{ border: 0, padding: "4px 2px" }}>
          <span className="panel-title"><ShieldCheck size={16} /> 技能池</span>
          <span className="badge">{skills.length} skills</span>
        </div>
        {skills.map((skill) => (
          <article className="skill-card" key={skill.name}>
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <strong>{skill.name}</strong>
              <span className="badge">{skill.visibility}</span>
            </div>
            <div className="muted">Owner {skill.owner} · used by {skill.usedBy}</div>
            <div className="toolbar">
              <span className="badge completed">trust {skill.trust}</span>
              <span className="badge">{skill.runs} runs</span>
              <span className={`badge ${skill.probation === "Passed" ? "completed" : "awaiting"}`}>{skill.probation}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="stack" style={{ marginTop: 18 }}>
        <div className="panel-header" style={{ border: 0, padding: "4px 2px" }}>
          <span className="panel-title"><Cog size={16} /> 临时</span>
          <span className="badge">{tempAgents.length} active</span>
        </div>
        {tempAgents.map((agent) => (
          <article className="temp-card" key={agent.id}>
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <strong>{agent.id}</strong>
              <span className="badge running">{agent.expires} left</span>
            </div>
            <div>{agent.task}</div>
            <div className="muted">Spawned by {agent.parent} · cost {agent.cost}</div>
          </article>
        ))}
      </section>
    </PageScaffold>
  );
}
