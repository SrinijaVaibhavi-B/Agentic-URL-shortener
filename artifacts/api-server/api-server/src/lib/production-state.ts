import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db, pool } from "@workspace/db";
import {
  auditEventsTable,
  orchestrationRunsTable,
  shortUrlsTable,
  urlClicksTable,
} from "@workspace/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  buildTasks,
  scenarios,
  type AuditRecord,
  type OrchestrationRun,
  type OrchestrationTask,
  type ShortUrlRecord,
} from "./demo-state";
import { normalizeCustomSlug } from "./url-policy";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const RETRY_LIMIT = 2;
const seedUrls = [
  {
    slug: "launch-brief",
    destination: "https://example.com/platform/launch",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
    clicks: 12,
    status: "active",
    owner: "platform-team",
    tags: ["launch", "platform"],
  },
  {
    slug: "security-review",
    destination: "https://example.com/security/review",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10),
    clicks: 4,
    status: "active",
    owner: "security-team",
    tags: ["security"],
  },
  {
    slug: "deprecated-offer",
    destination: "https://example.com/offers/archive",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    clicks: 0,
    status: "paused",
    owner: "growth-team",
    tags: ["archive"],
  },
];

function runFromRow(
  row: typeof orchestrationRunsTable.$inferSelect,
): OrchestrationRun {
  return {
    id: row.id,
    scenarioId: row.scenarioId,
    scenarioName: row.scenarioName,
    status: row.status as OrchestrationRun["status"],
    startedAt: row.startedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    progress: row.progress,
    risk: row.risk as OrchestrationRun["risk"],
    tasks: row.tasks as unknown as OrchestrationTask[],
    approvals: row.approvals,
    retries: row.retries,
    rollbacks: row.rollbacks,
    mttrSeconds: row.mttrSeconds,
    endToEndLatencyMs: row.endToEndLatencyMs,
  };
}

function urlFromRow(row: typeof shortUrlsTable.$inferSelect): ShortUrlRecord {
  return {
    slug: row.slug,
    destination: row.destination,
    createdAt: row.createdAt.toISOString(),
    clicks: row.clicks,
    status: row.status as ShortUrlRecord["status"],
    owner: row.owner,
    tags: row.tags,
  };
}

function auditFromRow(row: typeof auditEventsTable.$inferSelect): AuditRecord {
  return {
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    actor: row.actor,
    action: row.action,
    target: row.target,
    severity: row.severity as AuditRecord["severity"],
    detail: row.detail,
  };
}

function canonicalAuditValue(input: {
  id: string;
  timestamp: Date;
  actor: string;
  action: string;
  target: string;
  severity: string;
  detail: string;
  previousHash: string | null;
}) {
  return [
    input.id,
    input.timestamp.toISOString(),
    input.actor,
    input.action,
    input.target,
    input.severity,
    input.detail,
    input.previousHash ?? "GENESIS",
  ].join("|");
}

async function appendAudit(
  tx: Transaction,
  input: Omit<AuditRecord, "id" | "timestamp"> & {
    id?: string;
    timestamp?: Date;
  },
) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(742019)`);
  const [previous] = await tx
    .select({ eventHash: auditEventsTable.eventHash })
    .from(auditEventsTable)
    .orderBy(desc(auditEventsTable.timestamp))
    .limit(1);

  const event = {
    id: input.id ?? `evt-${randomUUID()}`,
    timestamp: input.timestamp ?? new Date(),
    actor: input.actor,
    action: input.action,
    target: input.target,
    severity: input.severity,
    detail: input.detail,
    previousHash: previous?.eventHash ?? null,
  };
  const eventHash = createHash("sha256")
    .update(canonicalAuditValue(event))
    .digest("hex");

  await tx.insert(auditEventsTable).values({ ...event, eventHash });
}

let initialization: Promise<void> | undefined;

export function ensureProductionState(): Promise<void> {
  initialization ??= db.transaction(async (tx) => {
    await tx.insert(shortUrlsTable).values([...seedUrls]).onConflictDoNothing();

    const completedTasks = buildTasks("completed");
    const approvalTasks = buildTasks("approval");
    await tx
      .insert(orchestrationRunsTable)
      .values([
        {
          id: "run-seed-completed",
          scenarioId: "greenfield",
          scenarioName: "Launch core shortener",
          status: "completed",
          startedAt: new Date(Date.now() - 1000 * 60 * 64),
          updatedAt: new Date(Date.now() - 1000 * 60 * 52),
          progress: 100,
          risk: "medium",
          tasks: completedTasks as unknown as Record<string, unknown>[],
          approvals: 1,
          retries: 0,
          rollbacks: 0,
          mttrSeconds: 0,
          endToEndLatencyMs: 612000,
        },
        {
          id: "run-seed-approval",
          scenarioId: "ambiguous",
          scenarioName: "Add enterprise analytics",
          status: "awaiting_approval",
          startedAt: new Date(Date.now() - 1000 * 60 * 11),
          updatedAt: new Date(Date.now() - 1000 * 60 * 7),
          progress: 46,
          risk: "high",
          tasks: approvalTasks as unknown as Record<string, unknown>[],
          approvals: 0,
          retries: 0,
          rollbacks: 0,
          mttrSeconds: 0,
          endToEndLatencyMs: 0,
        },
      ])
      .onConflictDoNothing();

    const [click] = await tx.select().from(urlClicksTable).limit(1);
    if (!click) {
      const clickRows = seedUrls.flatMap((url, urlIndex) =>
        Array.from({ length: url.clicks }, (_, clickIndex) => ({
          id: `seed-click-${urlIndex}-${clickIndex}`,
          slug: url.slug,
          clickedAt: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * (clickIndex % 7),
          ),
          referrer:
            clickIndex % 3 === 0
              ? "Direct"
              : clickIndex % 3 === 1
                ? "Search"
                : "Internal",
          country: "Unknown",
          visitorHash: `seed-visitor-${urlIndex}-${clickIndex % 8}`,
        })),
      );
      await tx.insert(urlClicksTable).values(clickRows).onConflictDoNothing();
    }

    const [audit] = await tx.select().from(auditEventsTable).limit(1);
    if (!audit) {
      await appendAudit(tx, {
        id: "evt-seed-deploy",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        actor: "Release agent",
        action: "RUN_COMPLETED",
        target: "run-seed-completed",
        severity: "success",
        detail:
          "Greenfield delivery passed security, tests, and exit validation.",
      });
      await appendAudit(tx, {
        id: "evt-seed-replan",
        timestamp: new Date(Date.now() - 1000 * 60 * 7),
        actor: "Requirements agent",
        action: "REPLAN_COMPLETED",
        target: "run-seed-approval",
        severity: "warning",
        detail:
          "Retention ambiguity inserted a privacy decision gate and invalidated downstream analytics work.",
      });
    }
  });
  return initialization;
}

export async function getDashboard() {
  await ensureProductionState();
  const [runs, urls, activity, clicks] = await Promise.all([
    listRuns(),
    listUrls(),
    listAudit(),
    db.select({ clickedAt: urlClicksTable.clickedAt }).from(urlClicksTable),
  ]);
  const completed = runs.filter((run) => run.status === "completed");
  const terminal = runs.filter((run) =>
    ["completed", "failed", "stopped"].includes(run.status),
  );
  const today = new Date().toISOString().slice(0, 10);

  return {
    activeRuns: runs.filter((run) =>
      ["running", "awaiting_approval"].includes(run.status),
    ).length,
    urlsCreated: urls.length,
    clicksToday: clicks.filter(
      (click) => click.clickedAt.toISOString().slice(0, 10) === today,
    ).length,
    reliability: terminal.length ? completed.length / terminal.length : 1,
    pendingApprovals: runs.filter(
      (run) => run.status === "awaiting_approval",
    ).length,
    recentActivity: activity.slice(0, 5),
  };
}

export async function listScenarios() {
  return scenarios;
}

export async function listRuns() {
  await ensureProductionState();
  const rows = await db
    .select()
    .from(orchestrationRunsTable)
    .orderBy(desc(orchestrationRunsTable.updatedAt));
  return rows.map(runFromRow);
}

export async function getRun(runId: string) {
  await ensureProductionState();
  const [row] = await db
    .select()
    .from(orchestrationRunsTable)
    .where(eq(orchestrationRunsTable.id, runId));
  return row ? runFromRow(row) : undefined;
}

export async function startScenario(scenarioId: string, actor = "Operator") {
  await ensureProductionState();
  const scenario = scenarios.find((candidate) => candidate.id === scenarioId);
  if (!scenario) return undefined;

  const run: OrchestrationRun = {
    id: `run-${randomUUID()}`,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    status: "awaiting_approval",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: 46,
    risk: scenario.riskLevel,
    tasks: buildTasks("approval"),
    approvals: 0,
    retries: 0,
    rollbacks: 0,
    mttrSeconds: 0,
    endToEndLatencyMs: 0,
  };

  await db.transaction(async (tx) => {
    await tx.insert(orchestrationRunsTable).values({
      id: run.id,
      scenarioId: run.scenarioId,
      scenarioName: run.scenarioName,
      status: run.status,
      startedAt: new Date(run.startedAt),
      updatedAt: new Date(run.updatedAt),
      progress: run.progress,
      risk: run.risk,
      tasks: run.tasks as unknown as Record<string, unknown>[],
      approvals: run.approvals,
      retries: run.retries,
      rollbacks: run.rollbacks,
      mttrSeconds: run.mttrSeconds,
      endToEndLatencyMs: run.endToEndLatencyMs,
    });
    await appendAudit(tx, {
      actor,
      action: "RUN_STARTED",
      target: run.id,
      severity: "info",
      detail: `${scenario.name} decomposed into ${scenario.taskCount} governed tasks.`,
    });
    if (scenario.kind === "ambiguous") {
      await appendAudit(tx, {
        actor: "Requirements agent",
        action: "REPLAN_COMPLETED",
        target: run.id,
        severity: "warning",
        detail:
          "Privacy assumptions changed; analytics work was invalidated and a retention approval gate was inserted.",
      });
    }
  });

  return run;
}

async function lockedRun(
  tx: Transaction,
  runId: string,
): Promise<typeof orchestrationRunsTable.$inferSelect | undefined> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${`run:${runId}`}))`,
  );
  const [row] = await tx
    .select()
    .from(orchestrationRunsTable)
    .where(eq(orchestrationRunsTable.id, runId));
  return row;
}

export async function approveRun(runId: string, actor = "Human approver") {
  await ensureProductionState();
  return db.transaction(async (tx) => {
    const row = await lockedRun(tx, runId);
    if (!row) return undefined;
    if (row.status !== "awaiting_approval") return runFromRow(row);

    const now = new Date();
    const [updated] = await tx
      .update(orchestrationRunsTable)
      .set({
        status: "completed",
        updatedAt: now,
        progress: 100,
        tasks: buildTasks("completed") as unknown as Record<string, unknown>[],
        approvals: row.approvals + 1,
        endToEndLatencyMs: Math.max(
          1,
          now.getTime() - row.startedAt.getTime(),
        ),
        version: row.version + 1,
      })
      .where(
        and(
          eq(orchestrationRunsTable.id, runId),
          eq(orchestrationRunsTable.version, row.version),
        ),
      )
      .returning();
    if (!updated) throw new Error("Concurrent run update rejected");

    await appendAudit(tx, {
      actor,
      action: "APPROVAL_GRANTED",
      target: runId,
      severity: "success",
      detail:
        "Approval gate passed; API and test work synchronized through security and exit gates.",
    });
    return runFromRow(updated);
  });
}

export async function retryRun(runId: string, actor = "Operator") {
  await ensureProductionState();
  return db.transaction(async (tx) => {
    const row = await lockedRun(tx, runId);
    if (!row) return undefined;
    if (row.retries >= RETRY_LIMIT) {
      const tasks = (row.tasks as unknown as OrchestrationTask[]).map((task) =>
        ["queued", "awaiting_approval", "running"].includes(task.status)
          ? { ...task, status: "blocked" as const }
          : task,
      );
      const [stopped] = await tx
        .update(orchestrationRunsTable)
        .set({
          status: "stopped",
          updatedAt: new Date(),
          tasks: tasks as unknown as Record<string, unknown>[],
          version: row.version + 1,
        })
        .where(eq(orchestrationRunsTable.id, runId))
        .returning();
      await appendAudit(tx, {
        actor: "Fallback policy",
        action: "RETRY_BUDGET_EXHAUSTED",
        target: runId,
        severity: "critical",
        detail:
          "Two retries were consumed. The run entered safe-stop for human review.",
      });
      return runFromRow(stopped);
    }

    const retries = row.retries + 1;
    const [updated] = await tx
      .update(orchestrationRunsTable)
      .set({
        status: "running",
        updatedAt: new Date(),
        retries,
        mttrSeconds: Math.max(1, 22 + retries * 8),
        version: row.version + 1,
      })
      .where(eq(orchestrationRunsTable.id, runId))
      .returning();
    await appendAudit(tx, {
      actor,
      action: "BOUNDED_RETRY_STARTED",
      target: runId,
      severity: "warning",
      detail: `Retry ${retries} of ${RETRY_LIMIT} started; safe-stop is the fallback after budget exhaustion.`,
    });
    return runFromRow(updated);
  });
}

export async function rollbackRun(runId: string, actor = "Release agent") {
  await ensureProductionState();
  return db.transaction(async (tx) => {
    const row = await lockedRun(tx, runId);
    if (!row) return undefined;
    const tasks = (row.tasks as unknown as OrchestrationTask[]).map((task) => {
      if (["api", "tests", "security", "release", "exit"].includes(task.id)) {
        return {
          ...task,
          status: "rolled_back" as const,
          attempts: 0,
          durationMs: 0,
        };
      }
      return task;
    });
    const [updated] = await tx
      .update(orchestrationRunsTable)
      .set({
        status: "rolled_back",
        updatedAt: new Date(),
        progress: 34,
        tasks: tasks as unknown as Record<string, unknown>[],
        rollbacks: row.rollbacks + 1,
        mttrSeconds: 38,
        version: row.version + 1,
      })
      .where(eq(orchestrationRunsTable.id, runId))
      .returning();
    await appendAudit(tx, {
      actor,
      action: "ROLLBACK_COMPLETED",
      target: runId,
      severity: "warning",
      detail:
        "Restored the last approved checkpoint and invalidated dependent outputs.",
    });
    return runFromRow(updated);
  });
}

export async function stopRun(runId: string, actor = "Human operator") {
  await ensureProductionState();
  return db.transaction(async (tx) => {
    const row = await lockedRun(tx, runId);
    if (!row) return undefined;
    const tasks = (row.tasks as unknown as OrchestrationTask[]).map((task) =>
      ["queued", "awaiting_approval", "running"].includes(task.status)
        ? { ...task, status: "blocked" as const }
        : task,
    );
    const [updated] = await tx
      .update(orchestrationRunsTable)
      .set({
        status: "stopped",
        updatedAt: new Date(),
        tasks: tasks as unknown as Record<string, unknown>[],
        version: row.version + 1,
      })
      .where(eq(orchestrationRunsTable.id, runId))
      .returning();
    await appendAudit(tx, {
      actor,
      action: "SAFE_STOP_ACTIVATED",
      target: runId,
      severity: "critical",
      detail:
        "Unfinished work was blocked while approved outputs and decision lineage were preserved.",
    });
    return runFromRow(updated);
  });
}

export async function listUrls() {
  await ensureProductionState();
  const rows = await db
    .select()
    .from(shortUrlsTable)
    .orderBy(desc(shortUrlsTable.createdAt));
  return rows.map(urlFromRow);
}

export async function getUrl(slug: string) {
  await ensureProductionState();
  const [row] = await db
    .select()
    .from(shortUrlsTable)
    .where(eq(shortUrlsTable.slug, slug));
  return row ? urlFromRow(row) : undefined;
}

export async function createUrl(input: {
  destination: string;
  slug?: string;
  tags?: string[];
  owner?: string;
}) {
  await ensureProductionState();
  const requested = input.slug ? normalizeCustomSlug(input.slug) : "";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug =
      requested ||
      `go-${randomBytes(5 + attempt).toString("base64url").toLowerCase()}`;
    const [created] = await db
      .insert(shortUrlsTable)
      .values({
        slug,
        destination: input.destination,
        clicks: 0,
        status: "active",
        owner: input.owner ?? "operator",
        tags: (input.tags ?? []).slice(0, 10),
      })
      .onConflictDoNothing()
      .returning();
    if (!created) {
      if (requested) throw new Error("Slug already exists");
      continue;
    }
    await db.transaction(async (tx) => {
      await appendAudit(tx, {
        actor: input.owner ?? "operator",
        action: "URL_CREATED",
        target: slug,
        severity: "success",
        detail: `Created a governed redirect to ${new URL(input.destination).origin}.`,
      });
    });
    return urlFromRow(created);
  }
  throw new Error("Unable to allocate a unique slug");
}

export async function deactivateUrl(slug: string, actor = "Operator") {
  await ensureProductionState();
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(shortUrlsTable)
      .where(eq(shortUrlsTable.slug, slug));
    if (!existing) return undefined;
    if (existing.status === "paused") return urlFromRow(existing);
    const [updated] = await tx
      .update(shortUrlsTable)
      .set({ status: "paused" })
      .where(eq(shortUrlsTable.slug, slug))
      .returning();
    await appendAudit(tx, {
      actor,
      action: "URL_PAUSED",
      target: slug,
      severity: "warning",
      detail:
        "Redirect routing was disabled without deleting its history or analytics.",
    });
    return urlFromRow(updated);
  });
}

function normalizeReferrer(value?: string) {
  if (!value) return "Direct";
  try {
    return new URL(value).hostname.slice(0, 120);
  } catch {
    return "Unknown";
  }
}

export async function registerClick(
  slug: string,
  metadata: {
    ip?: string;
    userAgent?: string;
    referrer?: string;
    country?: string;
  } = {},
) {
  await ensureProductionState();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`url:${slug}`}))`,
    );
    const [existing] = await tx
      .select()
      .from(shortUrlsTable)
      .where(eq(shortUrlsTable.slug, slug));
    if (!existing || existing.status !== "active") return undefined;

    const visitorHash = createHash("sha256")
      .update(
        [
          process.env.SESSION_SECRET ?? "development-only",
          metadata.ip ?? "unknown",
          metadata.userAgent ?? "unknown",
        ].join("|"),
      )
      .digest("hex");
    await tx.insert(urlClicksTable).values({
      id: `click-${randomUUID()}`,
      slug,
      referrer: normalizeReferrer(metadata.referrer),
      country: (metadata.country ?? "Unknown").slice(0, 64),
      visitorHash,
    });
    await tx
      .update(shortUrlsTable)
      .set({ clicks: sql`${shortUrlsTable.clicks} + 1` })
      .where(eq(shortUrlsTable.slug, slug));
    return existing.destination;
  });
}

export async function getAnalytics(slug: string) {
  await ensureProductionState();
  const [url] = await db
    .select()
    .from(shortUrlsTable)
    .where(eq(shortUrlsTable.slug, slug));
  if (!url) return undefined;
  const clicks = await db
    .select()
    .from(urlClicksTable)
    .where(eq(urlClicksTable.slug, slug));

  const totalClicks = clicks.length;
  const uniqueVisitors = new Set(clicks.map((click) => click.visitorHash)).size;
  const daily = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (6 - offset));
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      clicks: clicks.filter(
        (click) => click.clickedAt.toISOString().slice(0, 10) === key,
      ).length,
    };
  });
  const group = (values: string[]) =>
    Object.entries(
      values.reduce<Record<string, number>>((result, value) => {
        result[value] = (result[value] ?? 0) + 1;
        return result;
      }, {}),
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

  return {
    slug,
    totalClicks,
    uniqueVisitors,
    clickThroughRate:
      totalClicks === 0
        ? 0
        : Number(((totalClicks / (totalClicks + 100)) * 100).toFixed(1)),
    dailyClicks: daily.map((entry) => ({
      day: entry.date,
      clicks: entry.clicks,
    })),
    topReferrers: group(clicks.map((click) => click.referrer)).map(
      (entry) => ({
        source: entry.name,
        clicks: entry.count,
      }),
    ),
  };
}

export async function listAudit() {
  await ensureProductionState();
  const rows = await db
    .select()
    .from(auditEventsTable)
    .orderBy(desc(auditEventsTable.timestamp))
    .limit(500);
  return rows.map(auditFromRow);
}

export async function recordRejectedUrl(detail: string, actor = "Policy guard") {
  await ensureProductionState();
  await db.transaction(async (tx) => {
    await appendAudit(tx, {
      actor,
      action: "UNSAFE_REDIRECT_REJECTED",
      target: "url-input",
      severity: "warning",
      detail,
    });
  });
}

export async function recordAgentPlanCreated(
  planId: string,
  scenarioId: string,
  actor: string,
) {
  await ensureProductionState();
  await db.transaction(async (tx) => {
    await appendAudit(tx, {
      actor,
      action: "AI_PLAN_GENERATED",
      target: planId,
      severity: "info",
      detail: `An AI engineering plan for ${scenarioId} was persisted for human review; no execution was authorized.`,
    });
  });
}

export async function verifyAuditChain() {
  await ensureProductionState();
  const rows = await db
    .select()
    .from(auditEventsTable)
    .orderBy(auditEventsTable.timestamp);
  let previousHash: string | null = null;
  for (const row of rows) {
    if (row.previousHash !== previousHash) return false;
    const expected: string = createHash("sha256")
      .update(
        canonicalAuditValue({
          id: row.id,
          timestamp: row.timestamp,
          actor: row.actor,
          action: row.action,
          target: row.target,
          severity: row.severity,
          detail: row.detail,
          previousHash,
        }),
      )
      .digest("hex");
    if (expected !== row.eventHash) return false;
    previousHash = row.eventHash;
  }
  return true;
}

export async function getReadiness() {
  await ensureProductionState();
  const readiness = await pool.query<{ value: number }>("SELECT 1 AS value");
  const [{ value }] = readiness.rows;
  return {
    database: Number(value) === 1,
    auditChain: await verifyAuditChain(),
  };
}