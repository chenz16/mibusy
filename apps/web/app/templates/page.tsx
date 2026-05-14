import { TeamClientView } from "../../components/TeamClientView";
import { getStaff } from "../../lib/v2-data";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const staff = await getStaff();
  return <TeamClientView staff={staff} />;
}
