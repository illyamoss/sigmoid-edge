import { NextResponse } from "next/server";

import {
  ingestionRequestSchema,
  type InternalGa4Event,
  type StripeCustomer,
} from "@/core/domain/ingestion.schema";
import { transformBigQueryEvents } from "@/lib/integration/ga4-transformer";
import { pullStripeCustomers } from "@/lib/integration/stripe-puller";
import { buildProcessHistoricalAnalytics } from "@/core/use-cases/process-historical-analytics";
import { EdgeClassifierService } from "@/lib/integration/edge-classifier.service";
import { createRepositories } from "@/lib/integration/repository-factory";
import { generateMockSeedData } from "@/lib/integration/mock-seeder";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const parsed = ingestionRequestSchema.safeParse(body);

    if (!parsed.success) {
      console.error("Zod Validation Error:", JSON.stringify(parsed.error.format(), null, 2));
      return NextResponse.json(
        {
          error: `Invalid ingestion payload: ${parsed.error.message}`,
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const workspaceId = parsed.data.workspaceId;
    const rawGa4 = parsed.data.ga4;
    if (!rawGa4 || rawGa4.length === 0) {
      return NextResponse.json(
        { error: "GA4 events are strictly required." },
        { status: 400 },
      );
    }
    
    const stripeCustomers = parsed.data.stripe;
    if (!stripeCustomers || stripeCustomers.length === 0) {
      return NextResponse.json(
        { error: "Stripe customers are strictly required." },
        { status: 400 },
      );
    }
    
    const ga4Events = transformBigQueryEvents(rawGa4);

    const repos = createRepositories();
    const classifier = new EdgeClassifierService();

    const processHistoricalAnalytics = buildProcessHistoricalAnalytics({
      readerFeaturesRepository: repos.readers,
      workspaceOverrideRepository: repos.workspaceOverride,
      classifier,
    });

    const result = await processHistoricalAnalytics({
      workspaceId,
      ga4Events,
      stripeCustomers,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown ingestion failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  if (process.env.MODE !== "TESTING") {
    return NextResponse.json(
      { error: "GET ingestion is only available in TESTING mode" },
      { status: 405 },
    );
  }

  try {
    const workspaceId = process.env.TESTING_WORKSPACE_ID;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "TESTING_WORKSPACE_ID environment variable is required for mock ingestion" },
        { status: 400 },
      );
    }

    const seedData = generateMockSeedData();
    const ga4Events = transformBigQueryEvents(seedData.ga4Events);

    const repos = createRepositories();
    const classifier = new EdgeClassifierService();

    const processHistoricalAnalytics = buildProcessHistoricalAnalytics({
      readerFeaturesRepository: repos.readers,
      workspaceOverrideRepository: repos.workspaceOverride,
      classifier,
    });

    const result = await processHistoricalAnalytics({
      workspaceId,
      ga4Events,
      stripeCustomers: seedData.stripeCustomers,
    });

    return NextResponse.json(
      {
        mode: "TESTING",
        seedType: "mock",
        ...result,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown mock ingestion failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}