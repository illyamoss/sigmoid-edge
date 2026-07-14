import type {
  ClassifierConfig,
  ClassifierInterface,
  ClassifierModel,
  ReaderFeatureVector,
  TrainingRow,
} from "@/core/services/classifier.interface";

const DEFAULT_CONFIG: ClassifierConfig = {
  epochs: 500,
  learningRate: 0.1,
  l2Regularization: 0.001,
};

const FEATURE_COUNT = 4;
const EMPTY_MODEL_WEIGHTS = [0, 0, 0, 0];
const EMPTY_MODEL_SCALE = [1, 1, 1, 1];

function sigmoid(value: number): number {
  if (value <= -35) return 0;
  if (value >= 35) return 1;
  return 1 / (1 + Math.exp(-value));
}

function safeAt(arr: number[], index: number): number {
  const value = arr[index];
  if (value === undefined) return 0;
  return value;
}

function safeSet(arr: number[], index: number, value: number): void {
  if (index >= 0 && index < arr.length) {
    arr[index] = value;
  }
}

function computeMean(
  rows: TrainingRow[],
  featureIndex: number,
): number {
  let total = 0;
  for (const row of rows) {
    total += row.features[featureIndex] ?? 0;
  }
  return total / (rows.length || 1);
}

function computeStandardDeviation(
  rows: TrainingRow[],
  featureIndex: number,
  mean: number,
): number {
  let sumSquaredDelta = 0;
  for (const row of rows) {
    const featureValue = row.features[featureIndex] ?? 0;
    const delta = featureValue - mean;
    sumSquaredDelta += delta * delta;
  }
  const stdDev = Math.sqrt(sumSquaredDelta / (rows.length || 1));
  return stdDev < 1e-6 ? 1 : stdDev;
}

function standardizeValue(
  value: number,
  mean: number,
  scale: number,
): number {
  return (value - mean) / scale;
}

export class EdgeClassifierService implements ClassifierInterface {
  private readonly config: ClassifierConfig;

  constructor(config: Partial<ClassifierConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async trainModel(rows: TrainingRow[]): Promise<ClassifierModel> {
    return this.trainModelSync(rows);
  }

  trainModelSync(rows: TrainingRow[]): ClassifierModel {
    if (rows.length === 0) {
      return {
        weights: [...EMPTY_MODEL_WEIGHTS],
        intercept: 0,
        mean: [...EMPTY_MODEL_WEIGHTS],
        scale: [...EMPTY_MODEL_SCALE],
        sampleSize: 0,
        trainedAt: new Date().toISOString(),
      };
    }

    const mean: number[] = [];
    const scale: number[] = [];

    for (let i = 0; i < FEATURE_COUNT; i++) {
      const featureMean = computeMean(rows, i);
      const featureScale = computeStandardDeviation(rows, i, featureMean);
      mean.push(featureMean);
      scale.push(featureScale);
    }

    const weights = new Array<number>(FEATURE_COUNT).fill(0);
    let intercept = 0;

    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      const weightGradients = new Array<number>(FEATURE_COUNT).fill(0);
      let interceptGradient = 0;

      for (const row of rows) {
        let linearCombination = intercept;
        for (let i = 0; i < FEATURE_COUNT; i++) {
          const featureValue = row.features[i] ?? 0;
          const standardized = standardizeValue(
            featureValue,
            safeAt(mean, i),
            safeAt(scale, i),
          );
          linearCombination += safeAt(weights, i) * standardized;
        }

        const prediction = sigmoid(linearCombination);
        const error = prediction - row.label;

        for (let i = 0; i < FEATURE_COUNT; i++) {
          const featureValue = row.features[i] ?? 0;
          const standardized = standardizeValue(
            featureValue,
            safeAt(mean, i),
            safeAt(scale, i),
          );
          safeSet(weightGradients, i, safeAt(weightGradients, i) + error * standardized);
        }
        interceptGradient += error;
      }

      const sampleSize = rows.length;
      for (let i = 0; i < FEATURE_COUNT; i++) {
        const gradient = safeAt(weightGradients, i) / sampleSize;
        const regularization = this.config.l2Regularization * safeAt(weights, i);
        safeSet(weights, i, safeAt(weights, i) - this.config.learningRate * (gradient + regularization));
      }
      intercept -= this.config.learningRate * (interceptGradient / sampleSize);
    }

    return {
      weights,
      intercept,
      mean,
      scale,
      sampleSize: rows.length,
      trainedAt: new Date().toISOString(),
    };
  }

  predictPropensity(
    features: ReaderFeatureVector,
    model: ClassifierModel,
  ): number {
    let linearCombination = model.intercept;
    for (let i = 0; i < features.length; i++) {
      const featureValue = features[i] ?? 0;
      const standardized = standardizeValue(
        featureValue,
        safeAt(model.mean, i),
        safeAt(model.scale, i),
      );
      linearCombination += safeAt(model.weights, i) * standardized;
    }
    return sigmoid(linearCombination);
  }
}

export const edgeClassifierService: ClassifierInterface =
  new EdgeClassifierService();
