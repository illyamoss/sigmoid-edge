import type { PaywallVariant, WorkspaceOverrideRules } from "@/core/domain/database.types";
import type { ReaderFeatureVector } from "@/core/services/classifier.interface";
import type { TrainingRow } from "@/core/services/classifier.interface";
import type {
  ConversionLogRecord,
  ReaderFeaturesRecord,
  ReaderStatsRecord,
  VariantAggregationRecord,
  WorkspaceRecord,
} from "@/core/services/repository.interface";
import { EdgeClassifierService } from "@/lib/integration/edge-classifier.service";

const DEMO_WORKSPACE_ID = "demo-workspace-0000-0000-0000-000000000000";
const DEMO_WORKSPACE_SLUG = "default";
const CASUAL_READER_COUNT = 400;
const CONVERTED_READER_COUNT = 100;
const TOTAL_READERS = CASUAL_READER_COUNT + CONVERTED_READER_COUNT;
const LOCK_PERCENTILE = 75;
const SEED = 42;

function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const random = createSeededRandom(SEED);

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return random() * (max - min) + min;
}

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

function generateReaderToken(index: number, isConverter: boolean): string {
  const prefix = isConverter ? "conv" : "casual";
  return `reader_${prefix}_${index.toString().padStart(4, "0")}`;
}

function generateMockReaders(): ReaderFeaturesRecord[] {
  const readers: ReaderFeaturesRecord[] = [];

  for (let i = 0; i < CASUAL_READER_COUNT; i++) {
    readers.push({
      readerToken: generateReaderToken(i, false),
      frequency: randomInt(1, 5),
      recency: randomFloat(5, 30),
      engagement: randomInt(500, 8000),
      velocity: randomInt(0, 3),
      hasSubscribed: 0,
      subscribedAt: null,
    });
  }

  for (let i = 0; i < CONVERTED_READER_COUNT; i++) {
    readers.push({
      readerToken: generateReaderToken(i, true),
      frequency: randomInt(8, 20),
      recency: randomFloat(0, 5),
      engagement: randomInt(15000, 55000),
      velocity: randomInt(5, 15),
      hasSubscribed: 1,
      subscribedAt: new Date(Date.now() - randomInt(1, 14) * 24 * 60 * 60 * 1000),
    });
  }

  return readers;
}

export const mockReaders: ReaderFeaturesRecord[] = generateMockReaders();

export const mockReaderStats: ReaderStatsRecord = {
  totalReaders: TOTAL_READERS,
  convertedReaders: CONVERTED_READER_COUNT,
};

function buildTrainingRows(): TrainingRow[] {
  return mockReaders.map((reader) => ({
    features: [
      reader.frequency,
      reader.recency,
      reader.engagement,
      reader.velocity,
    ] as unknown as ReaderFeatureVector,
    label: reader.readerToken.startsWith("reader_conv_") ? 1 : 0,
  }));
}

function trainMockModel(): WorkspaceOverrideRules {
  const classifier = new EdgeClassifierService();
  const trainingRows = buildTrainingRows();
  const model = classifier.trainModelSync(trainingRows);

  const allScores: number[] = trainingRows.map((row) =>
    classifier.predictPropensity(
      row.features as unknown as ReaderFeatureVector,
      model,
    ),
  );

  const sorted = [...allScores].sort((a, b) => a - b);
  const lockThreshold = computePercentile(sorted, LOCK_PERCENTILE);

  return {
    weights: model.weights,
    intercept: model.intercept,
    mean: model.mean,
    scale: model.scale,
    lockThreshold,
    trainedAt: model.trainedAt,
    sampleSize: model.sampleSize,
  };
}

const MOCK_OVERRIDE_RULES: WorkspaceOverrideRules = trainMockModel();

export const mockWorkspace: WorkspaceRecord = {
  id: DEMO_WORKSPACE_ID,
  slug: DEMO_WORKSPACE_SLUG,
  overrideRules: MOCK_OVERRIDE_RULES,
};

function pickVariant(
  score: number,
  lockThreshold: number,
): PaywallVariant {
  if (score >= lockThreshold) return "lock";
  return "open";
}

function generateMockConversionLogs(): ConversionLogRecord[] {
  const logs: ConversionLogRecord[] = [];
  let logIndex = 0;
  const lockThreshold = MOCK_OVERRIDE_RULES.lockThreshold;

  for (let i = 0; i < mockReaders.length; i++) {
    const reader = mockReaders[i];
    if (!reader) continue;

    const logCount = randomInt(1, 3);

    for (let j = 0; j < logCount; j++) {
      const isConverter = reader.readerToken.startsWith("reader_conv_");
      const baseScore = isConverter
        ? randomFloat(lockThreshold, 0.98)
        : randomFloat(0.01, lockThreshold - 0.01);

      const variant = pickVariant(baseScore, lockThreshold);
      const daysAgo = randomInt(0, 14);

      logs.push({
        id: `log_${logIndex.toString().padStart(5, "0")}`,
        readerToken: reader.readerToken,
        variant,
        probabilityScore: Number(baseScore.toFixed(5)),
        eventTimestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      });
      logIndex++;
    }
  }

  return logs;
}

export const mockConversionLogs: ConversionLogRecord[] = generateMockConversionLogs();

function aggregateMockByVariant(): VariantAggregationRecord[] {
  const buckets: Record<PaywallVariant, { count: number; totalScore: number }> = {
    open: { count: 0, totalScore: 0 },
    lock: { count: 0, totalScore: 0 },
  };

  for (const log of mockConversionLogs) {
    const bucket = buckets[log.variant];
    if (bucket) {
      bucket.count++;
      bucket.totalScore += log.probabilityScore;
    }
  }

  const variants: PaywallVariant[] = ["open", "lock"];
  return variants.map((variant) => {
    const bucket = buckets[variant];
    const count = bucket ? bucket.count : 0;
    const totalScore = bucket ? bucket.totalScore : 0;
    return {
      variant,
      readerCount: count,
      avgScore: count > 0 ? totalScore / count : 0,
    };
  });
}

export const mockVariantAggregations: VariantAggregationRecord[] = aggregateMockByVariant();

export { DEMO_WORKSPACE_ID, DEMO_WORKSPACE_SLUG };
