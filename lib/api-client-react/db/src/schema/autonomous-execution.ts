import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agentPlansTable } from "./control-room";

export const planRevisionsTable = pgTable(
  "plan_revisions",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id").notNull().references(() => agentPlansTable.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    request: text("request").notNull(),
    normalizedRequirements: jsonb("normalized_requirements").$type<string[]>().notNull(),
    assumptions: jsonb("assumptions").$type<string[]>().notNull(),
    risks: jsonb("risks").$type<string[]>().notNull(),
    tasks: jsonb("tasks").$type<Record<string, unknown>[]>().notNull(),
    scopeHash: text("scope_hash").notNull(),
    highRisk: boolean("high_risk").notNull().default(false),
    feedback: text("feedback"),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("plan_revisions_plan_revision_uidx").on(table.planId, table.revision),
    index("plan_revisions_plan_created_idx").on(table.planId, table.createdAt),
  ],
);

export const executionRunsTable = pgTable(
  "execution_runs",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id").notNull().references(() => agentPlansTable.id),
    revisionId: text("revision_id").notNull().references(() => planRevisionsTable.id),
    approvalId: text("approval_id").references(() => executionApprovalsTable.id),
    previousRunId: text("previous_run_id"),
    actorId: text("actor_id").notNull(),
    status: text("status").notNull(),
    scopeHash: text("scope_hash").notNull(),
    baseCommit: text("base_commit"),
    repositoryRoot: text("repository_root"),
    attempt: integer("attempt").notNull().default(0),
    stopRequested: boolean("stop_requested").notNull().default(false),
    leaseOwner: text("lease_owner"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("execution_runs_status_lease_idx").on(table.status, table.leaseExpiresAt),
    index("execution_runs_plan_idx").on(table.planId),
    uniqueIndex("execution_runs_approval_uidx").on(table.approvalId),
  ],
);

export const executionEventsTable = pgTable(
  "execution_events",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull().references(() => executionRunsTable.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    type: text("type").notNull(),
    level: text("level").notNull().default("info"),
    message: text("message").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("execution_events_run_sequence_uidx").on(table.runId, table.sequence),
  ],
);

export const executionArtifactsTable = pgTable(
  "execution_artifacts",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull().references(() => executionRunsTable.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("execution_artifacts_run_kind_idx").on(table.runId, table.kind)],
);

export const executionApprovalsTable = pgTable(
  "execution_approvals",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id").notNull().references(() => agentPlansTable.id, { onDelete: "cascade" }),
    revisionId: text("revision_id").notNull().references(() => planRevisionsTable.id),
    actorId: text("actor_id").notNull(),
    decision: text("decision").notNull(),
    scopeHash: text("scope_hash").notNull(),
    feedback: text("feedback"),
    highRiskApproved: boolean("high_risk_approved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("execution_approvals_plan_created_idx").on(table.planId, table.createdAt),
    uniqueIndex("execution_approvals_revision_uidx").on(table.revisionId),
  ],
);

export const insertPlanRevisionSchema = createInsertSchema(planRevisionsTable);
export const insertExecutionRunSchema = createInsertSchema(executionRunsTable);
export const insertExecutionEventSchema = createInsertSchema(executionEventsTable);
export const insertExecutionArtifactSchema = createInsertSchema(executionArtifactsTable);
export const insertExecutionApprovalSchema = createInsertSchema(executionApprovalsTable);
export type PlanRevisionRow = typeof planRevisionsTable.$inferSelect;
export type ExecutionRunRow = typeof executionRunsTable.$inferSelect;
export type ExecutionEventRow = typeof executionEventsTable.$inferSelect;
export type ExecutionArtifactRow = typeof executionArtifactsTable.$inferSelect;
export type ExecutionApprovalRow = typeof executionApprovalsTable.$inferSelect;
export type InsertPlanRevision = z.infer<typeof insertPlanRevisionSchema>;