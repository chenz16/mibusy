export type TenantRole = "owner" | "member";
export type PlatformRole = "admin" | "friend";

export type SessionStatus =
  | "pending"
  | "running"
  | "awaiting_input"
  | "suspended"
  | "completed"
  | "failed"
  | "cancelled";

export type JobKind = "agent_session" | "cron_tick" | "cleanup";
export type JobState = "pending" | "running" | "completed" | "failed";

export type SessionEventKind =
  | "status"
  | "tool_use"
  | "tool_result"
  | "message_chunk"
  | "final"
  | "error";

export type StatusEventPayload = {
  status:
    | "started"
    | "working"
    | "tool_calling"
    | "processing_result"
    | "paused"
    | "task_started"
    | "task_notification"
    | "api_retry";
  sdk_session_id?: string;
  task_id?: string;
  tool_use_id?: string;
  [key: string]: unknown;
};

export type ToolUseEventPayload = {
  tool: string;
  tool_use_id: string;
  input_summary: string;
};

export type ToolResultEventPayload = {
  tool_use_id: string;
  output_summary: string;
  is_error?: boolean | null;
  cost_delta?: number;
};

export type MessageChunkEventPayload = {
  text: string;
  chunk_seq: number;
};

export type FinalEventPayload = {
  summary: string | null;
  cost_total: number | null;
  tokens_total: number | null;
};

export type ErrorEventPayload = {
  reason: string;
  recoverable: boolean;
  cost_total?: number | null;
  tokens_total?: number | null;
};

export type SessionEventPayloadByKind = {
  status: StatusEventPayload;
  tool_use: ToolUseEventPayload;
  tool_result: ToolResultEventPayload;
  message_chunk: MessageChunkEventPayload;
  final: FinalEventPayload;
  error: ErrorEventPayload;
};

export type SessionEvent<K extends SessionEventKind = SessionEventKind> = {
  id?: number;
  tenant_id: string;
  session_id: string;
  seq: number;
  kind: K;
  payload: SessionEventPayloadByKind[K];
  created_at?: string;
};

export type AgentSessionJobPayload = {
  session_id?: string;
  sdk_session_id?: string;
  template_id?: string;
  template_revision?: number;
  prompt: string;
  user_role?: TenantRole | "friend";
  allowed_tools?: string[];
  max_budget_usd?: number;
};

export type AgentTemplate = {
  id: string;
  tenant_id: string | null;
  name: string;
  revision: number;
  model: string;
  system_prompt: string;
  allowed_tools: string[];
  skills: string[];
  mcp_servers: Record<string, unknown>;
  permission_mode: string;
  max_budget_usd: number | null;
  max_session_hours: number | null;
  archived_at: string | null;
};

