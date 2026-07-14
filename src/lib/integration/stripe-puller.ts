import Stripe from "stripe";

import type { StripeCustomer } from "@/core/domain/ingestion.schema";

const STRIPE_PAGE_LIMIT = 100;

function resolveStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.length === 0) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY environment variable. " +
        "Configure your Stripe secret key before pulling customer data.",
    );
  }
  return new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
}

export async function pullStripeCustomers(): Promise<StripeCustomer[]> {
  const stripe = resolveStripeClient();
  const matched: StripeCustomer[] = [];
  let startingAfter: string | undefined;

  for (let page = 0; page < 1000; page++) {
    const customers = await stripe.customers.list({
      limit: STRIPE_PAGE_LIMIT,
      starting_after: startingAfter,
    });

    for (const customer of customers.data) {
      const userPseudoId = customer.metadata?.user_pseudo_id;
      if (userPseudoId && userPseudoId.length > 0) {
        matched.push({
          id: customer.id,
          created: customer.created,
          metadata: { user_pseudo_id: userPseudoId },
        });
      }
    }

    if (customers.data.length < STRIPE_PAGE_LIMIT) break;

    const lastCustomer = customers.data[customers.data.length - 1];
    if (!lastCustomer) break;
    startingAfter = lastCustomer.id;
  }

  return matched;
}