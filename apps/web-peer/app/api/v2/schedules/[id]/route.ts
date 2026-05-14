import { NextRequest, NextResponse } from "next/server";
import { setScheduleEnabled, updateSchedule, deleteSchedule } from "../../../../../lib/v2-data";
import { computeNextRun } from "../../../../../lib/cron";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const hasConfig =
    typeof body.name === "string"
    || typeof body.cron_expr === "string"
    || typeof body.title_template === "string"
    || typeof body.prompt_template === "string";

  if (!hasConfig && typeof body.enabled === "boolean") {
    const ok = await setScheduleEnabled(id, body.enabled);
    if (!ok) return NextResponse.json({ error: "update failed" }, { status: 404 });
    return NextResponse.json({ id, enabled: body.enabled });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const cron_expr = typeof body.cron_expr === "string" ? body.cron_expr.trim() : "";
  const title_template = typeof body.title_template === "string" ? body.title_template.trim() : "";
  const prompt_template = typeof body.prompt_template === "string" ? body.prompt_template.trim() : "";
  const enabled = typeof body.enabled === "boolean" ? body.enabled : true;

  if (!name || !cron_expr || !title_template || !prompt_template) {
    return NextResponse.json({ error: "name, cron_expr, title_template, prompt_template required" }, { status: 400 });
  }

  const next = computeNextRun(cron_expr, new Date());
  if (!next) {
    return NextResponse.json({ error: "Invalid or past cron_expr" }, { status: 400 });
  }

  const row = await updateSchedule({ id, name, cron_expr, title_template, prompt_template, enabled, next_run_at: next });
  if (!row) return NextResponse.json({ error: "update failed" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteSchedule(id);
  if (!ok) return NextResponse.json({ error: "delete failed" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
