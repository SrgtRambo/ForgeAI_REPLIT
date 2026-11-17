import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType({ dataType: () => "bytea" });

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  companyName: text("company_name").notNull().default(""),
  ...timestamps,
});

export const forgeProjects = pgTable(
  "forge_projects",
  {
    userId: text("user_id").notNull(),
    projectId: text("project_id").notNull(),
    name: text("name").notNull().default("Untitled project"),
    stage: text("stage").notNull().default(""),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.projectId] }),
    index("forge_projects_user_updated_idx").on(table.userId, table.updatedAt),
    check("forge_projects_id_len", sql`char_length(${table.projectId}) between 1 and 120`),
    check("forge_projects_size", sql`pg_column_size(${table.data}) < 8000000`),
  ],
);

export const aiRequests = pgTable(
  "ai_requests",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ai_requests_user_time_idx").on(table.userId, table.createdAt)],
);

export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    tier: text("tier").notNull(),
    prompt: text("prompt").notNull(),
    amountCents: integer("amount_cents").notNull().default(0),
    status: text("status").notNull().default("pending"),
    progress: integer("progress").notNull().default(0),
    progressMessage: text("progress_message"),
    stripeSessionId: text("stripe_session_id"),
    projectName: text("project_name"),
    fileCount: integer("file_count"),
    error: text("error"),
    licenseKey: uuid("license_key").defaultRandom().notNull(),
    archive: bytea("archive"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("purchases_stripe_session_idx").on(table.stripeSessionId),
    index("purchases_user_created_idx").on(table.userId, table.createdAt),
    index("purchases_status_idx").on(table.status),
    check("purchases_tier_check", sql`${table.tier} in ('standard', 'pro')`),
    check("purchases_amount_check", sql`${table.amountCents} >= 0`),
    check("purchases_progress_check", sql`${table.progress} between 0 and 100`),
    check(
      "purchases_status_check",
      sql`${table.status} in ('pending', 'queued', 'processing', 'ready', 'failed', 'cancelled')`,
    ),
    check(
      "purchases_type_check",
      sql`${table.type} in ('website', 'restaurant', 'services', 'saas', 'social', 'spreadsheet', 'software')`,
    ),
  ],
);
