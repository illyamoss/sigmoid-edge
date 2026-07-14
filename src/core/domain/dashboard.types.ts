import type { PaywallVariant } from "@/core/domain/database.types";

export type DashboardMetrics = {
  conversionLift: number;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  totalReaders: number;
  convertedReaders: number;
  baselineConversionRate: number;
  liveConversionRate: number;
  totalEvents: number;
  avgPropensityScore: number;
};

export type SegmentRow = {
  variant: PaywallVariant;
  readerCount: number;
  conversionRate: number;
  avgPropensityScore: number;
  revenueContribution: number;
  percentageOfTotal: number;
};

export type WorkerConfigParams = {
  workspaceSlug: string;
  originUrl: string;
  edgeScoreEndpoint: string;
  lockThreshold: number;
  cookieName: string;
  cookieMaxAgeSeconds: number;
};

export type DashboardData = {
  metrics: DashboardMetrics;
  segments: SegmentRow[];
  workerConfig: WorkerConfigParams;
  workerScript: string;
};

export type RevenueConfig = {
  subscriptionPrice: number;
  monthlyInfrastructureCost: number;
};

export const DefaultRevenueConfig: RevenueConfig = {
  subscriptionPrice: 9.99,
  monthlyInfrastructureCost: 20,
};

export function emptyDashboardMetrics(): DashboardMetrics {
  return {
    conversionLift: 0,
    totalRevenue: 0,
    totalCosts: 0,
    netProfit: 0,
    totalReaders: 0,
    convertedReaders: 0,
    baselineConversionRate: 0,
    liveConversionRate: 0,
    totalEvents: 0,
    avgPropensityScore: 0,
  };
}
