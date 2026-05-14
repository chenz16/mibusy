import { notFound } from "next/navigation";

import { getAgentByWorkToken, getWorkerAssignments } from "../../../lib/v2-data";
import { WorkerInbox } from "../../../components/WorkerInbox";

export const dynamic = "force-dynamic";

export default async function MyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const agent = await getAgentByWorkToken(token);
  if (!agent) notFound();

  const assignments = await getWorkerAssignments(token);

  return <WorkerInbox token={token} agent={agent} initialAssignments={assignments} />;
}
