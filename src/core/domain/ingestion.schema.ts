import { z } from "zod";

export const ga4BigQueryEventSchema = z.object({
  event_date: z.string().optional(),
  event_timestamp: z.coerce.number().nonnegative(),
  event_name: z.string().min(1).max(200),
  event_params: z
    .array(
      z.object({
        key: z.string(),
        value: z.object({
          string_value: z.string().optional(),
          int_value: z.coerce.number().optional(),
          float_value: z.coerce.number().optional(),
          double_value: z.coerce.number().optional(),
        }),
      }),
    )
    .optional()
    .default([]),
  event_previous_timestamp: z.coerce.number().optional(),
  event_value_in_usd: z.coerce.number().optional(),
  event_bundle_sequence_id: z.coerce.number().optional(),
  event_server_timestamp_offset: z.coerce.number().optional(),
  user_pseudo_id: z.string().min(1).max(128),
  user_id: z.string().optional(),
  user_first_touch_timestamp: z.coerce.number().optional(),
  device: z.record(z.unknown()).optional(),
  geo: z.record(z.unknown()).optional(),
  traffic_source: z.record(z.unknown()).optional(),
  ecommerce: z.record(z.unknown()).optional(),
  items: z.array(z.record(z.unknown())).optional(),
  collected_traffic_source: z.record(z.unknown()).optional(),
  privacy_info: z.record(z.unknown()).optional(),
});

export const ga4BigQueryPayloadSchema = z.array(ga4BigQueryEventSchema);

export type Ga4BigQueryEvent = z.infer<typeof ga4BigQueryEventSchema>;
export type Ga4BigQueryPayload = z.infer<typeof ga4BigQueryPayloadSchema>;

export type InternalGa4Event = {
  user_pseudo_id: string;
  event_name: string;
  event_timestamp: Date;
  engagement_time_msec: number;
};

export const stripeCustomerSchema = z.object({
  id: z.string().min(1).max(200),
  created: z.coerce.number().nonnegative(),
  metadata: z.object({
    user_pseudo_id: z.string().min(1).max(128),
  }),
});

export const stripePayloadSchema = z.array(stripeCustomerSchema);

export type StripeCustomer = z.infer<typeof stripeCustomerSchema>;
export type StripePayload = z.infer<typeof stripePayloadSchema>;

export const ingestionRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  ga4: ga4BigQueryPayloadSchema.optional(),
  stripe: stripePayloadSchema.optional(),
  stripeSource: z.enum(["api", "upload"]).optional().default("upload"),
  noGa4: z.boolean().optional().default(false),
});

export type IngestionRequest = z.infer<typeof ingestionRequestSchema>;

export type RfmFeatureSet = {
  readerToken: string;
  frequency: number;
  recency: number;
  engagement: number;
  velocity: number;
  hasSubscribed: 0 | 1;
};

export type CompiledTrainingDataset = {
  rows: RfmFeatureSet[];
  labels: (0 | 1)[];
};