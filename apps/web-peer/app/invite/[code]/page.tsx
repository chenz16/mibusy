import { PageScaffold } from "../../../components/PageScaffold";

import { InviteBootstrapPanel } from "./InviteBootstrapPanel";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <PageScaffold title="Invite" subtitle="Create a workspace from a one-time invitation.">
      <div className="content-grid single-column">
        <InviteBootstrapPanel code={code} />
      </div>
    </PageScaffold>
  );
}
