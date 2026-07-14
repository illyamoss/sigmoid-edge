export type ReaderFeatureVector = readonly [
  number,
  number,
  number,
  number,
];

export type TrainingRow = {
  features: ReaderFeatureVector;
  label: 0 | 1;
};

export type ClassifierModel = {
  weights: number[];
  intercept: number;
  mean: number[];
  scale: number[];
  sampleSize: number;
  trainedAt: string;
};

export interface ClassifierInterface {
  trainModel(rows: TrainingRow[]): Promise<ClassifierModel>;
  trainModelSync(rows: TrainingRow[]): ClassifierModel;
  predictPropensity(
    features: ReaderFeatureVector,
    model: ClassifierModel,
  ): number;
}

export type ClassifierConfig = {
  epochs: number;
  learningRate: number;
  l2Regularization: number;
};
