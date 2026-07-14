import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import {
  PaywallVariant,
  WorkspaceBillingStatus,
} from "@/core/domain/database.types";

export type WorkspaceOverrideRules = {
  weights: number[];
  intercept: number;
  mean: number[];
  scale: number[];
  lockThreshold: number;
  trainedAt: string;
  sampleSize: number;
};

export const workspaceBillingStatusValues = [
  WorkspaceBillingStatus.Trialing,
  WorkspaceBillingStatus.Active,
  WorkspaceBillingStatus.PastDue,
  WorkspaceBillingStatus.Canceled,
  WorkspaceBillingStatus.Paused,
] as const;

export const paywallVariantValues = [
  PaywallVariant.Open,
  PaywallVariant.Lock,
] as const;

export const workspaceBillingStatusEnum = pgEnum(
  "workspace_billing_status",
  workspaceBillingStatusValues,
);

export const paywallVariantEnum = pgEnum(
  "paywall_variant",
  paywallVariantValues,
);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  billingStatus: workspaceBillingStatusEnum("billing_status")
    .notNull()
    .default(WorkspaceBillingStatus.Trialing),
  supabaseUrl: text("supabase_url"),
  supabaseServiceRoleKey: text("supabase_service_role_key"),
  overrideRules: jsonb("override_rules").$type<WorkspaceOverrideRules>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const readersFeatures = pgTable(
  "readers_features",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    readerToken: varchar("reader_token", { length: 128 }).notNull(),
    frequency: numeric("frequency", { precision: 12, scale: 4 })
      .notNull()
      .default("0"),
    recency: numeric("recency", { precision: 12, scale: 4 })
      .notNull()
      .default("0"),
    engagement: numeric("engagement", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    velocity: numeric("velocity", { precision: 12, scale: 4 })
      .notNull()
      .default("0"),
    hasSubscribed: integer("has_subscribed").notNull().default(0),
    subscribedAt: timestamp("subscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workspaceReaderTokenIndex: unique("readers_features_workspace_token_unique")
      .on(table.workspaceId, table.readerToken),
  }),
);

export const conversionLogs = pgTable("conversion_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  readerToken: varchar("reader_token", { length: 128 }).notNull(),
  variant: paywallVariantEnum("variant").notNull(),
  probabilityScore: numeric("probability_score", { precision: 6, scale: 5 })
    .notNull()
    .default("0"),
  eventTimestamp: timestamp("event_timestamp", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WorkspaceRecord = typeof workspaces.$inferSelect;
export type WorkspaceInsertRecord = typeof workspaces.$inferInsert;
export type ReaderFeaturesRecord = typeof readersFeatures.$inferSelect;
export type ReaderFeaturesInsertRecord = typeof readersFeatures.$inferInsert;
export type ConversionLogRecord = typeof conversionLogs.$inferSelect;
export type ConversionLogInsertRecord = typeof conversionLogs.$inferInsert;

export const publisherSchema = {
  workspaces,
  readersFeatures,
  conversionLogs,
  workspaceBillingStatusEnum,
  paywallVariantEnum,
};

export type PublisherSchema = typeof publisherSchema;

export const publisherTables = {
  workspaces,
  readersFeatures,
  conversionLogs,
} as const;
