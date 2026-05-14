import { NextRequest, NextResponse } from "next/server";
import { listSchedules, createSchedule } from "../../../../lib/v2-data";
import { computeNextRun } from "../../../../lib/cron";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agent_id") ?? undefined;
  const parentTaskId = req.nextUrl.searchParams.get("parent_task_id") ?? undefined;
  const rows = await listSchedules({ agentId, parentTaskId });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const cron_expr = typeof body.cron_expr === "string" ? body.cron_expr.trim() : "";
  const title_template = typeof body.title_template === "string" ? body.title_template.trim() : "";
  const prompt_template = typeof body.prompt_template === "string" ? body.prompt_template.trim() : "";
  const parent_task_id = typeof body.parent_task_id === "string" ? body.parent_task_id : null;
  const assigned_to_agent_id = typeof body.assigned_to_agent_id === "string" ? body.assigned_to_agent_id : null;

  if (!name || !cron_expr || !title_template || !prompt_template) {
    return NextResponse.json({ error: "name, cron_expr, title_template, prompt_template required" }, { status: 400 });
  }
  if (!parent_task_id && !assigned_to_agent_id) {
    return NextResponse.json({ error: "must set parent_task_id or assigned_to_agent_id" }, { status: 400 });
  }

  const next = computeNextRun(cron_expr, new Date());
  if (!next) {
    return NextResponse.json({ error: "Invalid or past cron_expr" }, { status: 400 });
  }

  const row = await createSchedule({
    name, parent_task_id, assigned_to_agent_id,
    cron_expr, title_template, prompt_template, next_run_at: next,
  });
  if (!row) return NextResponse.json({ error: "create failed" }, { status: 503 });
  return NextResponse.json(row, { status: 201 });
}
