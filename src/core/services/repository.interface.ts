import type { RfmFeatureSet } from "@/core/domain/ingestion.schema";
import type { PaywallVariant, WorkspaceOverrideRules } from "@/core/domain/database.types";

export type ReaderFeaturesRecord = {
  readerToken: string;
  frequency: number;
  recency: number;
  engagement: number;
  velocity: number;
  hasSubscribed: 0 | 1;
  subscribedAt: Date | null;
};

export type WorkspaceRecord = {
  id: string;
  slug: string;
  overrideRules: WorkspaceOverrideRules | null;
};

export type ConversionLogRecord = {
  id: string;
  readerToken: string;
  variant: PaywallVariant;
  probabilityScore: number;
  eventTimestamp: Date;
};

export type ReaderStatsRecord = {
  totalReaders: number;
  convertedReaders: number;
};

export type VariantAggregationRecord = {
  variant: PaywallVariant;
  readerCount: number;
  avgScore: number;
};

export interface ReaderFeaturesRepositoryPort {
  upsertMany(
    workspaceId: string,
    records: ReaderFeaturesRecord[],
  ): Promise<number>;
  findByReaderToken(
    workspaceId: string,
    readerToken: string,
  ): Promise<ReaderFeaturesRecord | null>;
  setSubscriptionState(
    workspaceId: string,
    readerToken: string,
    hasSubscribed: 0 | 1,
  ): Promise<void>;
  getReaderStats(workspaceId: string): Promise<ReaderStatsRecord>;
}

export interface WorkspaceOverridePort {
  saveOverrideRules(
    workspaceId: string,
    rules: WorkspaceOverrideRules,
  ): Promise<void>;
}

export interface WorkspaceRepositoryPort {
  findBySlug(slug: string): Promise<WorkspaceRecord | null>;
  findById(id: string): Promise<WorkspaceRecord | null>;
}

export interface ConversionLogRepositoryPort {
  findByWorkspace(
    workspaceId: string,
  ): Promise<ConversionLogRecord[]>;
  countByWorkspace(workspaceId: string): Promise<number>;
  aggregateByVariant(
    workspaceId: string,
  ): Promise<VariantAggregationRecord[]>;
  logConversion(
    workspaceId: string,
    readerToken: string,
    variant: PaywallVariant,
    probabilityScore: number,
  ): Promise<void>;
}

export type HistoricalAnalyticsPorts = {
  readerFeaturesRepository: ReaderFeaturesRepositoryPort;
  workspaceOverrideRepository: WorkspaceOverridePort;
  classifier: ClassifierPortLike;
};

export type ClassifierPortLike = {
  trainModel(
    rows: { features: readonly number[]; label: 0 | 1 }[],
  ): Promise<{
    weights: number[];
    intercept: number;
    mean: number[];
    scale: number[];
    sampleSize: number;
    trainedAt: string;
  }>;
};

export type ProcessHistoricalAnalyticsInput = {
  workspaceId: string;
  rfmSets: RfmFeatureSet[];
};

export type ProcessHistoricalAnalyticsResult = {
  rowsProcessed: number;
  model: WorkspaceOverrideRules;
};
