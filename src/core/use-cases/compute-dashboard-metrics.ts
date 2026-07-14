import type { PaywallVariant } from "@/core/domain/database.types";
import type {
  DashboardData,
  DashboardMetrics,
  RevenueConfig,
  SegmentRow,
  WorkerConfigParams,
} from "@/core/domain/dashboard.types";
import {
  DefaultRevenueConfig,
  emptyDashboardMetrics,
} from "@/core/domain/dashboard.types";
import type {
  ConversionLogRepositoryPort,
  ReaderFeaturesRepositoryPort,
  WorkspaceRepositoryPort,
  VariantAggregationRecord,
  ReaderStatsRecord,
  ConversionLogRecord,
} from "@/core/services/repository.interface";

type ComputeDashboardMetricsDeps = {
  workspaceRepository: WorkspaceRepositoryPort;
  conversionLogRepository: ConversionLogRepositoryPort;
  readerFeaturesRepository: ReaderFeaturesRepositoryPort;
};

type ComputeDashboardMetricsParams = {
  workspaceSlug: string;
  originUrl: string;
  revenueConfig?: RevenueConfig;
};

const BASELINE_CONVERSION_RATE = 0.02;
const VARIANT_ORDER: PaywallVariant[] = ["open", "lock"];
const EDGE_SCORE_ENDPOINT = "/api/v1/edge-score";
const COOKIE_NAME = "reader_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const UNTRAINED_LOCK_THRESHOLD = 1.0;

function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function computeConversionLift(
  liveRate: number,
  baselineRate: number,
): number {
  if (baselineRate === 0) return 0;
  return ((liveRate - baselineRate) / baselineRate) * 100;
}

function computeSegmentRows(
  aggregations: VariantAggregationRecord[],
  conversionLogs: ConversionLogRecord[],
  readerStats: ReaderStatsRecord,
  revenueConfig: RevenueConfig,
): SegmentRow[] {
  const totalEvents = conversionLogs.length;

  const convertedByVariant = new Map<PaywallVariant, number>();
  for (const log of conversionLogs) {
    const existing = convertedByVariant.get(log.variant) ?? 0;
    convertedByVariant.set(log.variant, existing + (log.probabilityScore > 0.5 ? 1 : 0));
  }

  const rows: SegmentRow[] = VARIANT_ORDER.map((variant) => {
    const aggregation = aggregations.find((a) => a.variant === variant);
    const readerCount = aggregation?.readerCount ?? 0;
    const avgScore = aggregation?.avgScore ?? 0;
    const converted = convertedByVariant.get(variant) ?? 0;
    const conversionRate = safeDivide(converted, readerCount) * 100;
    const revenueContribution = converted * revenueConfig.subscriptionPrice;
    const percentageOfTotal = safeDivide(readerCount, readerStats.totalReaders) * 100;

    return {
      variant,
      readerCount,
      conversionRate,
      avgPropensityScore: avgScore,
      revenueContribution,
      percentageOfTotal,
    };
  });

  return rows;
}

function computeMetrics(
  readerStats: ReaderStatsRecord,
  conversionLogs: ConversionLogRecord[],
  revenueConfig: RevenueConfig,
): DashboardMetrics {
  const totalReaders = readerStats.totalReaders;
  const convertedReaders = readerStats.convertedReaders;
  const liveConversionRate = safeDivide(convertedReaders, totalReaders);
  const baselineConversionRate = BASELINE_CONVERSION_RATE;
  const conversionLift = computeConversionLift(
    liveConversionRate,
    baselineConversionRate,
  );

  const totalRevenue = convertedReaders * revenueConfig.subscriptionPrice;
  const totalCosts = revenueConfig.monthlyInfrastructureCost;
  const netProfit = totalRevenue - totalCosts;

  const totalEvents = conversionLogs.length;
  const avgPropensityScore =
    totalEvents > 0
      ? conversionLogs.reduce((sum, log) => sum + log.probabilityScore, 0) /
        totalEvents
      : 0;

  return {
    conversionLift,
    totalRevenue,
    totalCosts,
    netProfit,
    totalReaders,
    convertedReaders,
    baselineConversionRate,
    liveConversionRate,
    totalEvents,
    avgPropensityScore,
  };
}

function buildWorkerConfig(
  workspaceSlug: string,
  originUrl: string,
  overrideRules: { lockThreshold: number } | null,
): WorkerConfigParams {
  return {
    workspaceSlug,
    originUrl,
    edgeScoreEndpoint: EDGE_SCORE_ENDPOINT,
    lockThreshold: overrideRules?.lockThreshold ?? UNTRAINED_LOCK_THRESHOLD,
    cookieName: COOKIE_NAME,
    cookieMaxAgeSeconds: COOKIE_MAX_AGE,
  };
}

export function buildComputeDashboardMetrics(deps: ComputeDashboardMetricsDeps) {
  return async function computeDashboardMetrics(
    params: ComputeDashboardMetricsParams,
  ): Promise<DashboardData> {
    const workspace = await deps.workspaceRepository.findBySlug(
      params.workspaceSlug,
    );

    if (!workspace) {
      return {
        metrics: emptyDashboardMetrics(),
        segments: [],
        workerConfig: buildWorkerConfig("unknown", params.originUrl, null),
        workerScript: "",
      };
    }

    const revenueConfig = params.revenueConfig ?? DefaultRevenueConfig;

    const [readerStats, conversionLogs, aggregations] = await Promise.all([
      deps.readerFeaturesRepository.getReaderStats(workspace.id),
      deps.conversionLogRepository.findByWorkspace(workspace.id),
      deps.conversionLogRepository.aggregateByVariant(workspace.id),
    ]);

    const metrics = computeMetrics(readerStats, conversionLogs, revenueConfig);
    const segments = computeSegmentRows(
      aggregations,
      conversionLogs,
      readerStats,
      revenueConfig,
    );
    const workerConfig = buildWorkerConfig(
      workspace.slug,
      params.originUrl,
      workspace.overrideRules,
    );

    return {
      metrics,
      segments,
      workerConfig,
      workerScript: "",
    };
  };
}
