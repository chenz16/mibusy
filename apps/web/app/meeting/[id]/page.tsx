import { MeetingSession } from "../../../components/MeetingSession";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section
      className="page chat-page"
      style={{ paddingTop: 12, paddingBottom: 0, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <MeetingSession meetingId={id} />
    </section>
  );
}
