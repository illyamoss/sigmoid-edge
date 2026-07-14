import type { PaywallVariant } from "@/core/domain/database.types";
import type { WorkspaceOverrideRules } from "@/core/domain/database.types";
import type {
  EdgeFeatureSnapshot,
  EdgeManualScoreRequest,
  EdgeManualScoreResponse,
  EdgeScoreRequest,
  EdgeScoreResponse,
} from "@/core/domain/paywall.types";
import {
  emptyFeatureSnapshot,
  resolveVariantFromScore,
} from "@/core/domain/paywall.types";
import type {
  ReaderFeaturesRepositoryPort,
  WorkspaceRepositoryPort,
} from "@/core/services/repository.interface";
import type {
  ClassifierInterface,
  ClassifierModel,
  ReaderFeatureVector,
} from "@/core/services/classifier.interface";

type ComputeEdgeScoreDeps = {
  workspaceRepository: WorkspaceRepositoryPort;
  readerFeaturesRepository: ReaderFeaturesRepositoryPort;
  classifier: ClassifierInterface;
};

type ComputeEdgeScoreParams = {
  workspaceSlug: string;
  readerToken: string;
};

type ComputeEdgeScoreResult = {
  variant: PaywallVariant;
  score: number;
  readerToken: string;
};

type ComputeManualScoreDeps = {
  workspaceRepository: WorkspaceRepositoryPort;
  classifier: ClassifierInterface;
};

type ComputeManualScoreParams = {
  workspaceSlug: string;
  features: EdgeFeatureSnapshot;
};

type ComputeManualScoreResult = {
  variant: PaywallVariant;
  score: number;
};

function buildClassifierModel(
  rules: WorkspaceOverrideRules,
): ClassifierModel {
  return {
    weights: rules.weights,
    intercept: rules.intercept,
    mean: rules.mean,
    scale: rules.scale,
    sampleSize: rules.sampleSize,
    trainedAt: rules.trainedAt,
  };
}

function buildFeatureVector(
  snapshot: EdgeFeatureSnapshot,
): ReaderFeatureVector {
  return [
    snapshot.frequency,
    snapshot.recency,
    snapshot.engagement,
    snapshot.velocity,
  ];
}

function buildEmptyModel(): ClassifierModel {
  return {
    weights: [0, 0, 0, 0],
    intercept: 0,
    mean: [0, 0, 0, 0],
    scale: [1, 1, 1, 1],
    sampleSize: 0,
    trainedAt: new Date(0).toISOString(),
  };
}

function resolveLockThreshold(
  overrideRules: WorkspaceOverrideRules | null,
): number {
  if (!overrideRules) return 1.0;
  return overrideRules.lockThreshold;
}

export function buildComputeEdgeScore(deps: ComputeEdgeScoreDeps) {
  return async function computeEdgeScore(
    params: ComputeEdgeScoreParams,
  ): Promise<ComputeEdgeScoreResult> {
    const workspace = await deps.workspaceRepository.findBySlug(
      params.workspaceSlug,
    );

    if (!workspace) {
      return {
        variant: "open" as PaywallVariant,
        score: 0,
        readerToken: params.readerToken,
      };
    }

    const model = workspace.overrideRules
      ? buildClassifierModel(workspace.overrideRules)
      : buildEmptyModel();

    const readerRecord = await deps.readerFeaturesRepository.findByReaderToken(
      workspace.id,
      params.readerToken,
    );

    if (readerRecord?.hasSubscribed === 1) {
      return {
        variant: "open" as PaywallVariant,
        score: 1.0,
        readerToken: params.readerToken,
      };
    }

    const snapshot: EdgeFeatureSnapshot = readerRecord
      ? {
          frequency: readerRecord.frequency,
          recency: readerRecord.recency,
          engagement: readerRecord.engagement,
          velocity: readerRecord.velocity,
        }
      : emptyFeatureSnapshot();

    const featureVector = buildFeatureVector(snapshot);
    const score = deps.classifier.predictPropensity(featureVector, model);
    const lockThreshold = resolveLockThreshold(workspace.overrideRules);
    const variant = resolveVariantFromScore(score, lockThreshold);

    return { variant, score, readerToken: params.readerToken };
  };
}

export function buildComputeManualScore(deps: ComputeManualScoreDeps) {
  return async function computeManualScore(
    params: ComputeManualScoreParams,
  ): Promise<ComputeManualScoreResult> {
    const workspace = await deps.workspaceRepository.findBySlug(
      params.workspaceSlug,
    );

    const model = workspace?.overrideRules
      ? buildClassifierModel(workspace.overrideRules)
      : buildEmptyModel();

    const featureVector = buildFeatureVector(params.features);
    const score = deps.classifier.predictPropensity(featureVector, model);
    const lockThreshold = resolveLockThreshold(
      workspace?.overrideRules ?? null,
    );
    const variant = resolveVariantFromScore(score, lockThreshold);

    return { variant, score };
  };
}

export type ComputeEdgeScore = ReturnType<typeof buildComputeEdgeScore>;
export type ComputeManualScore = ReturnType<typeof buildComputeManualScore>;

export type { EdgeScoreRequest, EdgeScoreResponse, EdgeManualScoreRequest, EdgeManualScoreResponse };
