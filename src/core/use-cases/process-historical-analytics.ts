import type {
  InternalGa4Event,
  RfmFeatureSet,
  StripeCustomer,
} from "@/core/domain/ingestion.schema";
import type { WorkspaceOverrideRules } from "@/core/domain/database.types";
import type {
  ReaderFeaturesRecord,
  ReaderFeaturesRepositoryPort,
  WorkspaceOverridePort,
} from "@/core/services/repository.interface";
import type {
  ClassifierInterface,
  ClassifierModel,
  ReaderFeatureVector,
  TrainingRow,
} from "@/core/services/classifier.interface";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const MILLISECONDS_PER_48_HOURS = 48 * 60 * 60 * 1000;
const PAGEVIEW_EVENT_NAME = "page_view";
const LOCK_PERCENTILE = 75;

type ProcessHistoricalAnalyticsDeps = {
  readerFeaturesRepository: ReaderFeaturesRepositoryPort;
  workspaceOverrideRepository: WorkspaceOverridePort;
  classifier: ClassifierInterface;
};

type ProcessHistoricalAnalyticsParams = {
  workspaceId: string;
  ga4Events: InternalGa4Event[];
  stripeCustomers: StripeCustomer[];
};

type ProcessHistoricalAnalyticsOutput = {
  rowsProcessed: number;
  model: WorkspaceOverrideRules;
};

function computePercentile(
  sortedValues: number[],
  percentile: number,
): number {
  if (sortedValues.length === 0) return 0;
  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    const value = sortedValues[lower];
    return value ?? 0;
  }
  const lowerValue = sortedValues[lower] ?? 0;
  const upperValue = sortedValues[upper] ?? 0;
  const fraction = index - lower;
  return lowerValue + (upperValue - lowerValue) * fraction;
}

function computeThresholds(
  scores: number[],
): { lockThreshold: number } {
  const sorted = [...scores].sort((a, b) => a - b);
  return {
    lockThreshold: computePercentile(sorted, LOCK_PERCENTILE),
  };
}

export function buildProcessHistoricalAnalytics(
  deps: ProcessHistoricalAnalyticsDeps,
) {
  return async function processHistoricalAnalytics(
    params: ProcessHistoricalAnalyticsParams,
  ): Promise<ProcessHistoricalAnalyticsOutput> {
    const subscribedPseudoIds = new Set<string>();
    const subscriptionTimestamps = new Map<string, Date>();

    for (const customer of params.stripeCustomers) {
      subscribedPseudoIds.add(customer.metadata.user_pseudo_id);
      subscriptionTimestamps.set(
        customer.metadata.user_pseudo_id,
        new Date(customer.created * 1000),
      );
    }

    const rfmSets = compileRfmFeatureSets(
      params.ga4Events,
      subscribedPseudoIds,
      subscriptionTimestamps,
    );

    const trainingRows: TrainingRow[] = rfmSets.map((set) => ({
      features: [
        set.frequency,
        set.recency,
        set.engagement,
        set.velocity,
      ],
      label: set.hasSubscribed,
    }));

    const model: ClassifierModel =
      await deps.classifier.trainModel(trainingRows);

    const allScores: number[] = trainingRows.map((row) =>
      deps.classifier.predictPropensity(
        row.features as ReaderFeatureVector,
        model,
      ),
    );

    const thresholds = computeThresholds(allScores);

    const records: ReaderFeaturesRecord[] = rfmSets.map((set) => ({
      readerToken: set.readerToken,
      frequency: set.frequency,
      recency: set.recency,
      engagement: set.engagement,
      velocity: set.velocity,
      hasSubscribed: set.hasSubscribed,
      subscribedAt:
        set.hasSubscribed === 1
          ? (subscriptionTimestamps.get(set.readerToken) ?? null)
          : null,
    }));

    const rowsProcessed =
      await deps.readerFeaturesRepository.upsertMany(
        params.workspaceId,
        records,
      );

    const overrideRules: WorkspaceOverrideRules = {
      weights: model.weights,
      intercept: model.intercept,
      mean: model.mean,
      scale: model.scale,
      lockThreshold: thresholds.lockThreshold,
      trainedAt: model.trainedAt,
      sampleSize: model.sampleSize,
    };

    await deps.workspaceOverrideRepository.saveOverrideRules(
      params.workspaceId,
      overrideRules,
    );

    return { rowsProcessed, model: overrideRules };
  };
}

function compileRfmFeatureSets(
  ga4Events: InternalGa4Event[],
  subscribedPseudoIds: Set<string>,
  subscriptionTimestamps: Map<string, Date>,
): RfmFeatureSet[] {
  const groupedEvents = new Map<string, InternalGa4Event[]>();

  for (const event of ga4Events) {
    const existing = groupedEvents.get(event.user_pseudo_id);
    if (existing) {
      existing.push(event);
    } else {
      groupedEvents.set(event.user_pseudo_id, [event]);
    }
  }

  const latestEventTimestamp = ga4Events.reduce(
    (latest: number, event: InternalGa4Event) =>
      event.event_timestamp.getTime() > latest
        ? event.event_timestamp.getTime()
        : latest,
    0,
  );

  const rfmSets: RfmFeatureSet[] = [];

  for (const [readerToken, events] of groupedEvents) {
    const frequency = events.filter(
      (event) => event.event_name === PAGEVIEW_EVENT_NAME,
    ).length;

    const engagement =
      events.reduce(
        (total: number, event: InternalGa4Event) =>
          total + event.engagement_time_msec,
        0,
      ) / Math.max(events.length, 1);

    const peakTimestamp = events.reduce(
      (peak: number, event: InternalGa4Event) =>
        event.event_timestamp.getTime() > peak
          ? event.event_timestamp.getTime()
          : peak,
      0,
    );

    const recency =
      latestEventTimestamp > 0
        ? (latestEventTimestamp - peakTimestamp) / MILLISECONDS_PER_DAY
        : 0;

    const velocityThreshold =
      latestEventTimestamp > 0
        ? latestEventTimestamp - MILLISECONDS_PER_48_HOURS
        : 0;
    const velocity = events.filter(
      (event) => event.event_timestamp.getTime() >= velocityThreshold,
    ).length;

    const hasSubscribed: 0 | 1 = subscribedPseudoIds.has(readerToken) ? 1 : 0;

    if (hasSubscribed === 1) {
      subscriptionTimestamps.get(readerToken);
    }

    rfmSets.push({
      readerToken,
      frequency: Number(frequency),
      recency: Number(recency.toFixed(4)),
      engagement: Number(engagement.toFixed(4)),
      velocity,
      hasSubscribed,
    });
  }

  return rfmSets;
}
