import { getDeliverables, getRunningAssignments } from "../../lib/v2-data";
import { DeliveryCenter } from "../../components/DeliveryCenter";
import { SchedulesPanel } from "../../components/SchedulesPanel";
import { RunningTasksPanel } from "../../components/RunningTasksPanel";

export const dynamic = "force-dynamic";

export default async function ObservePage() {
  const [deliverables, running] = await Promise.all([
    getDeliverables(),
    getRunningAssignments(),
  ]);

  return (
    <section className="page">
      <h1 style={{
        fontFamily: "var(--serif)", fontSize: 32, fontWeight: 500,
        margin: "0 0 4px", color: "var(--ink)",
      }}>
        交付中心
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 13, margin: "4px 0 20px" }}>
        即将到来的定时任务，和已经产出的交付物。
      </p>

      {/* Active work — in-flight deliverables */}
      <RunningTasksPanel initialItems={running} />

      {/* Scheduled tasks — future deliverables */}
      <SchedulesPanel />

      {/* Past deliverables */}
      <DeliveryCenter initialItems={deliverables} />
    </section>
  );
}
