import { randomUUID } from "node:crypto";

export type TaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "blocked"
  | "failed"
  | "approved"
  | "rolled_back";

export type RunStatus =
  | "running"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "rolled_back"
  | "stopped";

export interface OrchestrationTask {
  id: string;
  name: string;
  stage: string;
  status: TaskStatus;
  dependencies: string[];
  owner: string;
  attempts: number;
  durationMs: number;
  gate: "none" | "entry" | "approval" | "exit";
}

export interface OrchestrationRun {
  id: string;
  scenarioId: string;
  scenarioName: string;
  status: RunStatus;
  startedAt: string;
  updatedAt: string;
  progress: number;
  risk: "low" | "medium" | "high";
  tasks: OrchestrationTask[];
  approvals: number;
  retries: number;
  rollbacks: number;
  mttrSeconds: number;
  endToEndLatencyMs: number;
}

export interface ShortUrlRecord {
  slug: string;
  destination: string;
  createdAt: string;
  clicks: number;
  status: "active" | "paused";
  owner: string;
  tags: string[];
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  severity: "info" | "success" | "warning" | "critical";
  detail: string;
}

export const scenarios = [
  {
    id: "greenfield",
    name: "Launch core shortener",
    kind: "greenfield" as const,
    description:
      "Design and deliver the first secure shortening API, redirect path, analytics model, tests, and release evidence.",
    status: "ready" as const,
    taskCount: 9,
    riskLevel: "medium" as const,
    lastRun: "2026-09-07T14:30:00.000Z",
  },
  {
    id: "brownfield",
    name: "Harden collision handling",
    kind: "brownfield" as const,
    description:
      "Trace the existing slug-generation data flow, fix collision behavior, protect compatibility, and validate under load.",
    status: "needs_review" as const,
    taskCount: 7,
    riskLevel: "high" as const,
    lastRun: "2026-09-07T14:12:00.000Z",
  },
  {
    id: "ambiguous",
    name: "Add enterprise analytics",
    kind: "ambiguous" as const,
    description:
      "Resolve unclear retention and privacy expectations before decomposing analytics, governance, and rollout work.",
    status: "ready" as const,
    taskCount: 8,
    riskLevel: "high" as const,
    lastRun: null,
  },
];

const urls: ShortUrlRecord[] = [
  {
    slug: "launch-brief",
    destination: "https://example.com/platform/launch-brief",
    createdAt: "2026-09-07T13:35:00.000Z",
    clicks: 1284,
    status: "active",
    owner: "Platform team",
    tags: ["release", "internal"],
  },
  {
    slug: "api-docs",
    destination: "https://example.com/docs/url-shortener",
    createdAt: "2026-09-06T18:20:00.000Z",
    clicks: 846,
    status: "active",
    owner: "Developer experience",
    tags: ["docs"],
  },
  {
    slug: "safe-change",
    destination: "https://example.com/engineering/safe-change",
    createdAt: "2026-09-05T16:10:00.000Z",
    clicks: 319,
    status: "active",
    owner: "Reliability",
    tags: ["governance"],
  },
];

const audit: AuditRecord[] = [
  {
    id: "evt-1",
    timestamp: "2026-09-07T14:31:45.000Z",
    actor: "Release agent",
    action: "EXIT_GATE_PASSED",
    target: "run-gf-1024",
    severity: "success",
    detail:
      "Contract, test, security, and release-readiness evidence satisfied policy.",
  },
  {
    id: "evt-2",
    timestamp: "2026-09-07T14:27:12.000Z",
    actor: "Security agent",
    action: "POLICY_CHECK_COMPLETED",
    target: "core-shortener",
    severity: "success",
    detail:
      "No credential exposure, unsafe redirect, or unbounded input findings.",
  },
  {
    id: "evt-3",
    timestamp: "2026-09-07T14:14:08.000Z",
    actor: "Orchestrator",
    action: "APPROVAL_REQUESTED",
    target: "run-bf-987",
    severity: "warning",
    detail:
      "Collision strategy modifies a high-traffic write path and requires human approval.",
  },
  {
    id: "evt-4",
    timestamp: "2026-09-07T14:03:44.000Z",
    actor: "Planner agent",
    action: "REPLAN_COMPLETED",
    target: "enterprise-analytics",
    severity: "info",
    detail:
      "Retention uncertainty introduced a privacy decision gate before implementation.",
  },
];

const runs: OrchestrationRun[] = [
  {
    id: "run-gf-1024",
    scenarioId: "greenfield",
    scenarioName: "Launch core shortener",
    status: "completed",
    startedAt: "2026-09-07T14:20:00.000Z",
    updatedAt: "2026-09-07T14:31:45.000Z",
    progress: 100,
    risk: "medium",
    tasks: buildTasks("completed"),
    approvals: 1,
    retries: 1,
    rollbacks: 0,
    mttrSeconds: 42,
    endToEndLatencyMs: 705000,
  },
  {
    id: "run-bf-987",
    scenarioId: "brownfield",
    scenarioName: "Harden collision handling",
    status: "awaiting_approval",
    startedAt: "2026-09-07T14:08:00.000Z",
    updatedAt: "2026-09-07T14:14:08.000Z",
    progress: 46,
    risk: "high",
    tasks: buildTasks("approval"),
    approvals: 0,
    retries: 0,
    rollbacks: 0,
    mttrSeconds: 0,
    endToEndLatencyMs: 368000,
  },
];

export function buildTasks(mode: "completed" | "approval"): OrchestrationTask[] {
  const complete = mode === "completed";
  return [
    {
      id: "normalize",
      name: "Normalize requirement",
      stage: "Understand",
      status: "completed",
      dependencies: [],
      owner: "Analyst agent",
      attempts: 1,
      durationMs: 12200,
      gate: "entry",
    },
    {
      id: "architecture",
      name: "Assess architecture and risk",
      stage: "Design",
      status: "completed",
      dependencies: ["normalize"],
      owner: "Architect agent",
      attempts: 1,
      durationMs: 28400,
      gate: "none",
    },
    {
      id: "plan",
      name: "Build dependency graph",
      stage: "Plan",
      status: "completed",
      dependencies: ["architecture"],
      owner: "Planner agent",
      attempts: 1,
      durationMs: 9400,
      gate: "none",
    },
    {
      id: "approval",
      name: "Approve high-impact change",
      stage: "Govern",
      status: complete ? "approved" : "blocked",
      dependencies: ["plan"],
      owner: "Human reviewer",
      attempts: complete ? 1 : 0,
      durationMs: complete ? 78200 : 0,
      gate: "approval",
    },
    {
      id: "implement-api",
      name: "Implement API and persistence",
      stage: "Build",
      status: complete ? "completed" : "queued",
      dependencies: ["approval"],
      owner: "Backend agent",
      attempts: complete ? 2 : 0,
      durationMs: complete ? 188000 : 0,
      gate: "none",
    },
    {
      id: "implement-tests",
      name: "Generate validation suite",
      stage: "Build",
      status: complete ? "completed" : "queued",
      dependencies: ["approval"],
      owner: "Quality agent",
      attempts: complete ? 1 : 0,
      durationMs: complete ? 141000 : 0,
      gate: "none",
    },
    {
      id: "security",
      name: "Run policy and security checks",
      stage: "Validate",
      status: complete ? "completed" : "queued",
      dependencies: ["implement-api", "implement-tests"],
      owner: "Security agent",
      attempts: complete ? 1 : 0,
      durationMs: complete ? 63000 : 0,
      gate: "none",
    },
    {
      id: "release",
      name: "Assemble release evidence",
      stage: "Release",
      status: complete ? "completed" : "queued",
      dependencies: ["security"],
      owner: "Release agent",
      attempts: complete ? 1 : 0,
      durationMs: complete ? 35400 : 0,
      gate: "exit",
    },
  ];
}

function addAudit(event: Omit<AuditRecord, "id" | "timestamp">) {
  audit.unshift({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...event,
  });
}

export function listUrls() {
  return urls;
}

export function createUrl(input: {
  destination: string;
  slug?: string;
  tags?: string[];
}) {
  let slug =
    input.slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") ||
    randomUUID().slice(0, 7);
  if (!slug) slug = randomUUID().slice(0, 7);
  if (urls.some((item) => item.slug === slug)) {
    slug = `${slug}-${randomUUID().slice(0, 4)}`;
  }
  const record: ShortUrlRecord = {
    slug,
    destination: input.destination,
    createdAt: new Date().toISOString(),
    clicks: 0,
    status: "active",
    owner: "Current workspace",
    tags: input.tags ?? [],
  };
  urls.unshift(record);
  addAudit({
    actor: "URL service",
    action: "SHORT_URL_CREATED",
    target: slug,
    severity: "success",
    detail: `Created a governed redirect to ${input.destination}.`,
  });
  return record;
}

export function recordRejectedUrl(detail: string) {
  addAudit({
    actor: "Policy guard",
    action: "UNSAFE_REDIRECT_REJECTED",
    target: "url-input",
    severity: "warning",
    detail,
  });
}

export function getUrl(slug: string) {
  return urls.find((item) => item.slug === slug);
}

export function deactivateUrl(slug: string) {
  const item = getUrl(slug);
  if (!item) return false;
  item.status = "paused";
  addAudit({
    actor: "URL service",
    action: "SHORT_URL_PAUSED",
    target: slug,
    severity: "warning",
    detail: "Redirect disabled without deleting its audit history.",
  });
  return true;
}

export function registerClick(slug: string) {
  const item = getUrl(slug);
  if (!item || item.status !== "active") return undefined;
  item.clicks += 1;
  return item;
}

export function getAnalytics(slug: string) {
  const item = getUrl(slug);
  if (!item) return undefined;
  const total = item.clicks;
  const factors = [0.08, 0.11, 0.13, 0.16, 0.14, 0.18, 0.2];
  return {
    slug,
    totalClicks: total,
    uniqueVisitors: Math.round(total * 0.72),
    clickThroughRate: total === 0 ? 0 : 0.684,
    dailyClicks: factors.map((factor, index) => ({
      day: new Date(Date.UTC(2026, 8, index + 1)).toISOString().slice(0, 10),
      clicks: Math.round(total * factor),
    })),
    topReferrers: [
      { source: "Direct", clicks: Math.round(total * 0.46) },
      { source: "Engineering wiki", clicks: Math.round(total * 0.31) },
      { source: "Email", clicks: Math.round(total * 0.15) },
      { source: "Other", clicks: Math.round(total * 0.08) },
    ],
  };
}

export function listRuns() {
  return runs;
}

export function createRun(scenarioId: string) {
  const scenario = scenarios.find((item) => item.id === scenarioId);
  if (!scenario) return undefined;
  const now = new Date().toISOString();
  const run: OrchestrationRun = {
    id: `run-${randomUUID().slice(0, 8)}`,
    scenarioId,
    scenarioName: scenario.name,
    status: "awaiting_approval",
    startedAt: now,
    updatedAt: now,
    progress: 46,
    risk: scenario.riskLevel,
    tasks: buildTasks("approval"),
    approvals: 0,
    retries: 0,
    rollbacks: 0,
    mttrSeconds: 0,
    endToEndLatencyMs: 18400,
  };
  runs.unshift(run);
  addAudit({
    actor: "Orchestrator",
    action: "RUN_STARTED",
    target: run.id,
    severity: "info",
    detail: `${scenario.name} reached its governed approval checkpoint.`,
  });
  if (scenarioId === "ambiguous") {
    addAudit({
      actor: "Planner agent",
      action: "REPLAN_COMPLETED",
      target: run.id,
      severity: "warning",
      detail:
        "Upstream retention ambiguity changed the graph: a privacy decision gate now blocks analytics implementation.",
    });
  }
  return run;
}

export function approveRun(id: string) {
  const run = runs.find((item) => item.id === id);
  if (!run) return undefined;
  run.status = "completed";
  run.progress = 100;
  run.approvals += 1;
  run.updatedAt = new Date().toISOString();
  run.endToEndLatencyMs += 492000;
  run.tasks = buildTasks("completed");
  addAudit({
    actor: "Human reviewer",
    action: "APPROVAL_GRANTED",
    target: run.id,
    severity: "success",
    detail:
      "High-impact gate approved; parallel implementation paths synchronized and exit evidence passed.",
  });
  return run;
}

export function retryRun(id: string) {
  const run = runs.find((item) => item.id === id);
  if (!run) return undefined;
  if (run.retries >= 2) {
    run.status = "stopped";
    run.updatedAt = new Date().toISOString();
    addAudit({
      actor: "Orchestrator",
      action: "RETRY_BUDGET_EXHAUSTED",
      target: run.id,
      severity: "critical",
      detail:
        "Retry budget exhausted at 2 attempts. Fallback policy safely stopped execution for human review.",
    });
    return run;
  }
  run.retries += 1;
  run.status = "running";
  run.updatedAt = new Date().toISOString();
  run.mttrSeconds = 38;
  addAudit({
    actor: "Orchestrator",
    action: "BOUNDED_RETRY_STARTED",
    target: run.id,
    severity: "warning",
    detail: `Retry ${run.retries} of 2 started with preserved decision context.`,
  });
  return run;
}

export function rollbackRun(id: string) {
  const run = runs.find((item) => item.id === id);
  if (!run) return undefined;
  run.rollbacks += 1;
  run.status = "rolled_back";
  run.progress = 34;
  run.updatedAt = new Date().toISOString();
  run.tasks = run.tasks.map((task) =>
    task.stage === "Build" || task.stage === "Validate" || task.stage === "Release"
      ? { ...task, status: "rolled_back" as const }
      : task,
  );
  addAudit({
    actor: "Orchestrator",
    action: "SAFE_ROLLBACK_COMPLETED",
    target: run.id,
    severity: "critical",
    detail:
      "Run restored to the last approved architecture checkpoint; downstream outputs invalidated.",
  });
  return run;
}

export function safeStopRun(id: string) {
  const run = runs.find((item) => item.id === id);
  if (!run) return undefined;
  run.status = "stopped";
  run.updatedAt = new Date().toISOString();
  run.tasks = run.tasks.map((task) =>
    task.status === "queued" || task.status === "running"
      ? { ...task, status: "blocked" as const }
      : task,
  );
  addAudit({
    actor: "Human reviewer",
    action: "SAFE_STOP_ACTIVATED",
    target: run.id,
    severity: "critical",
    detail:
      "Unfinished work was blocked without discarding approved outputs or decision lineage.",
  });
  return run;
}

export function listAudit() {
  return audit;
}

export function dashboard() {
  return {
    activeRuns: runs.filter(
      (run) => run.status === "running" || run.status === "awaiting_approval",
    ).length,
    urlsCreated: urls.length,
    clicksToday: urls.reduce((sum, item) => sum + item.clicks, 0),
    reliability: 0.987,
    pendingApprovals: runs.filter(
      (run) => run.status === "awaiting_approval",
    ).length,
    recentActivity: audit.slice(0, 4),
  };
}