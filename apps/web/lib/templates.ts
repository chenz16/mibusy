import { withDb } from "./db";

export type TemplateListItem = {
  id: string;
  name: string;
  role: string;
  responsibility: string;
  deliverable: string;
  revision: number;
  scope: "global" | "private";
  tools: string[];
  budget: number | null;
  maxSessionHours: number | null;
  archived: boolean;
};

export type TemplateEdge = {
  caller: string;
  callee: string;
};

export type TemplateCatalog = {
  source: "database" | "fallback";
  templates: TemplateListItem[];
  edges: TemplateEdge[];
};

const roleCopy: Record<string, { role: string; responsibility: string; deliverable: string }> = {
  general_assistant: {
    role: "Chief of Staff",
    responsibility: "Break manager goals into workstreams, coordinate roles, and produce executive briefings.",
    deliverable: "plan, status update, decision memo",
  },
  chief_of_staff: {
    role: "Chief of Staff",
    responsibility: "Break manager goals into workstreams, coordinate roles, and produce executive briefings.",
    deliverable: "plan, status update, decision memo",
  },
  research_agent: {
    role: "Research Lead",
    responsibility: "Find sources, map markets, compare competitors, and produce concise research briefs.",
    deliverable: "research brief, source list",
  },
  research_lead: {
    role: "Research Lead",
    responsibility: "Find sources, map markets, compare competitors, and produce concise research briefs.",
    deliverable: "research brief, source list",
  },
  writer_agent: {
    role: "Writer",
    responsibility: "Convert research and decisions into emails, memos, proposals, and publishable drafts.",
    deliverable: "draft, final copy",
  },
  writer: {
    role: "Writer",
    responsibility: "Convert research and decisions into emails, memos, proposals, and publishable drafts.",
    deliverable: "draft, final copy",
  },
  notifier_agent: {
    role: "Personal Assistant",
    responsibility: "Prepare reminders, manager prompts, and low-risk operating support.",
    deliverable: "checklist, reminder",
  },
  scheduler_agent: {
    role: "Scheduler",
    responsibility: "Run operating rhythms, reminders, follow-ups, and recurring briefing workflows.",
    deliverable: "reminder, daily/weekly briefing",
  },
  analyst: {
    role: "Analyst",
    responsibility: "Turn messy findings into tables, tradeoffs, priority scores, and recommendations.",
    deliverable: "comparison table, recommendation",
  },
  personal_assistant: {
    role: "Personal Assistant",
    responsibility: "Prepare meeting context, checklists, and low-risk personal operating support.",
    deliverable: "prep note, checklist",
  },
};

function roleDetails(name: string) {
  return roleCopy[name] ?? {
    role: name.replaceAll("_", " "),
    responsibility: "Custom virtual team role.",
    deliverable: "custom deliverable",
  };
}

const fallbackTemplates: TemplateListItem[] = [
  {
    id: "fallback-general",
    name: "general_assistant",
    ...roleDetails("general_assistant"),
    revision: 1,
    scope: "global",
    tools: ["Read", "WebSearch", "AskUserQuestion"],
    budget: 3,
    maxSessionHours: 2,
    archived: false,
  },
  {
    id: "fallback-research",
    name: "research_agent",
    ...roleDetails("research_agent"),
    revision: 1,
    scope: "global",
    tools: ["Read", "WebSearch", "WebFetch", "Task", "AskUserQuestion"],
    budget: 8,
    maxSessionHours: 6,
    archived: false,
  },
  {
    id: "fallback-writer",
    name: "writer_agent",
    ...roleDetails("writer_agent"),
    revision: 1,
    scope: "global",
    tools: ["Read", "WebFetch", "AskUserQuestion"],
    budget: 2,
    maxSessionHours: 2,
    archived: false,
  },
  {
    id: "fallback-notifier",
    name: "notifier_agent",
    ...roleDetails("notifier_agent"),
    revision: 1,
    scope: "global",
    tools: ["AskUserQuestion"],
    budget: 0.5,
    maxSessionHours: 1,
    archived: false,
  },
  {
    id: "fallback-scheduler",
    name: "scheduler_agent",
    ...roleDetails("scheduler_agent"),
    revision: 1,
    scope: "global",
    tools: ["Read", "WebSearch", "WebFetch", "AskUserQuestion"],
    budget: 4,
    maxSessionHours: 3,
    archived: false,
  },
];

const fallbackEdges: TemplateEdge[] = [
  { caller: "general_assistant", callee: "research_agent" },
  { caller: "research_agent", callee: "writer_agent" },
  { caller: "research_agent", callee: "notifier_agent" },
  { caller: "scheduler_agent", callee: "notifier_agent" },
];

export async function getTemplateCatalog(): Promise<TemplateCatalog> {
  if (!process.env.DATABASE_URL) {
    return fallbackCatalog();
  }

  try {
    return await withDb(async (client) => {
      const templateResult = await client.query<{
        id: string;
        tenant_id: string | null;
        name: string;
        revision: number;
        allowed_tools: string[];
        max_budget_usd: string | null;
        max_session_hours: string | null;
        archived_at: Date | null;
      }>(`
        SELECT id, tenant_id, name, revision, allowed_tools, max_budget_usd, max_session_hours, archived_at
        FROM agent_templates
        ORDER BY tenant_id NULLS FIRST, name ASC, revision DESC
      `);

      const edgeResult = await client.query<{ caller: string; callee: string }>(`
        SELECT caller.name AS caller, callee.name AS callee
        FROM template_invocation_edges edge
        JOIN agent_templates caller ON caller.id = edge.caller_template_id
        JOIN agent_templates callee ON callee.id = edge.callee_template_id
        ORDER BY caller.name ASC, callee.name ASC
      `);

      return {
        source: "database",
        templates: templateResult.rows.map((row) => ({
          id: row.id,
          name: row.name,
          ...roleDetails(row.name),
          revision: row.revision,
          scope: row.tenant_id === null ? "global" : "private",
          tools: row.allowed_tools,
          budget: row.max_budget_usd === null ? null : Number(row.max_budget_usd),
          maxSessionHours: row.max_session_hours === null ? null : Number(row.max_session_hours),
          archived: row.archived_at !== null,
        })),
        edges: edgeResult.rows,
      };
    });
  } catch {
    return fallbackCatalog();
  }
}

function fallbackCatalog(): TemplateCatalog {
  return {
    source: "fallback",
    templates: fallbackTemplates,
    edges: fallbackEdges,
  };
}
