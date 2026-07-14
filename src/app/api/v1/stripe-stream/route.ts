import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createRepositories } from "@/lib/integration/repository-factory";

const SUBSCRIPTION_CREATED_EVENT = "customer.subscription.created";
const SUBSCRIPTION_DELETED_EVENT = "customer.subscription.deleted";

type SubscriptionObject = {
  metadata?: {
    user_pseudo_id?: string;
  };
};

type StripeEvent = {
  type: string;
  data: {
    object: SubscriptionObject;
  };
};

type SubscriptionMutation = {
  workspaceId: string;
  readerToken: string;
  hasSubscribed: 0 | 1;
};

function resolveStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.length === 0) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }
  return new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
}

function resolveWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
  }
  return secret;
}

function extractReaderToken(event: StripeEvent): string | null {
  const metadata = event.data?.object?.metadata;
  if (!metadata) return null;
  const readerToken = metadata.user_pseudo_id;
  if (!readerToken || readerToken.length === 0) return null;
  return readerToken;
}

function resolveWorkspaceId(request: Request): string | null {
  const workspaceId = request.headers.get("x-workspace-id");
  if (!workspaceId || workspaceId.length === 0) return null;
  return workspaceId;
}

async function processSubscriptionMutation(
  mutation: SubscriptionMutation,
): Promise<void> {
  const repos = createRepositories();
  await repos.readers.setSubscriptionState(
    mutation.workspaceId,
    mutation.readerToken,
    mutation.hasSubscribed,
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const workspaceId = resolveWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Missing x-workspace-id header" },
      { status: 400 },
    );
  }

  try {
    const stripe = resolveStripeClient();
    const webhookSecret = resolveWebhookSecret();

    const rawBody = await request.text();
    const signatureHeader = request.headers.get("stripe-signature");

    if (!signatureHeader) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 },
      );
    }

    const verifiedEvent = (await stripe.webhooks.constructEventAsync(
      rawBody,
      signatureHeader,
      webhookSecret,
    )) as unknown as StripeEvent;

    const isSubscriptionCreated =
      verifiedEvent.type === SUBSCRIPTION_CREATED_EVENT;
    const isSubscriptionDeleted =
      verifiedEvent.type === SUBSCRIPTION_DELETED_EVENT;

    if (!isSubscriptionCreated && !isSubscriptionDeleted) {
      return NextResponse.json(
        { received: true, ignored: true, type: verifiedEvent.type },
        { status: 200 },
      );
    }

    const readerToken = extractReaderToken(verifiedEvent);
    if (!readerToken) {
      return NextResponse.json(
        { error: "Missing user_pseudo_id in subscription metadata" },
        { status: 400 },
      );
    }

    const hasSubscribed: 0 | 1 = isSubscriptionCreated ? 1 : 0;

    await processSubscriptionMutation({
      workspaceId,
      readerToken,
      hasSubscribed,
    });

    return NextResponse.json(
      {
        received: true,
        readerToken,
        hasSubscribed,
        type: verifiedEvent.type,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown webhook failure";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
