import {
  Activity,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Database,
  FileText,
  Inbox,
  Loader2,
  MessageSquare,
  PauseCircle,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  UserRoundCog,
  XCircle,
  Ban,
} from "lucide-react";

export const navGroups = [
  {
    label: "Operate",
    items: [
      { href: "/chat", label: "CEO Desk", icon: BriefcaseBusiness },
      { href: "/tasks", label: "Workstreams", icon: Sparkles },
      { href: "/schedules", label: "Rhythms", icon: CalendarClock },
      { href: "/inbox", label: "Decisions", icon: Inbox, badge: "3" },
    ],
  },
  {
    label: "Team",
    items: [
      { href: "/templates", label: "Virtual Team", icon: UserRoundCog },
      { href: "/memory", label: "Company Memory", icon: Database },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/observe", label: "Operating Dashboard", icon: Activity },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const sessionStates = [
  { key: "pending", label: "Queued", icon: Clock },
  { key: "running", label: "In progress", icon: Loader2 },
  { key: "awaiting", label: "Needs decision", icon: MessageSquare },
  { key: "suspended", label: "Paused", icon: PauseCircle },
  { key: "completed", label: "Delivered", icon: CheckCircle2 },
  { key: "failed", label: "Blocked", icon: XCircle },
  { key: "cancelled", label: "Cancelled", icon: Ban },
];

export const workstreams = [
  {
    name: "K-12 district outreach strategy",
    owner: "Research Lead",
    status: "running",
    duration: "42m",
    cost: "$0.31",
    subtasks: "2",
    deliverable: "district priority list + outreach angle",
    next: "Analyst is ranking districts by CTE fit",
  },
  {
    name: "Grant deadline monitor",
    owner: "Scheduler",
    status: "awaiting",
    duration: "1h 18m",
    cost: "$0.48",
    subtasks: "1",
    deliverable: "weekly deadline briefing",
    next: "Needs approval to include paid-source retrieval",
  },
  {
    name: "Principal follow-up email",
    owner: "Writer",
    status: "completed",
    duration: "9m",
    cost: "$0.07",
    subtasks: "0",
    deliverable: "ready-to-send email draft",
    next: "Delivered to review queue",
  },
];

export const rhythms = [
  {
    name: "Daily education market briefing",
    owner: "Chief of Staff",
    cadence: "Every day 09:00",
    status: "enabled",
    last: "2h ago · delivered",
    next: "Tomorrow 09:00",
  },
  {
    name: "Weekly robotics research scan",
    owner: "Research Lead",
    cadence: "Mon 07:00",
    status: "enabled",
    last: "3d ago · delivered",
    next: "Monday 07:00",
  },
  {
    name: "Supplier price watcher",
    owner: "Analyst",
    cadence: "Every 6h",
    status: "disabled",
    last: "3 failures",
    next: "Paused",
  },
];

export const decisionItems = [
  {
    title: "Research Lead asks for approval",
    question: "Three paid reports may materially improve the district ranking. Continue with paid-source retrieval?",
    context: "web_search x5 · current cost $0.34 · estimated extra cost $0.80 · remaining budget $4.66",
    recommendation: "Approve only if this workstream stays in the top-20 district target list.",
    age: "14m",
  },
  {
    title: "Writer needs a tone choice",
    question: "Should the follow-up email sound more technical or more school-administrator friendly?",
    context: "draft complete · waiting for final tone before handoff",
    recommendation: "Use school-administrator friendly tone for first-touch outreach.",
    age: "31m",
  },
  {
    title: "Chief of Staff is ready to close a workstream",
    question: "The principal follow-up pack is ready. Mark as delivered and archive the trace?",
    context: "3 drafts · 1 memo · total cost $0.12",
    recommendation: "Approve and keep the memo in Company Memory.",
    age: "48m",
  },
];

export const virtualTeamRoles = [
  {
    role: "Chief of Staff",
    template: "chief_of_staff",
    responsibility: "Break manager goals into workstreams, coordinate roles, and produce executive briefings.",
    deliverable: "plan, status update, decision memo",
    delegates: "Research Lead, Analyst, Writer, Scheduler",
    budget: "$3.00",
  },
  {
    role: "Research Lead",
    template: "research_lead",
    responsibility: "Find sources, map markets, compare competitors, and produce concise research briefs.",
    deliverable: "research brief, source list",
    delegates: "Analyst, Writer",
    budget: "$8.00",
  },
  {
    role: "Analyst",
    template: "analyst",
    responsibility: "Turn messy findings into tables, tradeoffs, priority scores, and recommendations.",
    deliverable: "comparison table, recommendation",
    delegates: "Writer",
    budget: "$4.00",
  },
  {
    role: "Writer",
    template: "writer",
    responsibility: "Convert decisions and research into emails, memos, proposals, and publishable drafts.",
    deliverable: "draft, final copy",
    delegates: "None",
    budget: "$2.00",
  },
  {
    role: "Scheduler",
    template: "scheduler_agent",
    responsibility: "Run operating rhythms, reminders, follow-ups, and recurring briefing workflows.",
    deliverable: "reminder, daily/weekly briefing",
    delegates: "Research Lead",
    budget: "$4.00",
  },
  {
    role: "Personal Assistant",
    template: "personal_assistant",
    responsibility: "Prepare meeting context, checklists, and low-risk personal operating support.",
    deliverable: "prep note, checklist",
    delegates: "Chief of Staff",
    budget: "$1.50",
  },
];

export const operatingMetrics = [
  { label: "In progress", value: "7", note: "3 roles active", icon: Loader2 },
  { label: "Needs decision", value: "3", note: "oldest 48m", icon: Inbox },
  { label: "Delivered today", value: "5", note: "2 briefings · 3 drafts", icon: FileText },
  { label: "Today cost", value: "$1.24", note: "$200 monthly cap", icon: CircleDollarSign },
];

export const memoryRows = [
  {
    type: "Decision",
    title: "Use administrator-friendly outreach first",
    owner: "Writer",
    source: "Principal follow-up email",
  },
  {
    type: "Preference",
    title: "Show risks and tradeoffs before implementation detail",
    owner: "Chief of Staff",
    source: "Manager feedback",
  },
  {
    type: "Briefing",
    title: "CTE funding is the strongest K-12 robotics wedge",
    owner: "Research Lead",
    source: "Market scan",
  },
];

export const settingRows = [
  { label: "Anthropic", value: "Configured · execution layer", icon: CheckCircle2 },
  { label: "Monthly budget", value: "$23.40 / $200", icon: SlidersHorizontal },
  { label: "Kill switch", value: "Stop all running workstreams", icon: ShieldAlert },
  { label: "Notifications", value: "Decisions queue + email enabled", icon: Bell },
];
