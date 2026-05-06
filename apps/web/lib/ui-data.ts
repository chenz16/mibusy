import {
  Activity,
  Bell,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock,
  Database,
  GitBranch,
  Inbox,
  Loader2,
  MessageSquare,
  PauseCircle,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  XCircle,
  Ban,
} from "lucide-react";

export const navGroups = [
  {
    label: "Primary",
    items: [
      { href: "/chat", label: "Chat", icon: MessageSquare },
      { href: "/tasks", label: "Tasks", icon: Bot },
      { href: "/schedules", label: "Schedules", icon: CalendarClock },
      { href: "/inbox", label: "Inbox", icon: Inbox, badge: "3" },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { href: "/memory", label: "Memory", icon: Database },
      { href: "/templates", label: "Templates", icon: GitBranch },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/observe", label: "Observe", icon: Activity },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const sessionStates = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "running", label: "Running", icon: Loader2 },
  { key: "awaiting", label: "Awaiting input", icon: MessageSquare },
  { key: "suspended", label: "Suspended", icon: PauseCircle },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
  { key: "failed", label: "Failed", icon: XCircle },
  { key: "cancelled", label: "Cancelled", icon: Ban },
];

export const tasks = [
  {
    name: "K-12 robotics market scan",
    template: "research_agent@3",
    status: "running",
    duration: "42m",
    cost: "$0.31",
    children: "2",
  },
  {
    name: "Grant deadline monitor",
    template: "scheduler_agent@1",
    status: "awaiting",
    duration: "1h 18m",
    cost: "$0.48",
    children: "1",
  },
  {
    name: "Newsletter draft",
    template: "writer_agent@2",
    status: "completed",
    duration: "9m",
    cost: "$0.07",
    children: "0",
  },
];

export const schedules = [
  { name: "Daily education market digest", cron: "Every day 09:00", status: "enabled", last: "2h ago · ok", next: "Tomorrow 09:00" },
  { name: "Weekly arXiv robotics scan", cron: "Mon 07:00", status: "enabled", last: "3d ago · ok", next: "Monday 07:00" },
  { name: "Supplier price watcher", cron: "Every 6h", status: "disabled", last: "3 failures", next: "Paused" },
];

export const inboxItems = [
  {
    title: "research_agent asks for approval",
    question: "Found 3 paid reports. Continue with paid-source retrieval? Estimated extra cost $0.80.",
    context: "web_search x5 · read x3 · current cost $0.34 · remaining budget $4.66",
    age: "14m",
  },
  {
    title: "writer_agent needs a tone choice",
    question: "Should the outreach email sound more technical or more school-administrator friendly?",
    context: "draft complete · waiting for final tone before sending review copy",
    age: "31m",
  },
];

export const templates = [
  { name: "general_assistant", revision: "4", scope: "global", tools: "Read, WebSearch, AskUserQuestion", budget: "$3.00" },
  { name: "research_agent", revision: "3", scope: "global", tools: "Read, WebSearch, Task", budget: "$8.00" },
  { name: "writer_agent", revision: "2", scope: "private", tools: "Read, WebFetch", budget: "$2.00" },
  { name: "notifier_agent", revision: "1", scope: "global", tools: "AskUserQuestion", budget: "$0.50" },
  { name: "scheduler_agent", revision: "1", scope: "global", tools: "Read, WebSearch, AskUserQuestion", budget: "$4.00" },
];

export const observeMetrics = [
  { label: "Today", value: "$1.24", note: "12 sessions" },
  { label: "7 days", value: "$8.73", note: "94.2% success" },
  { label: "Month", value: "$23.40", note: "$200 cap" },
  { label: "Awaiting input", value: "3", note: "oldest 1h 12m" },
];

export const settingRows = [
  { label: "Anthropic", value: "Configured · last verified 2h ago", icon: CheckCircle2 },
  { label: "Monthly budget", value: "$23.40 / $200", icon: SlidersHorizontal },
  { label: "Kill switch", value: "All running sessions can be stopped", icon: ShieldAlert },
  { label: "Notifications", value: "Inbox + email enabled", icon: Bell },
];
