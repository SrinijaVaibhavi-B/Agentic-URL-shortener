import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shortUrlsTable = pgTable(
  "short_urls",
  {
    slug: text("slug").primaryKey(),
    destination: text("destination").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    clicks: integer("clicks").notNull().default(0),
    status: text("status").notNull().default("active"),
    owner: text("owner").notNull(),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
  },
  (table) => [
    index("short_urls_created_at_idx").on(table.createdAt),
    index("short_urls_status_idx").on(table.status),
  ],
);

export const urlClicksTable = pgTable(
  "url_clicks",
  {
    id: text("id").primaryKey(),
    slug: text("slug")
      .notNull()
      .references(() => shortUrlsTable.slug, { onDelete: "cascade" }),
    clickedAt: timestamp("clicked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    referrer: text("referrer").notNull().default("Direct"),
    country: text("country").notNull().default("Unknown"),
    visitorHash: text("visitor_hash").notNull(),
  },
  (table) => [
    index("url_clicks_slug_clicked_at_idx").on(table.slug, table.clickedAt),
    index("url_clicks_visitor_hash_idx").on(table.visitorHash),
  ],
);

export const orchestrationRunsTable = pgTable(
  "orchestration_runs",
  {
    id: text("id").primaryKey(),
    scenarioId: text("scenario_id").notNull(),
    scenarioName: text("scenario_name").notNull(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    progress: integer("progress").notNull(),
    risk: text("risk").notNull(),
    tasks: jsonb("tasks").$type<Record<string, unknown>[]>().notNull(),
    approvals: integer("approvals").notNull().default(0),
    retries: integer("retries").notNull().default(0),
    rollbacks: integer("rollbacks").notNull().default(0),
    mttrSeconds: integer("mttr_seconds").notNull().default(0),
    endToEndLatencyMs: integer("end_to_end_latency_ms").notNull().default(0),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    index("orchestration_runs_updated_at_idx").on(table.updatedAt),
    index("orchestration_runs_status_idx").on(table.status),
  ],
);

export const agentPlansTable = pgTable(
  "agent_plans",
  {
    id: text("id").primaryKey(),
    scenarioId: text("scenario_id").notNull(),
    actorId: text("actor_id").notNull(),
    changeRequest: text("change_request"),
    normalizedRequirements: jsonb("normalized_requirements")
      .$type<string[]>()
      .notNull(),
    assumptions: jsonb("assumptions").$type<string[]>().notNull(),
    risks: jsonb("risks").$type<string[]>().notNull(),
    tasks: jsonb("tasks").$type<Record<string, unknown>[]>().notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("agent_plans_scenario_created_idx").on(
      table.scenarioId,
      table.createdAt,
    ),
    index("agent_plans_actor_created_idx").on(table.actorId, table.createdAt),
  ],
);

export const auditEventsTable = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    target: text("target").notNull(),
    severity: text("severity").notNull(),
    detail: text("detail").notNull(),
    previousHash: text("previous_hash"),
    eventHash: text("event_hash").notNull(),
  },
  (table) => [
    index("audit_events_timestamp_idx").on(table.timestamp),
    index("audit_events_target_idx").on(table.target),
  ],
);

export const insertShortUrlSchema = createInsertSchema(shortUrlsTable);
export const insertUrlClickSchema = createInsertSchema(urlClicksTable);
export const insertOrchestrationRunSchema =
  createInsertSchema(orchestrationRunsTable);
export const insertAgentPlanSchema = createInsertSchema(agentPlansTable);
export const insertAuditEventSchema = createInsertSchema(auditEventsTable);

export type InsertShortUrl = z.infer<typeof insertShortUrlSchema>;
export type ShortUrlRow = typeof shortUrlsTable.$inferSelect;
export type InsertUrlClick = z.infer<typeof insertUrlClickSchema>;
export type UrlClickRow = typeof urlClicksTable.$inferSelect;
export type InsertOrchestrationRun = z.infer<
  typeof insertOrchestrationRunSchema
>;
export type OrchestrationRunRow = typeof orchestrationRunsTable.$inferSelect;
export type InsertAgentPlan = z.infer<typeof insertAgentPlanSchema>;
export type AgentPlanRow = typeof agentPlansTable.$inferSelect;
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type AuditEventRow = typeof auditEventsTable.$inferSelect;