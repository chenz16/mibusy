import { TodayPage } from "../../components/TodayPage";
import { getDashboardMetrics, getDeliverables, getAwaitingAssignments, getRunningAssignments } from "../../lib/v2-data";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const [deliverables, awaiting, metrics, running] = await Promise.all([
    getDeliverables(),
    getAwaitingAssignments(),
    getDashboardMetrics(),
    getRunningAssignments(),
  ]);

  return (
    <section
      className="page chat-page"
      style={{ paddingTop: 12, paddingBottom: 0, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <TodayPage deliverables={deliverables} awaiting={awaiting} metrics={metrics} initialRunning={running} />
    </section>
  );
}
