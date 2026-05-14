import { Client } from "pg";

import { employees, workstreams } from "./ui-data";

export type StaffRow = {
  id: string;
  name: string;
  role: string;
  kind: string;
  status: string;
  is_system?: boolean;
};

export type AssignmentRow = {
  id: string;
  title: string;
  assigned_to_name: string | null;
  status: string;
  created_at: string;
  budget_limit: number | null;
  deliverable_title: string | null;
};

export type DeliverableRow = {
  id: string;
  assignment_id: string;
  title: string;
  body: string;
  format: string;
  agent_name: string | null;
  created_at: string;
};

const databaseUrl = process.env.DATABASE_URL;

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  if (!databaseUrl) throw new Error("DATABASE_URL not configured");
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function getStaff(): Promise<StaffRow[]> {
  try {
    const rows = await withDb(async (client) => {
      const result = await client.query<StaffRow>(
        `SELECT id::text, name, role, kind, status, is_system
         FROM virtual_agents
         WHERE status = 'active' AND desk_id = $1::uuid
         ORDER BY is_system ASC, created_at ASC`,
        [CEO_DESK_ID],
      );
      return result.rows;
    });
    if (rows.length > 0) return rows;
  } catch {
    // DB unavailable — fall through to mock
  }
  return employees.map((e) => ({
    id: e.name.toLowerCase(),
    name: e.name,
    role: e.title,
    kind: e.title.includes("Chief") ? "chief_of_staff" : "specialist",
    status: "active",
    is_system: false,
  }));
}

export async function getDeliverables(): Promise<DeliverableRow[]> {
  try {
    const rows = await withDb(async (client) => {
      const result = await client.query<DeliverableRow>(
        `SELECT d.id::text, d.assignment_id::text, d.title, d.body, d.format,
                d.created_at::text AS created_at,
                va.name AS agent_name
         FROM deliverables d
         LEFT JOIN virtual_agents va ON d.created_by_agent_id = va.id
         LEFT JOIN assignments a ON d.assignment_id = a.id
         WHERE COALESCE(a.origin, 'ceo') <> 'private_chat'
         ORDER BY d.created_at DESC
         LIMIT 20`,
      );
      return result.rows;
    });
    return rows;
  } catch {
    return [];
  }
}

export type DashboardMetrics = {
  activeStaff: number;
  needsDecision: number;
  deliveredToday: number;
};

export type AssignmentEventRow = {
  id: string;
  seq: number;
  kind: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type AwaitingAssignment = {
  id: string;
  title: string;
  prompt: string;
  status: string;
  agent_name: string | null;
  created_at: string;
};

export type AgentDetail = {
  id: string;
  name: string;
  role: string;
  kind: string;
  status: string;
  system_prompt: string | null;
  proxy_agent_id: string | null;
  monthly_budget: number | null;
  monthSpent: number;
  agent_mode: "ai" | "facade";
  peer_url: string | null;
  peer_token: string | null;
  peer_connection_id: string | null;
  totalAssignments: number;
  completedAssignments: number;
  recentDeliverables: DeliverableRow[];
  recentAssignments: AssignmentRow[];
};

export type AssignmentWithDeliverable = {
  id: string;
  title: string;
  status: string;
  deliverable_body: string | null;
  deliverable_title: string | null;
};

export async function getAgentDetail(agentId: string): Promise<AgentDetail | null> {
  try {
    return await withDb(async (client) => {
      const agentRes = await client.query<{ id: string; name: string; role: string; kind: string; status: string; system_prompt: string | null; proxy_agent_id: string | null; monthly_budget: string | null; agent_mode: "ai" | "facade" }>(
        `SELECT id::text, name, role, kind, status, system_prompt, proxy_agent_id::text, monthly_budget::text, agent_mode FROM virtual_agents WHERE id = $1::uuid`,
        [agentId],
      );
      const agent = agentRes.rows[0];
      if (!agent) return null;

      // Peer connection (if facade mode)
      const peerRes = await client.query<{ id: string; peer_url: string | null; peer_token: string | null }>(
        `SELECT id::text, peer_url, peer_token::text FROM agent_connections
         WHERE agent_id = $1::uuid AND transport = 'peer'
         ORDER BY created_at DESC LIMIT 1`,
        [agentId],
      );
      const peer = peerRes.rows[0];

      const statsRes = await client.query<{ total: string; completed: string }>(
        `SELECT
           COUNT(*)::text AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::text AS completed
         FROM assignments WHERE assigned_to_agent_id = $1::uuid`,
        [agentId],
      );

      const spentRes = await client.query<{ spent: string }>(
        `SELECT COALESCE(SUM(budget_limit), 0)::text AS spent
         FROM assignments
         WHERE assigned_to_agent_id = $1::uuid
           AND status = 'completed'
           AND updated_at >= date_trunc('month', NOW())`,
        [agentId],
      );

      const delivRes = await client.query<DeliverableRow>(
        `SELECT d.id::text, d.assignment_id::text, d.title, d.body, d.format,
                d.created_at::text AS created_at,
                va.name AS agent_name
         FROM deliverables d
         LEFT JOIN virtual_agents va ON d.created_by_agent_id = va.id
         WHERE d.created_by_agent_id = $1::uuid
         ORDER BY d.created_at DESC LIMIT 5`,
        [agentId],
      );

      const assignRes = await client.query<AssignmentRow>(
        `SELECT a.id::text, a.title, a.status, a.created_at::text AS created_at,
                va.name AS assigned_to_name
         FROM assignments a
         LEFT JOIN virtual_agents va ON a.assigned_to_agent_id = va.id
         WHERE a.assigned_to_agent_id = $1::uuid
         ORDER BY a.created_at DESC LIMIT 5`,
        [agentId],
      );

      return {
        ...agent,
        agent_mode: agent.agent_mode,
        peer_url: peer?.peer_url ?? null,
        peer_token: peer?.peer_token ?? null,
        peer_connection_id: peer?.id ?? null,
        monthly_budget: agent.monthly_budget != null ? parseFloat(agent.monthly_budget) : null,
        monthSpent: parseFloat(spentRes.rows[0]?.spent ?? "0"),
        totalAssignments: parseInt(statsRes.rows[0]?.total ?? "0", 10),
        completedAssignments: parseInt(statsRes.rows[0]?.completed ?? "0", 10),
        recentDeliverables: delivRes.rows,
        recentAssignments: assignRes.rows,
      } as AgentDetail;
    });
  } catch {
    return null;
  }
}

export async function hireAgent(input: {
  name: string;
  role: string;
  system_prompt?: string;
  monthly_budget?: number;
}): Promise<{ id: string; name: string; role: string } | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<{ id: string; name: string; role: string }>(
        `INSERT INTO virtual_agents (desk_id, name, role, kind, status, is_system, system_prompt, monthly_budget)
         VALUES ($1::uuid, $2, $3, 'specialist', 'active', false, $4, $5)
         RETURNING id::text, name, role`,
        [
          CEO_DESK_ID,
          input.name,
          input.role,
          input.system_prompt ?? null,
          input.monthly_budget ?? 50.00,
        ],
      );
      return r.rows[0] ?? null;
    });
  } catch { return null; }
}

export type ArchivedAgent = {
  id: string;
  name: string;
  role: string;
  kind: string;
  monthly_budget: number | null;
  total_assignments: number;
  total_deliverables: number;
  hired_at: string;
  archived_at: string | null;
};

export async function listArchivedAgents(): Promise<ArchivedAgent[]> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<{
        id: string; name: string; role: string; kind: string;
        monthly_budget: string | null;
        total_assignments: string; total_deliverables: string;
        created_at: string; updated_at: string;
      }>(
        `SELECT va.id::text, va.name, va.role, va.kind,
                va.monthly_budget::text,
                (SELECT COUNT(*) FROM assignments WHERE assigned_to_agent_id = va.id)::text
                  AS total_assignments,
                (SELECT COUNT(*) FROM deliverables WHERE created_by_agent_id = va.id)::text
                  AS total_deliverables,
                va.created_at::text, va.updated_at::text
         FROM virtual_agents va
         WHERE va.status = 'archived' AND va.is_system = false
         ORDER BY va.updated_at DESC NULLS LAST`,
      );
      return r.rows.map(row => ({
        id: row.id, name: row.name, role: row.role, kind: row.kind,
        monthly_budget: row.monthly_budget != null ? parseFloat(row.monthly_budget) : null,
        total_assignments: parseInt(row.total_assignments, 10),
        total_deliverables: parseInt(row.total_deliverables, 10),
        hired_at: row.created_at,
        archived_at: row.updated_at,
      }));
    });
  } catch { return []; }
}

export async function restoreAgent(id: string): Promise<boolean> {
  try {
    return await withDb(async (client) => {
      const r = await client.query(
        `UPDATE virtual_agents
         SET status = 'active', updated_at = NOW()
         WHERE id = $1::uuid AND status = 'archived' AND is_system = false`,
        [id],
      );
      return (r.rowCount ?? 0) > 0;
    });
  } catch { return false; }
}

export async function purgeArchivedAgent(id: string): Promise<boolean> {
  // Permanently delete an archived agent. Their assignments stay (deliverables
  // remain in 交付中心) but the agent row + connections are gone.
  try {
    return await withDb(async (client) => {
      const r = await client.query(
        `DELETE FROM virtual_agents
         WHERE id = $1::uuid AND status = 'archived' AND is_system = false`,
        [id],
      );
      return (r.rowCount ?? 0) > 0;
    });
  } catch { return false; }
}

export async function dismissAgent(id: string): Promise<{ ok: boolean; cancelled: number; reason?: string }> {
  try {
    return await withDb(async (client) => {
      // Guard: can't fire a system agent (e.g., chief of staff seeded by app)
      const ag = await client.query<{ is_system: boolean; status: string }>(
        `SELECT is_system, status FROM virtual_agents WHERE id = $1::uuid`,
        [id],
      );
      const row = ag.rows[0];
      if (!row) return { ok: false, cancelled: 0, reason: "not_found" };
      if (row.is_system) return { ok: false, cancelled: 0, reason: "system_agent" };
      if (row.status === "archived") return { ok: true, cancelled: 0 };

      await client.query("BEGIN");
      try {
        // Cancel any queued / running assignments still owned by this agent
        const cancel = await client.query(
          `UPDATE assignments
           SET status = 'cancelled', updated_at = NOW()
           WHERE assigned_to_agent_id = $1::uuid
             AND status IN ('queued','running','awaiting_input')`,
          [id],
        );

        // Revoke connections (delete polls + clear tokens — other side can no longer connect)
        await client.query(
          `DELETE FROM agent_connections WHERE agent_id = $1::uuid`,
          [id],
        );

        // Soft delete the agent
        await client.query(
          `UPDATE virtual_agents
           SET status = 'archived', work_token = NULL, last_seen_at = NULL
           WHERE id = $1::uuid`,
          [id],
        );

        // Detach as proxy from anyone pointing at this agent
        await client.query(
          `UPDATE virtual_agents SET proxy_agent_id = NULL
           WHERE proxy_agent_id = $1::uuid`,
          [id],
        );

        await client.query("COMMIT");
        return { ok: true, cancelled: cancel.rowCount ?? 0 };
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    });
  } catch { return { ok: false, cancelled: 0, reason: "db_error" }; }
}

export async function updateAgent(
  id: string,
  fields: { system_prompt?: string; role?: string; proxy_agent_id?: string | null; monthly_budget?: number | null; agent_mode?: "ai" | "facade" },
): Promise<boolean> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (fields.system_prompt !== undefined) { updates.push(`system_prompt = $${idx++}`); values.push(fields.system_prompt); }
  if (fields.role !== undefined) { updates.push(`role = $${idx++}`); values.push(fields.role); }
  if (fields.proxy_agent_id !== undefined) { updates.push(`proxy_agent_id = $${idx++}`); values.push(fields.proxy_agent_id || null); }
  if (fields.monthly_budget !== undefined) { updates.push(`monthly_budget = $${idx++}`); values.push(fields.monthly_budget); }
  if (fields.agent_mode !== undefined) { updates.push(`agent_mode = $${idx++}`); values.push(fields.agent_mode); }
  if (updates.length === 0) return true;
  values.push(id);
  try {
    await withDb(async (client) => {
      await client.query(
        `UPDATE virtual_agents SET ${updates.join(", ")} WHERE id = $${idx}::uuid`,
        values,
      );
    });
    return true;
  } catch { return false; }
}

export async function getAssignmentWithDeliverable(id: string): Promise<AssignmentWithDeliverable | null> {
  try {
    return await withDb(async (client) => {
      const result = await client.query<AssignmentWithDeliverable>(
        `SELECT a.id::text, a.title, a.status,
                d.body AS deliverable_body, d.title AS deliverable_title
         FROM assignments a
         LEFT JOIN deliverables d ON d.assignment_id = a.id
         WHERE a.id = $1::uuid`,
        [id],
      );
      return result.rows[0] ?? null;
    });
  } catch { return null; }
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const zero = { activeStaff: 0, needsDecision: 0, deliveredToday: 0 };
  try {
    return await withDb(async (client) => {
      const staffRes = await client.query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM virtual_agents WHERE status = 'active' AND is_system = false`,
      );
      const decisionRes = await client.query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM assignments WHERE status = 'awaiting'`,
      );
      const deliveredRes = await client.query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM deliverables
         WHERE created_at >= CURRENT_DATE`,
      );
      return {
        activeStaff: parseInt(staffRes.rows[0]?.cnt ?? "0", 10),
        needsDecision: parseInt(decisionRes.rows[0]?.cnt ?? "0", 10),
        deliveredToday: parseInt(deliveredRes.rows[0]?.cnt ?? "0", 10),
      };
    });
  } catch {
    return zero;
  }
}

export async function getAwaitingAssignments(): Promise<AwaitingAssignment[]> {
  try {
    return await withDb(async (client) => {
      const result = await client.query<AwaitingAssignment>(
        `SELECT a.id::text, a.title, a.prompt, a.status,
                a.created_at::text AS created_at,
                va.name AS agent_name
         FROM assignments a
         LEFT JOIN virtual_agents va ON a.assigned_to_agent_id = va.id
         WHERE a.status = 'awaiting'
         ORDER BY a.created_at DESC
         LIMIT 20`,
      );
      return result.rows;
    });
  } catch {
    return [];
  }
}

export async function getAssignmentEvents(assignmentId: string): Promise<AssignmentEventRow[]> {
  try {
    return await withDb(async (client) => {
      const result = await client.query<AssignmentEventRow>(
        `SELECT id::text, seq, kind, payload, created_at::text AS created_at
         FROM assignment_events
         WHERE assignment_id = $1::uuid
         ORDER BY seq ASC`,
        [assignmentId],
      );
      return result.rows;
    });
  } catch {
    return [];
  }
}

export async function updateAssignmentStatus(
  id: string,
  status: "completed" | "cancelled",
): Promise<boolean> {
  try {
    await withDb(async (client) => {
      await client.query(
        `UPDATE assignments SET status = $1, updated_at = NOW() WHERE id = $2::uuid`,
        [status, id],
      );
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteAssignment(id: string): Promise<boolean> {
  try {
    await withDb(async (client) => {
      await client.query(`DELETE FROM assignment_events WHERE assignment_id = $1::uuid`, [id]);
      await client.query(`DELETE FROM deliverables WHERE assignment_id = $1::uuid`, [id]);
      await client.query(`DELETE FROM assignments WHERE id = $1::uuid`, [id]);
    });
    return true;
  } catch {
    return false;
  }
}

// In V3, each Mibusy instance has its own CEO desk. The desk_id is read from
// MIBUSY_DESK_ID env var so two instances on the same DB can coexist by
// pointing at different desks. Default preserves v2 single-instance behavior.
const CEO_DESK_ID = process.env.MIBUSY_DESK_ID || "00000000-0000-0000-0000-000000000001";
const ATLAS_ID = "00000000-0000-0000-0001-000000000001";

export async function createAssignment({
  title,
  prompt,
  assignedToAgentId,
  origin = "ceo",
}: {
  title: string;
  prompt: string;
  assignedToAgentId: string;
  origin?: "ceo" | "private_chat" | "worker" | "system";
}): Promise<{ id: string } | null> {
  try {
    return await withDb(async (client) => {
      // Check if this agent is a facade — if so, route to peer instance.
      const agentRow = await client.query<{ agent_mode: "ai" | "facade" }>(
        `SELECT agent_mode FROM virtual_agents WHERE id = $1::uuid`,
        [assignedToAgentId],
      );
      const isFacade = agentRow.rows[0]?.agent_mode === "facade";

      // For facade agents, mark status='running' immediately (waiting for peer
      // callback) and record peer_connection_id so we can match the response.
      let peerConnectionId: string | null = null;
      if (isFacade) {
        const pcRes = await client.query<{ id: string }>(
          `SELECT id::text FROM agent_connections
           WHERE agent_id = $1::uuid AND transport = 'peer'
           ORDER BY created_at DESC LIMIT 1`,
          [assignedToAgentId],
        );
        peerConnectionId = pcRes.rows[0]?.id ?? null;
      }

      const status = isFacade ? "running" : "queued";

      const result = await client.query<{ id: string }>(
        `INSERT INTO assignments
           (desk_id, title, prompt, assigned_to_agent_id, status, origin, peer_connection_id)
         VALUES ($1, $2, $3, $4::uuid, $5, $6, $7::uuid)
         RETURNING id::text`,
        [CEO_DESK_ID, title, prompt, assignedToAgentId, status, origin, peerConnectionId],
      );
      const assignmentId = result.rows[0]?.id ?? null;

      // Dispatch to peer asynchronously — don't block the caller.
      if (isFacade && assignmentId && peerConnectionId) {
        void dispatchToPeer({
          assignment_id: assignmentId,
          peer_connection_id: peerConnectionId,
          title, prompt,
        });
      }

      return assignmentId ? { id: assignmentId } : null;
    });
  } catch {
    return null;
  }
}

// Fire-and-forget POST to peer's /api/v2/missions to forward a facade-routed
// task. Stores the peer's mission id back as peer_origin_id so the callback
// can match it.
async function dispatchToPeer(input: {
  assignment_id: string;
  peer_connection_id: string;
  title: string;
  prompt: string;
}): Promise<void> {
  try {
    const c = await withDb(async (client) => {
      const r = await client.query<{ peer_url: string | null; peer_token: string | null }>(
        `SELECT peer_url, peer_token::text FROM agent_connections WHERE id = $1::uuid`,
        [input.peer_connection_id],
      );
      return r.rows[0] ?? null;
    });
    if (!c?.peer_url || !c?.peer_token) return;

    const callbackBase = process.env.MIBUSY_PUBLIC_URL || "http://localhost:3000";
    const res = await fetch(`${c.peer_url.replace(/\/$/, "")}/api/v2/missions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: input.title,
        agenda: input.prompt,
        initiator_kind: "peer",
        peer_token: c.peer_token,
        peer_origin_id: input.assignment_id,
        peer_callback_url: callbackBase,
      }),
    });
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    const remoteMissionId = data?.id ?? null;
    if (remoteMissionId) {
      await withDb(async (client) => {
        await client.query(
          `UPDATE assignments SET peer_origin_id = $1::uuid WHERE id = $2::uuid`,
          [remoteMissionId, input.assignment_id],
        );
      });
    }
  } catch {
    // network failures: leave status='running' — will need retry later (M2)
  }
}

export async function getActiveAssignments(): Promise<AssignmentRow[]> {
  try {
    const rows = await withDb(async (client) => {
      const result = await client.query<AssignmentRow>(
        `SELECT a.id::text, a.title, a.status, a.created_at::text AS created_at,
                a.budget_limit,
                va.name AS assigned_to_name,
                d.title AS deliverable_title
         FROM assignments a
         LEFT JOIN virtual_agents va ON a.assigned_to_agent_id = va.id
         LEFT JOIN deliverables d ON d.assignment_id = a.id
         ORDER BY a.created_at DESC
         LIMIT 40`,
      );
      return result.rows;
    });
    return rows;
  } catch {
    return workstreams.map((w) => ({
      id: w.name.replace(/\s+/g, "-").toLowerCase(),
      title: w.name,
      assigned_to_name: w.owner,
      status: w.status,
      created_at: new Date().toISOString(),
      budget_limit: null,
      deliverable_title: null,
    }));
  }
}

export type RunningAssignment = {
  id: string;
  title: string;
  agent_name: string | null;
  status: string;
  created_at: string;
};

export type CompletedHandoff = {
  id: string;
  title: string;
  agent_name: string | null;
  deliverable_summary: string;
  completed_at: string;
};

export async function getRunningAssignments(): Promise<RunningAssignment[]> {
  try {
    return await withDb(async (client) => {
      const result = await client.query<RunningAssignment>(
        `SELECT a.id::text, a.title, a.status, a.created_at::text AS created_at,
                va.name AS agent_name
         FROM assignments a
         LEFT JOIN virtual_agents va ON a.assigned_to_agent_id = va.id
         WHERE a.status IN ('queued','running')
           AND a.origin <> 'private_chat'
         ORDER BY a.created_at ASC
         LIMIT 10`,
      );
      return result.rows;
    });
  } catch { return []; }
}

export async function getRecentHandoffs(sinceIso?: string): Promise<CompletedHandoff[]> {
  try {
    return await withDb(async (client) => {
      const cutoff = sinceIso ?? new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const result = await client.query<CompletedHandoff>(
        `SELECT a.id::text, a.title, va.name AS agent_name,
                LEFT(d.body, 300) AS deliverable_summary,
                d.created_at::text AS completed_at
         FROM assignments a
         LEFT JOIN virtual_agents va ON a.assigned_to_agent_id = va.id
         JOIN deliverables d ON d.assignment_id = a.id
         WHERE a.status = 'completed'
           AND d.created_at > $1
           AND a.origin <> 'private_chat'
         ORDER BY d.created_at DESC
         LIMIT 5`,
        [cutoff],
      );
      return result.rows;
    });
  } catch { return []; }
}

// ── Worker Protocol ───────────────────────────────────────────────────────────
// Universal API for any worker node: human, local computer, remote instance

export type WorkerAgent = { id: string; name: string; role: string };
export type WorkerAssignment = { id: string; title: string; prompt: string; status: string; created_at: string };
export type AgentTokenInfo = { work_token: string | null; last_seen_at: string | null };

export async function getAgentByWorkToken(token: string): Promise<WorkerAgent | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<WorkerAgent>(
        `SELECT id::text, name, role FROM virtual_agents WHERE work_token = $1`,
        [token],
      );
      return r.rows[0] ?? null;
    });
  } catch { return null; }
}

export async function updateWorkerHeartbeat(token: string): Promise<boolean> {
  try {
    await withDb(async (client) => {
      await client.query(
        `UPDATE virtual_agents SET last_seen_at = NOW() WHERE work_token = $1`,
        [token],
      );
    });
    return true;
  } catch { return false; }
}

export async function getWorkerAssignments(token: string): Promise<WorkerAssignment[]> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<WorkerAssignment>(
        `SELECT a.id::text, a.title, a.prompt, a.status, a.created_at::text AS created_at
         FROM assignments a
         JOIN virtual_agents va ON a.assigned_to_agent_id = va.id
         WHERE va.work_token = $1
           AND a.status IN ('queued', 'running')
         ORDER BY a.created_at ASC`,
        [token],
      );
      return r.rows;
    });
  } catch { return []; }
}

export async function startWorkerAssignment(token: string, assignmentId: string): Promise<boolean> {
  try {
    await withDb(async (client) => {
      await client.query(
        `UPDATE assignments SET status = 'running', updated_at = NOW()
         WHERE id = $1::uuid
           AND assigned_to_agent_id = (SELECT id FROM virtual_agents WHERE work_token = $2)`,
        [assignmentId, token],
      );
    });
    return true;
  } catch { return false; }
}

export async function completeWorkerAssignment(
  token: string,
  data: { assignment_id: string; title: string; body: string },
): Promise<boolean> {
  try {
    await withDb(async (client) => {
      const agentR = await client.query<{ id: string }>(
        `SELECT id FROM virtual_agents WHERE work_token = $1`,
        [token],
      );
      const agentId = agentR.rows[0]?.id;
      if (!agentId) return;
      await client.query(
        `INSERT INTO deliverables (assignment_id, title, body, format, created_by_agent_id)
         VALUES ($1::uuid, $2, $3, 'markdown', $4::uuid)`,
        [data.assignment_id, data.title, data.body, agentId],
      );
      await client.query(
        `UPDATE assignments SET status = 'completed', updated_at = NOW() WHERE id = $1::uuid`,
        [data.assignment_id],
      );
    });
    return true;
  } catch { return false; }
}

export async function generateWorkToken(agentId: string): Promise<string | null> {
  try {
    const token = crypto.randomUUID();
    await withDb(async (client) => {
      await client.query(
        `UPDATE virtual_agents SET work_token = $1 WHERE id = $2::uuid`,
        [token, agentId],
      );
    });
    return token;
  } catch { return null; }
}

export async function getAgentTokenInfo(agentId: string): Promise<AgentTokenInfo | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<AgentTokenInfo>(
        `SELECT work_token, last_seen_at::text AS last_seen_at
         FROM virtual_agents WHERE id = $1::uuid`,
        [agentId],
      );
      return r.rows[0] ?? null;
    });
  } catch { return null; }
}

export async function getAgentProxyId(agentId: string): Promise<string | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<{ proxy_agent_id: string | null }>(
        `SELECT proxy_agent_id::text FROM virtual_agents WHERE id = $1::uuid`,
        [agentId],
      );
      return r.rows[0]?.proxy_agent_id ?? null;
    });
  } catch { return null; }
}

export async function escalateStaleAssignments(): Promise<number> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<{ id: string }>(
        `UPDATE assignments a
         SET assigned_to_agent_id = va.proxy_agent_id,
             updated_at = NOW()
         FROM virtual_agents va
         WHERE a.assigned_to_agent_id = va.id
           AND a.status = 'queued'
           AND va.proxy_agent_id IS NOT NULL
           AND a.created_at < NOW() - INTERVAL '30 minutes'
           AND (va.last_seen_at IS NULL OR va.last_seen_at < NOW() - INTERVAL '5 minutes')
         RETURNING a.id`,
      );
      return r.rowCount ?? 0;
    });
  } catch { return 0; }
}

// ── CEO Profile ───────────────────────────────────────────────────────────────
// The CEO is the current user — singleton stored on the CEO desk row.

export type CeoProfile = {
  name: string;
  role: string;
  system_prompt: string;
  upstream_token: string | null;
  upstream_name: string | null;
  upstream_last_seen_at: string | null;
  monthly_budget: number | null;
  monthSpent: number;
  workspace_dir: string | null;
};

export async function getCeoProfile(): Promise<CeoProfile | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<{
        name: string; role: string; system_prompt: string;
        upstream_token: string | null; upstream_name: string | null;
        upstream_last_seen_at: string | null;
        monthly_budget: string | null;
        workspace_dir: string | null;
      }>(
        `SELECT
            COALESCE(ceo_name, '我') AS name,
            COALESCE(ceo_role, 'CEO') AS role,
            COALESCE(ceo_system_prompt, '') AS system_prompt,
            upstream_token::text AS upstream_token,
            upstream_name,
            upstream_last_seen_at::text AS upstream_last_seen_at,
            ceo_monthly_budget::text AS monthly_budget,
            workspace_dir
         FROM desks
         WHERE id = $1::uuid`,
        [CEO_DESK_ID],
      );
      const row = r.rows[0];
      if (!row) return null;

      // CEO month spent: SUM of completed assignments this month (any agent under this desk)
      const spentRes = await client.query<{ spent: string }>(
        `SELECT COALESCE(SUM(budget_limit), 0)::text AS spent
         FROM assignments
         WHERE desk_id = $1::uuid
           AND status = 'completed'
           AND updated_at >= date_trunc('month', NOW())`,
        [CEO_DESK_ID],
      );

      return {
        ...row,
        monthly_budget: row.monthly_budget != null ? parseFloat(row.monthly_budget) : null,
        monthSpent: parseFloat(spentRes.rows[0]?.spent ?? "0"),
      };
    });
  } catch { return null; }
}

export async function updateCeoProfile(fields: {
  name?: string; role?: string; system_prompt?: string; upstream_name?: string | null;
  monthly_budget?: number | null;
  workspace_dir?: string | null;
}): Promise<boolean> {
  try {
    return await withDb(async (client) => {
      const sets: string[] = [];
      const vals: (string | number | null)[] = [];
      const push = (col: string, val: string | number | null) => {
        sets.push(`${col} = $${sets.length + 1}`);
        vals.push(val);
      };
      if (typeof fields.name === "string") push("ceo_name", fields.name);
      if (typeof fields.role === "string") push("ceo_role", fields.role);
      if (typeof fields.system_prompt === "string") push("ceo_system_prompt", fields.system_prompt);
      if ("upstream_name" in fields) push("upstream_name", fields.upstream_name ?? null);
      if ("monthly_budget" in fields) push("ceo_monthly_budget", fields.monthly_budget ?? null);
      if ("workspace_dir" in fields) push("workspace_dir", fields.workspace_dir ?? null);
      if (sets.length === 0) return true;
      vals.push(CEO_DESK_ID);
      const r = await client.query(
        `UPDATE desks SET ${sets.join(", ")} WHERE id = $${vals.length}::uuid`,
        vals,
      );
      return (r.rowCount ?? 0) > 0;
    });
  } catch { return false; }
}

export async function generateUpstreamToken(): Promise<string | null> {
  try {
    const token = crypto.randomUUID();
    const ok = await withDb(async (client) => {
      const r = await client.query(
        `UPDATE desks SET upstream_token = $1::uuid WHERE id = $2::uuid`,
        [token, CEO_DESK_ID],
      );
      return (r.rowCount ?? 0) > 0;
    });
    return ok ? token : null;
  } catch { return null; }
}

// ── Meetings ──────────────────────────────────────────────────────────────────

export type Meeting = {
  id: string;
  topic: string;
  agenda: string | null;
  status: "pending" | "in_session" | "summarized" | "rejected" | "cancelled";
  initiator_kind: "ceo" | "agent" | "system";
  initiator_agent_id: string | null;
  initiator_agent_name: string | null;
  initiator_assignment_id: string | null;
  complexity_reason: string | null;
  participant_agent_ids: string[];
  participant_names: string[];
  summary: string | null;
  summary_assignment_id: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
};

export type MeetingMessage = {
  id: number;
  meeting_id: string;
  sender_kind: "ceo" | "agent" | "system";
  sender_agent_id: string | null;
  sender_agent_name: string | null;
  content: string;
  created_at: string;
};

export async function createMeeting(input: {
  topic: string;
  agenda?: string;
  initiator_kind: "ceo" | "agent" | "system";
  initiator_agent_id?: string;
  initiator_assignment_id?: string;
  complexity_reason?: string;
  participant_agent_ids: string[];
  auto_approve?: boolean;
}): Promise<Meeting | null> {
  try {
    return await withDb(async (client) => {
      const status = input.auto_approve ? "in_session" : "pending";
      const started = input.auto_approve ? new Date().toISOString() : null;
      const r = await client.query<{ id: string }>(
        `INSERT INTO meetings (desk_id, topic, agenda, status,
                               initiator_kind, initiator_agent_id, initiator_assignment_id,
                               complexity_reason, participant_agent_ids, started_at)
         VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, $7::uuid, $8, $9::uuid[], $10::timestamptz)
         RETURNING id::text`,
        [CEO_DESK_ID, input.topic, input.agenda ?? null, status,
         input.initiator_kind,
         input.initiator_agent_id ?? null,
         input.initiator_assignment_id ?? null,
         input.complexity_reason ?? null,
         input.participant_agent_ids,
         started],
      );
      if (!r.rows[0]) return null;
      return getMeetingDetail(r.rows[0].id);
    });
  } catch { return null; }
}

export async function listMeetings(filterStatus?: string[]): Promise<Meeting[]> {
  try {
    return await withDb(async (client) => {
      const wheres: string[] = ["m.desk_id = $1::uuid"];
      const vals: unknown[] = [CEO_DESK_ID];
      if (filterStatus && filterStatus.length > 0) {
        wheres.push(`m.status = ANY($${vals.length + 1})`);
        vals.push(filterStatus);
      }
      const r = await client.query<{
        id: string; topic: string; agenda: string | null; status: Meeting["status"];
        initiator_kind: Meeting["initiator_kind"];
        initiator_agent_id: string | null; initiator_agent_name: string | null;
        initiator_assignment_id: string | null;
        complexity_reason: string | null;
        participant_agent_ids: string[];
        summary: string | null;
        summary_assignment_id: string | null;
        created_at: string; started_at: string | null; ended_at: string | null;
      }>(
        `SELECT m.id::text, m.topic, m.agenda, m.status, m.initiator_kind,
                m.initiator_agent_id::text, va_init.name AS initiator_agent_name,
                m.initiator_assignment_id::text,
                m.complexity_reason,
                ARRAY(SELECT pid::text FROM unnest(m.participant_agent_ids) pid) AS participant_agent_ids,
                m.summary, m.summary_assignment_id::text,
                m.created_at::text, m.started_at::text, m.ended_at::text
         FROM meetings m
         LEFT JOIN virtual_agents va_init ON m.initiator_agent_id = va_init.id
         WHERE ${wheres.join(" AND ")}
         ORDER BY
           CASE m.status
             WHEN 'pending' THEN 0
             WHEN 'in_session' THEN 1
             WHEN 'summarized' THEN 2
             ELSE 3
           END,
           m.created_at DESC
         LIMIT 50`,
        vals,
      );

      // Resolve participant names per row
      const allIds = Array.from(new Set(r.rows.flatMap(row => row.participant_agent_ids)));
      const nameMap = new Map<string, string>();
      if (allIds.length > 0) {
        const nm = await client.query<{ id: string; name: string }>(
          `SELECT id::text, name FROM virtual_agents WHERE id = ANY($1::uuid[])`,
          [allIds],
        );
        for (const n of nm.rows) nameMap.set(n.id, n.name);
      }

      return r.rows.map(row => ({
        ...row,
        participant_names: row.participant_agent_ids.map(id => nameMap.get(id) ?? "?"),
      }));
    });
  } catch { return []; }
}

export async function getMeetingDetail(id: string): Promise<Meeting | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<{
        id: string; topic: string; agenda: string | null; status: Meeting["status"];
        initiator_kind: Meeting["initiator_kind"];
        initiator_agent_id: string | null; initiator_agent_name: string | null;
        initiator_assignment_id: string | null;
        complexity_reason: string | null;
        participant_agent_ids: string[];
        summary: string | null;
        summary_assignment_id: string | null;
        created_at: string; started_at: string | null; ended_at: string | null;
      }>(
        `SELECT m.id::text, m.topic, m.agenda, m.status, m.initiator_kind,
                m.initiator_agent_id::text, va_init.name AS initiator_agent_name,
                m.initiator_assignment_id::text,
                m.complexity_reason,
                ARRAY(SELECT pid::text FROM unnest(m.participant_agent_ids) pid) AS participant_agent_ids,
                m.summary, m.summary_assignment_id::text,
                m.created_at::text, m.started_at::text, m.ended_at::text
         FROM meetings m
         LEFT JOIN virtual_agents va_init ON m.initiator_agent_id = va_init.id
         WHERE m.id = $1::uuid`,
        [id],
      );
      const row = r.rows[0];
      if (!row) return null;
      const ids = row.participant_agent_ids ?? [];
      let names: string[] = [];
      if (ids.length > 0) {
        const nm = await client.query<{ id: string; name: string }>(
          `SELECT id::text, name FROM virtual_agents WHERE id = ANY($1::uuid[])`,
          [ids],
        );
        const map = new Map<string, string>(nm.rows.map(n => [n.id, n.name]));
        names = ids.map(id => map.get(id) ?? "?");
      }
      return { ...row, participant_names: names };
    });
  } catch { return null; }
}

export async function getMeetingMessages(meetingId: string): Promise<MeetingMessage[]> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<MeetingMessage>(
        `SELECT mm.id, mm.meeting_id::text, mm.sender_kind,
                mm.sender_agent_id::text, va.name AS sender_agent_name,
                mm.content, mm.created_at::text
         FROM meeting_messages mm
         LEFT JOIN virtual_agents va ON mm.sender_agent_id = va.id
         WHERE mm.meeting_id = $1::uuid
         ORDER BY mm.created_at ASC, mm.id ASC`,
        [meetingId],
      );
      return r.rows;
    });
  } catch { return []; }
}

export async function postMeetingMessage(input: {
  meeting_id: string;
  sender_kind: "ceo" | "agent" | "system";
  sender_agent_id?: string;
  content: string;
}): Promise<MeetingMessage | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<MeetingMessage>(
        `INSERT INTO meeting_messages (meeting_id, sender_kind, sender_agent_id, content)
         VALUES ($1::uuid, $2, $3::uuid, $4)
         RETURNING id, meeting_id::text, sender_kind, sender_agent_id::text,
                   NULL::text AS sender_agent_name, content, created_at::text`,
        [input.meeting_id, input.sender_kind, input.sender_agent_id ?? null, input.content],
      );
      return r.rows[0] ?? null;
    });
  } catch { return null; }
}

export async function updateMeetingStatus(id: string, status: Meeting["status"]): Promise<boolean> {
  try {
    return await withDb(async (client) => {
      const patches: string[] = [`status = $1`, `updated_at = NOW()`];
      const vals: unknown[] = [status];
      if (status === "in_session") {
        patches.push(`started_at = COALESCE(started_at, NOW())`, `ended_at = NULL`);
      }
      if (status === "summarized" || status === "rejected" || status === "cancelled") {
        patches.push(`ended_at = COALESCE(ended_at, NOW())`);
      }
      vals.push(id);
      const r = await client.query(
        `UPDATE meetings SET ${patches.join(", ")}
         WHERE id = $${vals.length}::uuid`,
        vals,
      );
      return (r.rowCount ?? 0) > 0;
    });
  } catch { return false; }
}

export async function finalizeMeetingSummary(id: string, summary: string): Promise<{ ok: boolean; summary_assignment_id: string | null }> {
  try {
    return await withDb(async (client) => {
      const m = await client.query<{
        initiator_assignment_id: string | null; topic: string;
      }>(
        `SELECT initiator_assignment_id::text, topic FROM meetings WHERE id = $1::uuid`,
        [id],
      );
      const row = m.rows[0];
      if (!row) return { ok: false, summary_assignment_id: null };

      let summaryAssignmentId: string | null = null;

      // If initiated by an agent task, write summary as a deliverable on a new
      // child assignment under that task. This way the initiator's task history
      // gets a "meeting summary" execution row.
      if (row.initiator_assignment_id) {
        const child = await client.query<{ id: string; assigned_to_agent_id: string | null }>(
          `WITH parent AS (
              SELECT desk_id, assigned_to_agent_id, COALESCE(root_assignment_id, id) AS root
              FROM assignments WHERE id = $1::uuid
           )
           INSERT INTO assignments
             (desk_id, title, prompt, assigned_to_agent_id,
              parent_assignment_id, root_assignment_id, status, origin)
           SELECT parent.desk_id, $2, $3, parent.assigned_to_agent_id,
                  $1::uuid, parent.root, 'completed', 'system'
           FROM parent
           RETURNING id::text, assigned_to_agent_id::text`,
          [row.initiator_assignment_id, `会议总结：${row.topic}`, `meeting_id=${id}`],
        );
        if (child.rows[0]) {
          summaryAssignmentId = child.rows[0].id;
          // Deliverable
          await client.query(
            `INSERT INTO deliverables (assignment_id, title, body, format, created_by_agent_id)
             VALUES ($1::uuid, $2, $3, 'markdown', $4::uuid)`,
            [summaryAssignmentId, `会议总结：${row.topic}`, summary, child.rows[0].assigned_to_agent_id],
          );
        }
      }

      await client.query(
        `UPDATE meetings
         SET status = 'summarized', summary = $1, summary_assignment_id = $2::uuid,
             ended_at = COALESCE(ended_at, NOW()), updated_at = NOW()
         WHERE id = $3::uuid`,
        [summary, summaryAssignmentId, id],
      );

      return { ok: true, summary_assignment_id: summaryAssignmentId };
    });
  } catch { return { ok: false, summary_assignment_id: null }; }
}

// ── Schedules ─────────────────────────────────────────────────────────────────
// Recurring or one-shot triggers that spawn assignments. Live in
// scheduled_tasks_v2 (separate from the v1 schedules table).

export type ScheduledTask = {
  id: string;
  name: string;
  parent_task_id: string | null;
  assigned_to_agent_id: string | null;
  assigned_to_name: string | null;
  cron_expr: string;
  title_template: string;
  prompt_template: string;
  enabled: boolean;
  next_run_at: string;
  last_run_at: string | null;
  consecutive_failures: number;
  created_at: string;
};

export async function listSchedules(opts?: { agentId?: string; parentTaskId?: string }): Promise<ScheduledTask[]> {
  try {
    return await withDb(async (client) => {
      const wheres: string[] = ["s.desk_id = $1::uuid"];
      const vals: unknown[] = [CEO_DESK_ID];
      if (opts?.agentId) { wheres.push(`s.assigned_to_agent_id = $${vals.length + 1}::uuid`); vals.push(opts.agentId); }
      if (opts?.parentTaskId) { wheres.push(`s.parent_task_id = $${vals.length + 1}::uuid`); vals.push(opts.parentTaskId); }
      const r = await client.query<ScheduledTask>(
        `SELECT s.id::text, s.name, s.parent_task_id::text, s.assigned_to_agent_id::text,
                va.name AS assigned_to_name,
                s.cron_expr, s.title_template, s.prompt_template,
                s.enabled, s.next_run_at::text, s.last_run_at::text,
                s.consecutive_failures, s.created_at::text
         FROM scheduled_tasks_v2 s
         LEFT JOIN virtual_agents va ON s.assigned_to_agent_id = va.id
         WHERE ${wheres.join(" AND ")}
         ORDER BY s.next_run_at ASC`,
        vals,
      );
      return r.rows;
    });
  } catch { return []; }
}

export async function createSchedule(input: {
  name: string;
  parent_task_id?: string | null;
  assigned_to_agent_id?: string | null;
  cron_expr: string;
  title_template: string;
  prompt_template: string;
  next_run_at: Date;
}): Promise<ScheduledTask | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<ScheduledTask>(
        `INSERT INTO scheduled_tasks_v2
           (desk_id, name, parent_task_id, assigned_to_agent_id,
            cron_expr, title_template, prompt_template, next_run_at)
         VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5, $6, $7, $8)
         RETURNING id::text, name, parent_task_id::text, assigned_to_agent_id::text,
                   NULL::text AS assigned_to_name,
                   cron_expr, title_template, prompt_template, enabled,
                   next_run_at::text, last_run_at::text,
                   consecutive_failures, created_at::text`,
        [CEO_DESK_ID, input.name, input.parent_task_id ?? null, input.assigned_to_agent_id ?? null,
         input.cron_expr, input.title_template, input.prompt_template,
         input.next_run_at.toISOString()],
      );
      return r.rows[0] ?? null;
    });
  } catch { return null; }
}

export async function setScheduleEnabled(id: string, enabled: boolean): Promise<boolean> {
  try {
    return await withDb(async (client) => {
      const r = await client.query(
        `UPDATE scheduled_tasks_v2 SET enabled = $1, updated_at = NOW()
         WHERE id = $2::uuid AND desk_id = $3::uuid`,
        [enabled, id, CEO_DESK_ID],
      );
      return (r.rowCount ?? 0) > 0;
    });
  } catch { return false; }
}

export async function updateSchedule(input: {
  id: string;
  name: string;
  cron_expr: string;
  title_template: string;
  prompt_template: string;
  enabled: boolean;
  next_run_at: Date;
}): Promise<ScheduledTask | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<ScheduledTask>(
        `UPDATE scheduled_tasks_v2
         SET name = $1,
             cron_expr = $2,
             title_template = $3,
             prompt_template = $4,
             enabled = $5,
             next_run_at = $6,
             updated_at = NOW()
         WHERE id = $7::uuid AND desk_id = $8::uuid
         RETURNING id::text, name, parent_task_id::text, assigned_to_agent_id::text,
                   NULL::text AS assigned_to_name,
                   cron_expr, title_template, prompt_template, enabled,
                   next_run_at::text, last_run_at::text,
                   consecutive_failures, created_at::text`,
        [
          input.name,
          input.cron_expr,
          input.title_template,
          input.prompt_template,
          input.enabled,
          input.next_run_at.toISOString(),
          input.id,
          CEO_DESK_ID,
        ],
      );
      return r.rows[0] ?? null;
    });
  } catch { return null; }
}

export async function deleteSchedule(id: string): Promise<boolean> {
  try {
    return await withDb(async (client) => {
      const r = await client.query(
        `DELETE FROM scheduled_tasks_v2 WHERE id = $1::uuid AND desk_id = $2::uuid`,
        [id, CEO_DESK_ID],
      );
      return (r.rowCount ?? 0) > 0;
    });
  } catch { return false; }
}

// Fire any due schedules. Spawns assignments and advances next_run_at.
// Idempotent: safe to call from cron, frontend interval, or manually.
export async function tickSchedules(now: Date = new Date()): Promise<{ fired: number; ids: string[] }> {
  try {
    return await withDb(async (client) => {
      // Claim due schedules atomically
      const claim = await client.query<{
        id: string; name: string; parent_task_id: string | null;
        assigned_to_agent_id: string | null; cron_expr: string;
        title_template: string; prompt_template: string; next_run_at: string;
      }>(
        `SELECT id::text, name, parent_task_id::text, assigned_to_agent_id::text,
                cron_expr, title_template, prompt_template, next_run_at::text
         FROM scheduled_tasks_v2
         WHERE enabled = true AND next_run_at <= $1::timestamptz
         FOR UPDATE SKIP LOCKED`,
        [now.toISOString()],
      );

      const ids: string[] = [];
      // Lazy import the cron helper to avoid edge bundling issues
      const { computeNextRun } = await import("./cron");

      for (const s of claim.rows) {
        // Skip if no agent assigned and no parent (nothing to spawn into)
        if (!s.assigned_to_agent_id && !s.parent_task_id) continue;

        let agentId = s.assigned_to_agent_id;
        let parentId: string | null = s.parent_task_id;
        let rootId: string | null = s.parent_task_id;

        // If parent task exists, inherit agent from parent
        if (s.parent_task_id && !agentId) {
          const p = await client.query<{ assigned_to_agent_id: string | null }>(
            `SELECT assigned_to_agent_id::text FROM assignments WHERE id = $1::uuid`,
            [s.parent_task_id],
          );
          agentId = p.rows[0]?.assigned_to_agent_id ?? null;
        }

        if (!agentId) continue;

        // Spawn the assignment
        await client.query(
          `INSERT INTO assignments
             (desk_id, title, prompt, assigned_to_agent_id,
              parent_assignment_id, root_assignment_id, status, origin)
           VALUES ($1::uuid, $2, $3, $4::uuid, $5::uuid, COALESCE($5::uuid, NULL),
                   'queued', 'system')`,
          [CEO_DESK_ID, s.title_template, s.prompt_template, agentId, parentId],
        );
        void rootId; // currently rootId == parentId for child runs

        // Advance next_run_at — unless one-shot
        if (s.cron_expr.startsWith("ONCE:")) {
          await client.query(
            `UPDATE scheduled_tasks_v2
             SET enabled = false, last_run_at = $1::timestamptz
             WHERE id = $2::uuid`,
            [now.toISOString(), s.id],
          );
        } else {
          const next = computeNextRun(s.cron_expr, now);
          await client.query(
            `UPDATE scheduled_tasks_v2
             SET next_run_at = $1::timestamptz, last_run_at = $2::timestamptz
             WHERE id = $3::uuid`,
            [next ? next.toISOString() : new Date(now.getTime() + 86400_000 * 365).toISOString(),
             now.toISOString(), s.id],
          );
        }

        ids.push(s.id);
      }

      return { fired: ids.length, ids };
    });
  } catch { return { fired: 0, ids: [] }; }
}

// ── Tasks (Tracks) ────────────────────────────────────────────────────────────
// A "task" is the root assignment of a work-track. Children/descendants are
// individual executions on that track. Schedules attach here later.

export type TaskSummary = {
  id: string;
  title: string;
  status: string;
  origin: string;
  agent_id: string | null;
  agent_name: string | null;
  created_at: string;
  last_activity_at: string;
  child_count: number;
  child_done: number;
  child_running: number;
};

export type TaskExecution = {
  id: string;
  title: string;
  prompt: string;
  status: string;
  created_at: string;
  updated_at: string;
  is_root: boolean;
  deliverable_title: string | null;
  deliverable_body: string | null;
};

export type TaskDetail = {
  task: TaskSummary & {
    prompt: string;
    mission_source: string | null;
    budget_limit: number | null;
  };
  executions: TaskExecution[]; // chronological, root first
};

export async function listAgentTasks(agentId: string): Promise<TaskSummary[]> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<TaskSummary>(
        `SELECT
            a.id::text, a.title, a.status, a.origin,
            a.assigned_to_agent_id::text AS agent_id,
            va.name AS agent_name,
            a.created_at::text,
            GREATEST(a.updated_at, COALESCE(MAX(c.updated_at), a.updated_at))::text
              AS last_activity_at,
            COUNT(c.id)::int AS child_count,
            COUNT(c.id) FILTER (WHERE c.status = 'completed')::int AS child_done,
            COUNT(c.id) FILTER (WHERE c.status IN ('running','queued'))::int AS child_running
         FROM assignments a
         LEFT JOIN virtual_agents va ON a.assigned_to_agent_id = va.id
         LEFT JOIN assignments c ON c.parent_assignment_id = a.id
         WHERE a.assigned_to_agent_id = $1::uuid
           AND a.parent_assignment_id IS NULL
           AND a.origin <> 'private_chat'
         GROUP BY a.id, va.name
         ORDER BY
           CASE WHEN a.status IN ('completed','cancelled','failed') THEN 1 ELSE 0 END,
           GREATEST(a.updated_at, COALESCE(MAX(c.updated_at), a.updated_at)) DESC
         LIMIT 50`,
        [agentId],
      );
      return r.rows;
    });
  } catch { return []; }
}

export async function getTaskDetail(rootId: string): Promise<TaskDetail | null> {
  try {
    return await withDb(async (client) => {
      // Recursive descend the tree from the root
      const r = await client.query<{
        id: string; title: string; prompt: string; status: string; origin: string;
        agent_id: string | null; agent_name: string | null;
        mission_source: string | null; budget_limit: string | null;
        created_at: string; updated_at: string; parent_id: string | null;
        deliverable_title: string | null; deliverable_body: string | null;
      }>(
        `WITH RECURSIVE tree AS (
            SELECT * FROM assignments WHERE id = $1::uuid
            UNION ALL
            SELECT a.* FROM assignments a JOIN tree t ON a.parent_assignment_id = t.id
         )
         SELECT
            t.id::text, t.title, t.prompt, t.status, t.origin,
            t.assigned_to_agent_id::text AS agent_id,
            va.name AS agent_name,
            t.mission_source, t.budget_limit::text,
            t.created_at::text, t.updated_at::text,
            t.parent_assignment_id::text AS parent_id,
            d.title AS deliverable_title, d.body AS deliverable_body
         FROM tree t
         LEFT JOIN virtual_agents va ON t.assigned_to_agent_id = va.id
         LEFT JOIN deliverables d ON d.assignment_id = t.id
         ORDER BY t.created_at ASC`,
        [rootId],
      );
      if (r.rows.length === 0) return null;
      const root = r.rows.find(x => x.parent_id === null) ?? r.rows[0];
      const children = r.rows.filter(x => x.parent_id !== null);
      const lastActivity = r.rows.reduce<string>((max, row) => row.updated_at > max ? row.updated_at : max, root.updated_at);
      const taskSummary: TaskSummary & { prompt: string; mission_source: string | null; budget_limit: number | null } = {
        id: root.id,
        title: root.title,
        status: root.status,
        origin: root.origin,
        agent_id: root.agent_id,
        agent_name: root.agent_name,
        prompt: root.prompt,
        mission_source: root.mission_source,
        budget_limit: root.budget_limit != null ? parseFloat(root.budget_limit) : null,
        created_at: root.created_at,
        last_activity_at: lastActivity,
        child_count: children.length,
        child_done: children.filter(c => c.status === "completed").length,
        child_running: children.filter(c => c.status === "running" || c.status === "queued").length,
      };
      const executions: TaskExecution[] = r.rows.map(row => ({
        id: row.id,
        title: row.title,
        prompt: row.prompt,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        is_root: row.parent_id === null,
        deliverable_title: row.deliverable_title,
        deliverable_body: row.deliverable_body,
      }));
      return { task: taskSummary, executions };
    });
  } catch { return null; }
}

export async function createTaskRun(rootId: string, input: {
  title: string;
  prompt: string;
}): Promise<{ id: string } | null> {
  try {
    return await withDb(async (client) => {
      // Load root to inherit agent + desk
      const rootRes = await client.query<{
        assigned_to_agent_id: string | null; desk_id: string | null;
      }>(
        `SELECT assigned_to_agent_id::text, desk_id::text
         FROM assignments WHERE id = $1::uuid AND parent_assignment_id IS NULL`,
        [rootId],
      );
      const root = rootRes.rows[0];
      if (!root) return null;
      const r = await client.query<{ id: string }>(
        `INSERT INTO assignments
           (desk_id, title, prompt, assigned_to_agent_id,
            parent_assignment_id, root_assignment_id, status, origin)
         VALUES ($1::uuid, $2, $3, $4::uuid, $5::uuid, $5::uuid, 'queued', 'ceo')
         RETURNING id::text`,
        [root.desk_id, input.title, input.prompt, root.assigned_to_agent_id, rootId],
      );
      return r.rows[0] ?? null;
    });
  } catch { return null; }
}

export async function archiveTask(rootId: string): Promise<{ ok: boolean; cancelled: number }> {
  try {
    return await withDb(async (client) => {
      await client.query("BEGIN");
      try {
        // Cancel any still-active children
        const c = await client.query(
          `UPDATE assignments
           SET status = 'cancelled', updated_at = NOW()
           WHERE root_assignment_id = $1::uuid
             AND status IN ('queued','running','awaiting_input')`,
          [rootId],
        );
        // Mark root completed if it was active
        await client.query(
          `UPDATE assignments
           SET status = 'completed', updated_at = NOW()
           WHERE id = $1::uuid AND status NOT IN ('completed','cancelled','failed')`,
          [rootId],
        );
        await client.query("COMMIT");
        return { ok: true, cancelled: c.rowCount ?? 0 };
      } catch (e) {
        await client.query("ROLLBACK"); throw e;
      }
    });
  } catch { return { ok: false, cancelled: 0 }; }
}

// ── CEO Long-Term Memory ──────────────────────────────────────────────────────
// Persistent memory for the CEO agent. Mirrors Hermes' four-kind model
// (decision / fact / note / summary). Lives in our Postgres so the TS-side
// CEO chat can read/write without crossing a Python boundary.

export type MemoryKind = "decision" | "fact" | "note" | "summary";

export type MemoryEntry = {
  id: string;
  kind: MemoryKind;
  content: string;
  tags: string[];
  source: string | null;
  ref_id: string | null;
  created_at: string;
};

export async function writeMemory(input: {
  kind: MemoryKind;
  content: string;
  tags?: string[];
  source?: string;
  ref_id?: string | null;
}): Promise<MemoryEntry | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<MemoryEntry>(
        `INSERT INTO ceo_memory_entries (desk_id, kind, content, tags, source, ref_id)
         VALUES ($1::uuid, $2, $3, $4, $5, $6)
         RETURNING id::text, kind, content, tags, source, ref_id::text, created_at::text`,
        [CEO_DESK_ID, input.kind, input.content,
         input.tags ?? [], input.source ?? null, input.ref_id ?? null],
      );
      return r.rows[0] ?? null;
    });
  } catch { return null; }
}

export async function listRecentMemory(limit = 50): Promise<MemoryEntry[]> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<MemoryEntry>(
        `SELECT id::text, kind, content, tags, source, ref_id::text,
                created_at::text
         FROM ceo_memory_entries
         WHERE desk_id = $1::uuid
         ORDER BY created_at DESC
         LIMIT $2`,
        [CEO_DESK_ID, limit],
      );
      return r.rows;
    });
  } catch { return []; }
}

export async function searchMemory(query: string, limit = 20): Promise<MemoryEntry[]> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<MemoryEntry>(
        `SELECT id::text, kind, content, tags, source, ref_id::text,
                created_at::text
         FROM ceo_memory_entries
         WHERE desk_id = $1::uuid AND content ILIKE $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [CEO_DESK_ID, `%${query}%`, limit],
      );
      return r.rows;
    });
  } catch { return []; }
}

export async function deleteMemory(id: string): Promise<boolean> {
  try {
    return await withDb(async (client) => {
      const r = await client.query(
        `DELETE FROM ceo_memory_entries WHERE id = $1::uuid AND desk_id = $2::uuid`,
        [id, CEO_DESK_ID],
      );
      return (r.rowCount ?? 0) > 0;
    });
  } catch { return false; }
}

// ── Workspace Snapshot (for CEO chat agent context) ──────────────────────────
// A compact, real-time snapshot of the CEO's workspace state. Injected into
// every chat request as part of the system prompt so the agent has global
// awareness, plus exposed as read-only tools for drilling in.

export type WorkspaceSnapshot = {
  ts: string;
  team: Array<{ id: string; name: string; role: string; system_prompt_summary: string; monthly_budget: number | null; month_spent: number; online: boolean }>;
  running: Array<{ id: string; title: string; agent_name: string | null; status: string; started_ago: string }>;
  recent_deliverables: Array<{ title: string; agent_name: string | null; created_at: string; summary: string }>;
  awaiting_decisions: Array<{ id: string; title: string; agent_name: string | null }>;
  missions: Array<{ id: string; title: string; status: string; mission_source: string | null; subtask_progress: string }>;
  skills: Array<{ id: string; name: string; description: string }>;
  ceo_month_spent: number;
  ceo_monthly_budget: number | null;
};

export async function getWorkspaceSnapshot(): Promise<WorkspaceSnapshot | null> {
  try {
    return await withDb(async (client) => {
      const ts = new Date().toISOString();

      // Team (active, non-system agents) with budget + spent + online
      const teamRes = await client.query<{
        id: string; name: string; role: string; system_prompt: string | null;
        monthly_budget: string | null; spent: string; last_seen_at: string | null;
      }>(
        `SELECT va.id::text, va.name, va.role, va.system_prompt,
                va.monthly_budget::text,
                COALESCE((
                  SELECT SUM(budget_limit) FROM assignments
                  WHERE assigned_to_agent_id = va.id
                    AND status = 'completed'
                    AND updated_at >= date_trunc('month', NOW())
                ), 0)::text AS spent,
                va.last_seen_at::text
         FROM virtual_agents va
         WHERE va.status = 'active' AND va.is_system = false
         ORDER BY va.created_at ASC`,
      );
      const team = teamRes.rows.map(r => ({
        id: r.id, name: r.name, role: r.role,
        system_prompt_summary: (r.system_prompt ?? "").slice(0, 120).replace(/\n+/g, " "),
        monthly_budget: r.monthly_budget != null ? parseFloat(r.monthly_budget) : null,
        month_spent: parseFloat(r.spent),
        online: r.last_seen_at ? (Date.now() - new Date(r.last_seen_at).getTime() < 2 * 60 * 1000) : false,
      }));

      // Running + queued
      const runRes = await client.query<{ id: string; title: string; agent_name: string | null; status: string; created_at: string }>(
        `SELECT a.id::text, a.title, va.name AS agent_name, a.status,
                a.created_at::text AS created_at
         FROM assignments a
         LEFT JOIN virtual_agents va ON a.assigned_to_agent_id = va.id
         WHERE a.status IN ('queued','running')
           AND a.origin <> 'private_chat' AND a.origin <> 'inbound'
         ORDER BY a.created_at ASC LIMIT 8`,
      );
      const running = runRes.rows.map(r => {
        const mins = Math.max(0, Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000));
        return {
          id: r.id, title: r.title, agent_name: r.agent_name, status: r.status,
          started_ago: mins < 60 ? `${mins}分钟前` : `${Math.round(mins / 60)}小时前`,
        };
      });

      // Recent deliverables (last 48h)
      const delivRes = await client.query<{ title: string; agent_name: string | null; created_at: string; body: string }>(
        `SELECT d.title, va.name AS agent_name,
                d.created_at::text AS created_at,
                LEFT(d.body, 200) AS body
         FROM deliverables d
         LEFT JOIN virtual_agents va ON d.created_by_agent_id = va.id
         LEFT JOIN assignments a ON d.assignment_id = a.id
         WHERE d.created_at > NOW() - INTERVAL '48 hours'
           AND COALESCE(a.origin, 'ceo') <> 'private_chat'
         ORDER BY d.created_at DESC LIMIT 6`,
      );
      const recent_deliverables = delivRes.rows.map(r => ({
        title: r.title, agent_name: r.agent_name, created_at: r.created_at,
        summary: r.body.replace(/\n+/g, " ").slice(0, 160),
      }));

      // Awaiting decisions
      const awaitRes = await client.query<{ id: string; title: string; agent_name: string | null }>(
        `SELECT a.id::text, a.title, va.name AS agent_name
         FROM assignments a
         LEFT JOIN virtual_agents va ON a.assigned_to_agent_id = va.id
         WHERE a.status = 'awaiting_input' AND a.origin <> 'private_chat'
         ORDER BY a.updated_at DESC LIMIT 5`,
      );
      const awaiting_decisions = awaitRes.rows;

      // Missions (inbound) summary
      const missionRes = await client.query<{
        id: string; title: string; status: string; mission_source: string | null;
        sub_total: string; sub_done: string;
      }>(
        `SELECT m.id::text, m.title, m.status, m.mission_source,
                COUNT(s.*)::text AS sub_total,
                COUNT(s.*) FILTER (WHERE s.status = 'completed')::text AS sub_done
         FROM assignments m
         LEFT JOIN assignments s ON s.parent_assignment_id = m.id
         WHERE m.origin = 'inbound'
         GROUP BY m.id, m.title, m.status, m.mission_source, m.created_at
         ORDER BY
           CASE m.status WHEN 'queued' THEN 0 WHEN 'awaiting_input' THEN 1 ELSE 2 END,
           m.created_at DESC
         LIMIT 5`,
      );
      const missions = missionRes.rows.map(r => ({
        id: r.id, title: r.title, status: r.status, mission_source: r.mission_source,
        subtask_progress: `${r.sub_done}/${r.sub_total}`,
      }));

      // Skills (lite — just name + description)
      const skillRes = await client.query<{ id: string; name: string; description: string }>(
        `SELECT id::text, name, description FROM ceo_skills
         WHERE desk_id = $1::uuid AND enabled = true
         ORDER BY created_at DESC LIMIT 20`,
        [CEO_DESK_ID],
      );

      // CEO budget
      const ceoRes = await client.query<{ budget: string | null; spent: string }>(
        `SELECT ceo_monthly_budget::text AS budget,
                COALESCE((
                  SELECT SUM(budget_limit) FROM assignments
                  WHERE desk_id = $1::uuid AND status = 'completed'
                    AND updated_at >= date_trunc('month', NOW())
                ), 0)::text AS spent
         FROM desks WHERE id = $1::uuid`,
        [CEO_DESK_ID],
      );
      const ceoRow = ceoRes.rows[0];

      return {
        ts, team, running, recent_deliverables, awaiting_decisions, missions,
        skills: skillRes.rows,
        ceo_monthly_budget: ceoRow?.budget != null ? parseFloat(ceoRow.budget) : null,
        ceo_month_spent: parseFloat(ceoRow?.spent ?? "0"),
      };
    });
  } catch { return null; }
}

// Helper: full skill body for one skill (used by get_skill_body tool)
export async function getCeoSkillBody(id: string): Promise<{ name: string; body: string } | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<{ name: string; body: string }>(
        `SELECT name, body FROM ceo_skills WHERE id = $1::uuid AND desk_id = $2::uuid AND enabled = true`,
        [id, CEO_DESK_ID],
      );
      return r.rows[0] ?? null;
    });
  } catch { return null; }
}

// ── CEO Skills ────────────────────────────────────────────────────────────────
// Reusable prompts/recipes owned by the CEO. All employees inherit by default.

export type CeoSkill = {
  id: string;
  name: string;
  description: string;
  body: string;
  tags: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export async function listCeoSkills(): Promise<CeoSkill[]> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<CeoSkill>(
        `SELECT id::text, name, description, body, tags, enabled,
                created_at::text, updated_at::text
         FROM ceo_skills
         WHERE desk_id = $1::uuid
         ORDER BY enabled DESC, created_at DESC`,
        [CEO_DESK_ID],
      );
      return r.rows;
    });
  } catch { return []; }
}

export async function createCeoSkill(input: {
  name: string; description: string; body: string; tags?: string[];
}): Promise<CeoSkill | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<CeoSkill>(
        `INSERT INTO ceo_skills (desk_id, name, description, body, tags)
         VALUES ($1::uuid, $2, $3, $4, $5)
         RETURNING id::text, name, description, body, tags, enabled,
                   created_at::text, updated_at::text`,
        [CEO_DESK_ID, input.name, input.description, input.body, input.tags ?? []],
      );
      return r.rows[0] ?? null;
    });
  } catch { return null; }
}

export async function updateCeoSkill(id: string, fields: {
  name?: string; description?: string; body?: string; enabled?: boolean;
}): Promise<boolean> {
  const sets: string[] = []; const vals: unknown[] = [];
  const push = (col: string, val: unknown) => { sets.push(`${col} = $${sets.length + 1}`); vals.push(val); };
  if (typeof fields.name === "string") push("name", fields.name);
  if (typeof fields.description === "string") push("description", fields.description);
  if (typeof fields.body === "string") push("body", fields.body);
  if (typeof fields.enabled === "boolean") push("enabled", fields.enabled);
  if (sets.length === 0) return true;
  sets.push(`updated_at = NOW()`);
  vals.push(id);
  try {
    return await withDb(async (client) => {
      const r = await client.query(
        `UPDATE ceo_skills SET ${sets.join(", ")}
         WHERE id = $${vals.length}::uuid AND desk_id = $${vals.length + 1}::uuid`,
        [...vals, CEO_DESK_ID],
      );
      return (r.rowCount ?? 0) > 0;
    });
  } catch { return false; }
}

export async function deleteCeoSkill(id: string): Promise<boolean> {
  try {
    return await withDb(async (client) => {
      const r = await client.query(
        `DELETE FROM ceo_skills WHERE id = $1::uuid AND desk_id = $2::uuid`,
        [id, CEO_DESK_ID],
      );
      return (r.rowCount ?? 0) > 0;
    });
  } catch { return false; }
}

// ── Mission Inbox ─────────────────────────────────────────────────────────────
// Missions = assignments where THIS CEO is the recipient (from upstream).
// origin='inbound', stored in the same `assignments` table.

export type Mission = {
  id: string;
  title: string;
  prompt: string;
  status: string;            // queued | awaiting_input | completed | cancelled
  mission_source: string | null;
  created_at: string;
  budget_limit: number | null;
  subtask_count: number;     // how many sub-assignments CEO has spawned
  subtask_done: number;      // how many of those are completed
  report_body: string | null; // 述职报告 text if already drafted/submitted
};

export async function getMissions(): Promise<Mission[]> {
  try {
    return await withDb(async (client) => {
      const result = await client.query<Mission>(
        `SELECT
            m.id::text,
            m.title,
            m.prompt,
            m.status,
            m.mission_source,
            m.created_at::text AS created_at,
            m.budget_limit,
            COALESCE(sub.cnt, 0)::int AS subtask_count,
            COALESCE(sub.done, 0)::int AS subtask_done,
            d.body AS report_body
         FROM assignments m
         LEFT JOIN (
            SELECT parent_assignment_id,
                   COUNT(*) AS cnt,
                   COUNT(*) FILTER (WHERE status = 'completed') AS done
            FROM assignments
            WHERE parent_assignment_id IS NOT NULL
            GROUP BY parent_assignment_id
         ) sub ON sub.parent_assignment_id = m.id
         LEFT JOIN deliverables d ON d.assignment_id = m.id
         WHERE m.origin = 'inbound'
         ORDER BY
           CASE m.status
             WHEN 'queued' THEN 0
             WHEN 'awaiting_input' THEN 1
             WHEN 'completed' THEN 2
             ELSE 3
           END,
           m.created_at DESC`,
      );
      return result.rows;
    });
  } catch { return []; }
}

export async function getMissionDetail(id: string): Promise<{
  mission: Mission;
  subtasks: AssignmentRow[];
} | null> {
  try {
    return await withDb(async (client) => {
      const m = await client.query<Mission>(
        `SELECT
            id::text, title, prompt, status, mission_source,
            created_at::text AS created_at, budget_limit,
            0::int AS subtask_count, 0::int AS subtask_done,
            NULL::text AS report_body
         FROM assignments
         WHERE id = $1::uuid AND origin = 'inbound'`,
        [id],
      );
      if (m.rows.length === 0) return null;
      const subtasks = await client.query<AssignmentRow>(
        `SELECT a.id::text, a.title, a.status, a.created_at::text AS created_at,
                a.budget_limit,
                va.name AS assigned_to_name,
                d.title AS deliverable_title
         FROM assignments a
         LEFT JOIN virtual_agents va ON a.assigned_to_agent_id = va.id
         LEFT JOIN deliverables d ON d.assignment_id = a.id
         WHERE a.parent_assignment_id = $1::uuid
         ORDER BY a.created_at ASC`,
        [id],
      );
      const reportRes = await client.query<{ body: string }>(
        `SELECT body FROM deliverables WHERE assignment_id = $1::uuid ORDER BY created_at DESC LIMIT 1`,
        [id],
      );
      const mission = {
        ...m.rows[0],
        subtask_count: subtasks.rows.length,
        subtask_done: subtasks.rows.filter(r => r.status === "completed").length,
        report_body: reportRes.rows[0]?.body ?? null,
      };
      return { mission, subtasks: subtasks.rows };
    });
  } catch { return null; }
}

export async function updateMissionStatus(id: string, status: "awaiting_input" | "cancelled" | "queued"): Promise<boolean> {
  try {
    return await withDb(async (client) => {
      const r = await client.query(
        `UPDATE assignments SET status = $1, updated_at = NOW()
         WHERE id = $2::uuid AND origin = 'inbound'`,
        [status, id],
      );
      return (r.rowCount ?? 0) > 0;
    });
  } catch { return false; }
}

export async function submitMissionReport(id: string, body: string): Promise<boolean> {
  try {
    const result = await withDb(async (client) => {
      await client.query("BEGIN");
      try {
        // upsert deliverable for this mission (delete previous report, insert new)
        await client.query(`DELETE FROM deliverables WHERE assignment_id = $1::uuid`, [id]);
        await client.query(
          `INSERT INTO deliverables (assignment_id, title, body, format)
           VALUES ($1::uuid, $2, $3, 'markdown')`,
          [id, "述职报告", body],
        );
        // Capture peer callback info (stored in mission_source as "peer::URL::token")
        const peerRes = await client.query<{ peer_origin_id: string | null; mission_source: string | null; title: string }>(
          `UPDATE assignments SET status = 'completed', updated_at = NOW()
           WHERE id = $1::uuid AND origin = 'inbound'
           RETURNING peer_origin_id::text, mission_source, title`,
          [id],
        );
        await client.query("COMMIT");
        return peerRes.rows[0] ?? null;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    });
    if (!result) return false;

    // V3: if this mission came from a peer instance, callback to it
    if (result.peer_origin_id && result.mission_source?.startsWith("peer::")) {
      const parts = result.mission_source.split("::");
      const callbackUrl = parts[1];
      const peerToken = parts[2];
      if (callbackUrl && peerToken) {
        try {
          await fetch(`${callbackUrl.replace(/\/$/, "")}/api/v2/peer/done`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              peer_origin_id: result.peer_origin_id,
              peer_token: peerToken,
              deliverable_title: `${result.title} — 完成`,
              deliverable_body: body,
            }),
          });
        } catch {
          // upstream unavailable — they can poll later
        }
      }
    }
    return true;
  } catch { return false; }
}

// ── Peer (V3) ─────────────────────────────────────────────────────────────────
// Set or update the peer config for an agent (used when agent_mode='facade').
// Creates a single 'task' / 'peer' connection row for this agent; replaces
// existing one.

export async function setAgentPeerConfig(input: {
  agent_id: string;
  peer_url: string;
  peer_token: string;
  counterparty_label?: string | null;
}): Promise<{ connection_id: string } | null> {
  try {
    return await withDb(async (client) => {
      await client.query("BEGIN");
      try {
        // Remove existing peer connections for this agent
        await client.query(
          `DELETE FROM agent_connections WHERE agent_id = $1::uuid AND transport = 'peer'`,
          [input.agent_id],
        );
        const r = await client.query<{ id: string }>(
          `INSERT INTO agent_connections
             (agent_id, kind, direction, transport, peer_url, peer_token, counterparty_label)
           VALUES ($1::uuid, 'task', 'bidi', 'peer', $2, $3::uuid, $4)
           RETURNING id::text`,
          [input.agent_id, input.peer_url, input.peer_token, input.counterparty_label ?? null],
        );
        await client.query("COMMIT");
        const row = r.rows[0];
        return row ? { connection_id: row.id } : null;
      } catch (e) {
        await client.query("ROLLBACK"); throw e;
      }
    });
  } catch { return null; }
}

// Look up an agent's active peer connection (used during dispatch).
export async function getAgentPeerConfig(agentId: string): Promise<{
  connection_id: string; peer_url: string; peer_token: string;
} | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<{ id: string; peer_url: string | null; peer_token: string | null }>(
        `SELECT id::text, peer_url, peer_token::text
         FROM agent_connections
         WHERE agent_id = $1::uuid AND transport = 'peer'
         ORDER BY created_at DESC LIMIT 1`,
        [agentId],
      );
      const row = r.rows[0];
      if (!row || !row.peer_url || !row.peer_token) return null;
      return { connection_id: row.id, peer_url: row.peer_url, peer_token: row.peer_token };
    });
  } catch { return null; }
}

// Match an inbound peer callback back to the originating local assignment.
export async function getAssignmentByPeerOrigin(peerOriginId: string): Promise<{
  id: string; assigned_to_agent_id: string | null;
} | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<{ id: string; assigned_to_agent_id: string | null }>(
        `SELECT id::text, assigned_to_agent_id::text
         FROM assignments WHERE peer_origin_id = $1::uuid`,
        [peerOriginId],
      );
      return r.rows[0] ?? null;
    });
  } catch { return null; }
}

// Complete a facade-routed assignment when peer reports done.
export async function completePeerAssignment(input: {
  assignment_id: string;
  deliverable_title: string;
  deliverable_body: string;
}): Promise<boolean> {
  try {
    return await withDb(async (client) => {
      await client.query("BEGIN");
      try {
        const a = await client.query<{ assigned_to_agent_id: string | null }>(
          `SELECT assigned_to_agent_id::text FROM assignments WHERE id = $1::uuid`,
          [input.assignment_id],
        );
        const agentId = a.rows[0]?.assigned_to_agent_id;
        await client.query(
          `INSERT INTO deliverables (assignment_id, title, body, format, created_by_agent_id)
           VALUES ($1::uuid, $2, $3, 'markdown', $4::uuid)`,
          [input.assignment_id, input.deliverable_title, input.deliverable_body, agentId],
        );
        await client.query(
          `UPDATE assignments SET status = 'completed', updated_at = NOW()
           WHERE id = $1::uuid`,
          [input.assignment_id],
        );
        await client.query("COMMIT");
        return true;
      } catch (e) {
        await client.query("ROLLBACK"); throw e;
      }
    });
  } catch { return false; }
}

// Look up assignment's peer connection (used when peer needs callback).
export async function getMissionPeerCallback(missionId: string): Promise<{
  peer_url: string; peer_token: string; peer_origin_id: string;
} | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<{
        peer_url: string | null; peer_token: string | null; peer_origin_id: string | null;
      }>(
        `SELECT c.peer_url, c.peer_token::text, a.peer_origin_id::text
         FROM assignments a
         LEFT JOIN agent_connections c ON a.peer_connection_id = c.id
         WHERE a.id = $1::uuid`,
        [missionId],
      );
      const row = r.rows[0];
      if (!row?.peer_url || !row?.peer_token || !row?.peer_origin_id) return null;
      return { peer_url: row.peer_url, peer_token: row.peer_token, peer_origin_id: row.peer_origin_id };
    });
  } catch { return null; }
}

// ── Unified Connections ───────────────────────────────────────────────────────
// Each agent can have N outward "faces" — task channel, chat channel, etc.
// Each is a typed message channel with a transport (poll/webhook/slack/email/mcp/peer).

export type AgentConnection = {
  id: string;
  agent_id: string;
  kind: "task" | "chat" | "event" | "decision" | "stream";
  direction: "inbound" | "outbound" | "bidi";
  transport: "poll" | "webhook" | "slack" | "email" | "mcp" | "peer";
  token: string | null;
  endpoint_url: string | null;
  counterparty_label: string | null;
  last_seen_at: string | null;
  created_at: string;
};

export async function listAgentConnections(agentId: string): Promise<AgentConnection[]> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<AgentConnection>(
        `SELECT id::text, agent_id::text, kind, direction, transport,
                token::text, endpoint_url, counterparty_label,
                last_seen_at::text, created_at::text
         FROM agent_connections
         WHERE agent_id = $1::uuid
         ORDER BY created_at ASC`,
        [agentId],
      );
      return r.rows;
    });
  } catch { return []; }
}

export async function createAgentConnection(input: {
  agent_id: string;
  kind: AgentConnection["kind"];
  direction: AgentConnection["direction"];
  transport: AgentConnection["transport"];
  endpoint_url?: string | null;
  counterparty_label?: string | null;
}): Promise<AgentConnection | null> {
  try {
    return await withDb(async (client) => {
      const token = input.transport === "poll" ? crypto.randomUUID() : null;
      const r = await client.query<AgentConnection>(
        `INSERT INTO agent_connections (agent_id, kind, direction, transport, token, endpoint_url, counterparty_label)
         VALUES ($1::uuid, $2, $3, $4, $5::uuid, $6, $7)
         RETURNING id::text, agent_id::text, kind, direction, transport,
                   token::text, endpoint_url, counterparty_label,
                   last_seen_at::text, created_at::text`,
        [input.agent_id, input.kind, input.direction, input.transport,
         token, input.endpoint_url ?? null, input.counterparty_label ?? null],
      );
      return r.rows[0] ?? null;
    });
  } catch { return null; }
}

export async function deleteAgentConnection(id: string): Promise<boolean> {
  try {
    return await withDb(async (client) => {
      const r = await client.query(
        `DELETE FROM agent_connections WHERE id = $1::uuid`,
        [id],
      );
      return (r.rowCount ?? 0) > 0;
    });
  } catch { return false; }
}

// ── CEO External Integrations ─────────────────────────────────────────────────
// Gmail, Slack workspace, Calendar, Webhook, MCP servers, etc.
// Virtual employees inherit access by default (no per-employee permission list).

export type CeoIntegration = {
  id: string;
  kind: string;          // 'gmail' | 'slack' | 'calendar' | 'webhook' | 'mcp' | etc.
  label: string;
  config: Record<string, unknown>;
  status: "configured" | "connected" | "error" | "disabled";
  last_used_at: string | null;
  created_at: string;
};

export async function listCeoIntegrations(): Promise<CeoIntegration[]> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<CeoIntegration>(
        `SELECT id::text, kind, label, config, status,
                last_used_at::text, created_at::text
         FROM ceo_integrations
         WHERE desk_id = $1::uuid
         ORDER BY kind ASC, created_at ASC`,
        [CEO_DESK_ID],
      );
      return r.rows;
    });
  } catch { return []; }
}

export async function createCeoIntegration(input: {
  kind: string; label: string; config?: Record<string, unknown>;
}): Promise<CeoIntegration | null> {
  try {
    return await withDb(async (client) => {
      const r = await client.query<CeoIntegration>(
        `INSERT INTO ceo_integrations (desk_id, kind, label, config)
         VALUES ($1::uuid, $2, $3, $4::jsonb)
         RETURNING id::text, kind, label, config, status,
                   last_used_at::text, created_at::text`,
        [CEO_DESK_ID, input.kind, input.label, JSON.stringify(input.config ?? {})],
      );
      return r.rows[0] ?? null;
    });
  } catch { return null; }
}

export async function deleteCeoIntegration(id: string): Promise<boolean> {
  try {
    return await withDb(async (client) => {
      const r = await client.query(
        `DELETE FROM ceo_integrations WHERE id = $1::uuid AND desk_id = $2::uuid`,
        [id, CEO_DESK_ID],
      );
      return (r.rowCount ?? 0) > 0;
    });
  } catch { return false; }
}
