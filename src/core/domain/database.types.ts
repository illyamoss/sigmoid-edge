import { z } from "zod";

export const WorkspaceBillingStatus = {
  Trialing: "trialing",
  Active: "active",
  PastDue: "past_due",
  Canceled: "canceled",
  Paused: "paused",
} as const;

export type WorkspaceBillingStatus = (typeof WorkspaceBillingStatus)[keyof typeof WorkspaceBillingStatus];

export const PaywallVariant = {
  Open: "open",
  Newsletter: "newsletter",
  Lock: "lock",
} as const;

export type PaywallVariant = (typeof PaywallVariant)[keyof typeof PaywallVariant];

export const ReaderFeatureKey = {
  Frequency: "frequency",
  Recency: "recency",
  Engagement: "engagement",
  Velocity: "velocity",
} as const;

export type ReaderFeatureKey = (typeof ReaderFeatureKey)[keyof typeof ReaderFeatureKey];

export type WorkspacePrimitive = {
  id: string;
  name: string;
  slug: string;
  billingStatus: WorkspaceBillingStatus;
  supabaseUrl: string | null;
  supabaseServiceRoleKey: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ReaderFeaturesPrimitive = {
  id: string;
  workspaceId: string;
  readerToken: string;
  frequency: number;
  recency: number;
  engagement: number;
  velocity: number;
  converted: boolean;
  convertedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ConversionLogPrimitive = {
  id: string;
  workspaceId: string;
  readerToken: string;
  variant: PaywallVariant;
  probabilityScore: number;
  eventTimestamp: Date;
  createdAt: Date;
};

export const workspaceBillingStatusSchema = z.nativeEnum(WorkspaceBillingStatus);

export const paywallVariantSchema = z.nativeEnum(PaywallVariant);

export const readerFeatureKeySchema = z.nativeEnum(ReaderFeatureKey);

export const workspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(160).regex(/^[a-z0-9-]+$/),
  billingStatus: workspaceBillingStatusSchema,
  supabaseUrl: z.string().url().nullable(),
  supabaseServiceRoleKey: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const readerFeaturesSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  readerToken: z.string().min(8).max(128),
  frequency: z.number().nonnegative(),
  recency: z.number().nonnegative(),
  engagement: z.number().nonnegative(),
  velocity: z.number().nonnegative(),
  converted: z.boolean(),
  convertedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const conversionLogSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  readerToken: z.string().min(8).max(128),
  variant: paywallVariantSchema,
  probabilityScore: z.number().min(0).max(1),
  eventTimestamp: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export type Workspace = z.infer<typeof workspaceSchema>;
export type ReaderFeatures = z.infer<typeof readerFeaturesSchema>;
export type ConversionLog = z.infer<typeof conversionLogSchema>;

export type WorkspaceInsert = z.infer<typeof workspaceSchema>;
export type ReaderFeaturesInsert = z.infer<typeof readerFeaturesSchema>;
export type ConversionLogInsert = z.infer<typeof conversionLogSchema>;

export type WorkspaceSelect = Workspace;
export type ReaderFeaturesSelect = ReaderFeatures;
export type ConversionLogSelect = ConversionLog;
