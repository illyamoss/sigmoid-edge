import { NextResponse } from "next/server";
import { z } from "zod";

import type { EdgeFeatureSnapshot } from "@/core/domain/paywall.types";
import {
  buildComputeEdgeScore,
  buildComputeManualScore,
} from "@/core/use-cases/compute-edge-score";
import { edgeClassifierService } from "@/lib/integration/edge-classifier.service";
import { createRepositories } from "@/lib/integration/repository-factory";

const edgeScoreBodySchema = z.object({
  workspaceSlug: z.string().min(1).max(160),
  readerToken: z.string().min(1).max(128),
});

const manualScoreBodySchema = z.object({
  workspaceSlug: z.string().min(1).max(160),
  features: z.object({
    frequency: z.number().nonnegative(),
    recency: z.number().nonnegative(),
    engagement: z.number().nonnegative(),
    velocity: z.number().nonnegative(),
  }),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const parsed = edgeScoreBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid edge score request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { workspaceSlug, readerToken } = parsed.data;
    const repos = createRepositories();

    const computeEdgeScore = buildComputeEdgeScore({
      workspaceRepository: repos.workspace,
      readerFeaturesRepository: repos.readers,
      classifier: edgeClassifierService,
    });

    const result = await computeEdgeScore({ workspaceSlug, readerToken });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown edge score failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  if (process.env.MODE !== "TESTING") {
    return NextResponse.json(
      { error: "Manual edge scoring is only available in TESTING mode" },
      { status: 403 },
    );
  }

  try {
    const body: unknown = await request.json();
    const parsed = manualScoreBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid manual score request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { workspaceSlug, features } = parsed.data;
    const repos = createRepositories();

    const computeManualScore = buildComputeManualScore({
      workspaceRepository: repos.workspace,
      classifier: edgeClassifierService,
    });

    const result = await computeManualScore({
      workspaceSlug,
      features: features as EdgeFeatureSnapshot,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown manual score failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
