import {
  Activity,
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Database,
  FileText,
  Home,
  Inbox,
  Loader2,
  MessageSquare,
  PauseCircle,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
  XCircle,
  Ban,
} from "lucide-react";

export const mobileTabs = [
  { href: "/chat", label: "今日", icon: Home },
  { href: "/inbox", label: "待审", icon: Inbox, badge: "3" },
  { href: "/templates", label: "团队", icon: UsersRound },
  { href: "/observe", label: "会议室", icon: MessageSquare, badge: "1" },
];

export const navGroups = [
  {
    label: "Boardroom",
    items: mobileTabs,
  },
  {
    label: "More",
    items: [
      { href: "/tasks", label: "任务树", icon: Sparkles },
      { href: "/schedules", label: "节奏", icon: CalendarClock },
      { href: "/memory", label: "记忆", icon: Database },
      { href: "/settings", label: "设置", icon: Settings },
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

export const employees = [
  {
    name: "Atlas",
    title: "Chief of Staff",
    seniority: "L6",
    tenure: "18d",
    monthly: "$42.10",
    trust: 82,
    tone: "#C9A05C",
    nowDoing: "把你的增长目标拆成 3 条任务树，并向研究和写作角色派发子任务。",
    kpi: "今日交付 5 件 · 3 个决策待你审批",
    reports: ["Research Lead", "Analyst", "Writer", "Scheduler"],
  },
  {
    name: "Nova",
    title: "Research Lead",
    seniority: "L5",
    tenure: "12d",
    monthly: "$28.70",
    trust: 76,
    tone: "#8A7A55",
    nowDoing: "扫描 K-12 district robotics funding 和 CTE 采购信号。",
    kpi: "12 个来源 · 4 个高价值线索",
    reports: ["Temp research scouts"],
  },
  {
    name: "Ledger",
    title: "Analyst",
    seniority: "L4",
    tenure: "9d",
    monthly: "$18.40",
    trust: 71,
    tone: "#6B7B62",
    nowDoing: "把研究结果转成 district fit score 和推荐排序。",
    kpi: "20 个候选 · 6 个高置信目标",
    reports: [],
  },
  {
    name: "Quill",
    title: "Writer",
    seniority: "L4",
    tenure: "15d",
    monthly: "$16.95",
    trust: 79,
    tone: "#9A6E4C",
    nowDoing: "等待你选择 outreach 语气，然后生成校长首封邮件。",
    kpi: "3 封草稿 · 1 个语气决策",
    reports: [],
  },
];

export const workstreams = [
  {
    name: "K-12 district outreach strategy",
    owner: "Atlas",
    role: "Chief of Staff",
    status: "running",
    duration: "42m",
    cost: "$0.31",
    subtasks: "5",
    deliverable: "district priority list + outreach angle",
    next: "Ledger is ranking districts by CTE fit",
    kind: "auto",
  },
  {
    name: "Grant deadline monitor",
    owner: "Scheduler",
    role: "Scheduler",
    status: "awaiting",
    duration: "1h 18m",
    cost: "$0.48",
    subtasks: "3",
    deliverable: "weekly deadline briefing",
    next: "Needs approval to include paid-source retrieval",
    kind: "auto",
  },
  {
    name: "Principal follow-up email",
    owner: "Quill",
    role: "Writer",
    status: "completed",
    duration: "9m",
    cost: "$0.07",
    subtasks: "1",
    deliverable: "ready-to-send email draft",
    next: "Delivered to review queue",
    kind: "override",
  },
];

export const decisionItems = [
  {
    title: "Nova asks for paid-source approval",
    question: "Three paid reports may materially improve the district ranking. Continue with paid-source retrieval?",
    context: "web_search x5 · current cost $0.34 · estimated extra cost $0.80 · remaining budget $4.66",
    recommendation: "Approve only if this workstream stays in the top-20 district target list.",
    age: "14m",
    urgency: "High",
  },
  {
    title: "Quill needs a tone choice",
    question: "Should the follow-up email sound more technical or more school-administrator friendly?",
    context: "draft complete · waiting for final tone before handoff",
    recommendation: "Use school-administrator friendly tone for first-touch outreach.",
    age: "31m",
    urgency: "Medium",
  },
  {
    title: "Atlas is ready to close a workstream",
    question: "The principal follow-up pack is ready. Mark as delivered and archive the trace?",
    context: "3 drafts · 1 memo · total cost $0.12",
    recommendation: "Approve and keep the memo in Company Memory.",
    age: "48m",
    urgency: "Low",
  },
];

export const skills = [
  {
    name: "District Fit Scoring",
    owner: "Ledger",
    visibility: "Private",
    trust: 74,
    runs: 18,
    usedBy: "Atlas, Nova",
    probation: "2 runs left",
  },
  {
    name: "Administrator-Friendly Outreach",
    owner: "Quill",
    visibility: "Private",
    trust: 81,
    runs: 25,
    usedBy: "Atlas",
    probation: "Passed",
  },
  {
    name: "Grant Deadline Scanner",
    owner: "Scheduler",
    visibility: "Template",
    trust: 62,
    runs: 7,
    usedBy: "Nova",
    probation: "On probation",
  },
];

export const beaconChecks = [
  { name: "Hallucination source check", result: "4/5 pass", status: "running" },
  { name: "Budget escalation test", result: "5/5 pass", status: "completed" },
  { name: "Draft quality regression", result: "queued", status: "pending" },
];

export const tempAgents = [
  {
    id: "tmp-4831",
    parent: "Nova",
    task: "Find district CTE budget signals",
    expires: "18m",
    cost: "$0.06",
  },
  {
    id: "tmp-9210",
    parent: "Ledger",
    task: "Normalize county enrollment data",
    expires: "7m",
    cost: "$0.03",
  },
];

export const meetings = [
  {
    title: "K-12 outreach decision room",
    task: "K-12 district outreach strategy",
    status: "Live",
    owner: "Atlas",
    agents: ["Atlas", "Nova", "Ledger", "Quill"],
    summary: "Atlas is mediating whether to buy sources now or ship a lower-cost top-20 list first.",
  },
  {
    title: "Grant monitor postmortem",
    task: "Grant deadline monitor",
    status: "Waiting",
    owner: "Scheduler",
    agents: ["Scheduler", "Beacon"],
    summary: "Beacon found one failed paid-source escalation case. Scheduler is preparing a fix.",
  },
];

export const meetingThread = [
  { speaker: "Atlas", text: "Recommendation: keep the main task moving, ask for paid sources only on the top 6 districts." },
  { speaker: "Nova", text: "I can use free sources for the first pass, but confidence drops for procurement readiness." },
  { speaker: "Ledger", text: "The scoring model can flag low-confidence rows and avoid overclaiming." },
  { speaker: "Quill", text: "I can draft outreach with a softer assumption: 'based on public signals'." },
];

export const rhythms = [
  {
    name: "Daily market briefing",
    owner: "Atlas",
    cadence: "Every day 09:00",
    status: "enabled",
    last: "2h ago · delivered",
    next: "Tomorrow 09:00",
  },
  {
    name: "Weekly robotics research scan",
    owner: "Nova",
    cadence: "Mon 07:00",
    status: "enabled",
    last: "3d ago · delivered",
    next: "Monday 07:00",
  },
  {
    name: "Supplier price watcher",
    owner: "Ledger",
    cadence: "Every 6h",
    status: "disabled",
    last: "3 failures",
    next: "Paused",
  },
];

export const operatingMetrics = [
  { label: "Active staff", value: "4", note: "2 temp helpers", icon: UsersRound },
  { label: "Needs decision", value: "3", note: "oldest 48m", icon: Inbox },
  { label: "Delivered today", value: "5", note: "2 briefings · 3 drafts", icon: FileText },
  { label: "Today spend", value: "$1.24", note: "$200 monthly cap", icon: CircleDollarSign },
];

export const memoryRows = [
  {
    type: "Decision",
    title: "Use administrator-friendly outreach first",
    owner: "Quill",
    source: "Principal follow-up email",
  },
  {
    type: "Preference",
    title: "Show risks and tradeoffs before implementation detail",
    owner: "Atlas",
    source: "Manager feedback",
  },
  {
    type: "Briefing",
    title: "CTE funding is the strongest K-12 robotics wedge",
    owner: "Nova",
    source: "Market scan",
  },
];

export const settingRows = [
  { label: "Anthropic", value: "Configured · execution layer", icon: CheckCircle2 },
  { label: "Monthly token budget", value: "$23.40 / $200", icon: SlidersHorizontal },
  { label: "Beacon QA", value: "Tests new skills before promotion", icon: Bot },
  { label: "Kill switch", value: "Stop all running work", icon: ShieldAlert },
  { label: "Notifications", value: "Decisions queue + email enabled", icon: Bell },
];

export const systemSignals = [
  { label: "Run loop", value: "healthy", icon: Activity },
  { label: "Inbox SLA", value: "14m", icon: Clock },
  { label: "Owner mode", value: "CEO", icon: BriefcaseBusiness },
];
