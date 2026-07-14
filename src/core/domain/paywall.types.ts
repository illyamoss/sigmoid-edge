import type { PaywallVariant } from "@/core/domain/database.types";

export const ReaderCookieName = "reader_token";

export type EdgeFeatureSnapshot = {
  frequency: number;
  recency: number;
  engagement: number;
  velocity: number;
};

export type EdgeScoreRequest = {
  workspaceSlug: string;
  readerToken: string | null;
};

export type EdgeScoreResponse = {
  variant: PaywallVariant;
  score: number;
  readerToken: string;
};

export type EdgeManualScoreRequest = {
  workspaceSlug: string;
  features: EdgeFeatureSnapshot;
};

export type EdgeManualScoreResponse = {
  variant: PaywallVariant;
  score: number;
};

const UNTRAINED_LOCK_THRESHOLD = 1.0;

export function resolveVariantFromScore(
  score: number,
  lockThreshold: number = UNTRAINED_LOCK_THRESHOLD,
): PaywallVariant {
  if (score >= lockThreshold) return "lock";
  return "open";
}

export function emptyFeatureSnapshot(): EdgeFeatureSnapshot {
  return { frequency: 0, recency: 0, engagement: 0, velocity: 0 };
}