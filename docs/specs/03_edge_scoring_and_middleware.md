# FEATURE SPECIFICATION: 03_edge_scoring_and_middleware

## 1. PRODUCT CONTEXT & OBJECTIVE
Construct the lightweight serverless edge proxy layer and content blog layout engine. This module intercepts real-time incoming visitor traffic at the network gateway level, runs lightning-fast matrix dot-product math over visitor behavior, attaches dynamic layout instructions to headers, and renders customized page barriers before rendering views. It includes a dedicated testing sandbox layout page route compiling only when testing configurations match.

## 2. FUNCTIONAL REQUIREMENTS & DATA FLOW
- **Data Inputs**: Inbound browser HTTP request headers, reader tracking token cookies, and matching cached weight objects retrieved from database states.
- **Business Logic Processing**:
  1. Read or generate an immutable cryptographic UUID cookie payload to identify visitors.
  2. Run the Sigmoid linear algebra calculation using cached weights to compute a percentage decimal.
  3. Route users directly into explicit variant buckets: `open`, `newsletter`, or `lock`.
  4. **Sandbox Route Control**: If an app request hits `/test-sandbox` and `MODE` does not equal `TESTING`, render a standard `444` empty network closure page block or standard NotFound error template node.
- **Data Outputs / Mutations**: Injects `x-paywall-variant` and `x-propensity-score` header strings to pass downstream to middleware routes.

## 3. PRESENTATION LAYER (UI Components & UX Details)
- **Component Breakdowns**:
  - `ArticleViewer`: Dynamic reader container that hides text behind blurred masks if blocked by headers.
  - `NewsletterCaptureDialog`: Floating overlay blocking access behind a secure email form interface.
  - `SubscriptionPaywallDialog`: Truncated screen layout overlay showing an integrated payment CTA screen.
  - `SandboxTelemetryPanel`: Stitched layout view rendering explicit mock input controllers allowing manual simulation changes across Pageviews, Recency, and Duration values with real-time scoring updates.
- **Design & Styling (shadcn/ui context)**:
  - Utilize `Input`, `Button`, `Dialog`, and `Slider` primitives from the zinc theme library.
- **Animations & Micro-interactions**:
  - Blurs use smooth transitions while dialogs use fast, spring-based scaling steps using framer-motion layers.

## 4. DEPENDENCIES & STEP-BY-STEP FILES TO GENERATE
1. **Domain Layer**: `src/core/domain/paywall.types.ts`
   - Explicit TypeScript string types managing configuration routing boundaries.
2. **Infrastructure Edge Script**: `src/lib/integration/cloudflare-worker.js`
   - Pure network worker script calculating the dot-product mathematical expressions inline.
3. **Routing/Page Layer**: `src/app/article/[slug]/page.tsx`
   - React Server Component route capturing headers and serving matching interactive components.
4. **Routing/Page Layer**: `src/app/test-sandbox/page.tsx`
   - Gated playground template displaying debugging controllers and edge matrix calculations exclusively if `MODE=TESTING` flags are verified.

---

## REVISION 1: Inverted Variant Logic, Data-Driven Thresholds, and Blog Route Migration

### Rationale
The original variant resolution logic routes high-propensity readers to the `open` variant (full access) and low-propensity readers to the `lock` variant (paywall). This is inverted from the correct business intent: readers who are highly engaged and likely to subscribe should be shown the paywall, because they have demonstrated enough interest to justify a purchase prompt. Casual readers with low propensity should be allowed to read freely, because paywalling them only increases bounce rates without generating revenue. Additionally, the hardcoded threshold constants must be replaced by data-driven values computed from the workspace's own training data and stored in the `override_rules` JSONB column. Finally, the article route must move from `/article/[slug]` to `/blog/[slug]` to align with the new site structure where the root `/` serves the dashboard and `/blog` serves the content.

### Inverted Variant Resolution
The `resolveVariantFromScore` function in `src/core/domain/paywall.types.ts` must be updated to implement the following logic:

1. If `score >= lockThreshold`, return `"lock"` — the reader is highly likely to subscribe and should see the subscription paywall.
2. If `score >= newsletterThreshold` (but below `lockThreshold`), return `"newsletter"` — the reader is moderately engaged and should be prompted with a newsletter email capture.
3. If `score < newsletterThreshold`, return `"open"` — the reader is casual and unlikely to subscribe, so full article access should be granted without interruption.

### Data-Driven Thresholds
- The `DefaultVariantThresholds` constant and `VariantThresholdConfig` type must be removed from `src/core/domain/paywall.types.ts`.
- The `resolveVariantFromScore` function must accept `lockThreshold` and `newsletterThreshold` as explicit `number` parameters instead of reading from a config object with default fallbacks.
- The `buildComputeEdgeScore` and `buildComputeManualScore` use cases in `src/core/use-cases/compute-edge-score.ts` must read `lockThreshold` and `newsletterThreshold` from the workspace's `overrideRules` and pass them to `resolveVariantFromScore`.
- If the workspace has no `overrideRules` (untrained), the function must default to `lockThreshold = 1.0` and `newsletterThreshold = 1.0`, effectively granting open access to all readers until the model is trained.

### Article Route Migration
- The article page must move from `src/app/article/[slug]/page.tsx` to `src/app/blog/[slug]/page.tsx`.
- The article layout must move from `src/app/article/[slug]/layout.tsx` to `src/app/blog/[slug]/layout.tsx`.
- The old `src/app/article/` directory must be deleted entirely.
- The `generateStaticParams` function must be updated to operate from the new path.

### Sandbox Telemetry Panel Impact
- The `SandboxTelemetryPanel` component must reflect the inverted logic: high slider values (high frequency, low recency, high engagement, high velocity) should produce a `lock` variant badge, while low slider values should produce an `open` variant badge.

### Cloudflare Worker Impact
- The Cloudflare Worker script does not compute variant thresholds itself. It calls the edge-score API endpoint, which resolves the variant server-side using the workspace's stored thresholds. The worker receives `{ variant, score }` and injects the `x-paywall-variant` header. No changes to the worker's threshold logic are needed.

### Files Modified
- `src/core/domain/paywall.types.ts` — Invert `resolveVariantFromScore`, remove `DefaultVariantThresholds` and `VariantThresholdConfig`.
- `src/core/use-cases/compute-edge-score.ts` — Read thresholds from `workspace.overrideRules`, pass to `resolveVariantFromScore`.
- `src/app/blog/[slug]/page.tsx` — Moved from `src/app/article/[slug]/page.tsx`.
- `src/app/blog/[slug]/layout.tsx` — Moved from `src/app/article/[slug]/layout.tsx`.
- `src/app/article/` — Deleted.

### No New Files
This revision modifies and moves existing files only. No new feature components are generated.

---

## REVISION 2: Worker Pass-Through or Redirect, Newsletter Removed, Header Injection Removed

### Rationale
The Cloudflare Worker previously injected `x-paywall-variant` and `x-propensity-score` headers into the origin request, and the blog article page read those headers to conditionally render paywall UI. This coupling between the edge layer and the application layer is unnecessary. The worker should either pass the request through to the blog (no headers, no paywall awareness) or redirect the user to a dedicated `/subscribe` page. The blog becomes completely clean — it never knows about the paywall. Additionally, the three-variant system (open, newsletter, lock) is simplified to two variants (open, lock) — the newsletter variant is removed entirely.

### Worker Behavior Change
The Cloudflare Worker's `fetch` handler must be rewritten to implement the following logic:

1. Read or generate the `reader_token` cookie.
2. Call the edge-score API (`POST /api/v1/edge-score`) to get the variant and score for the current reader.
3. If the variant is `"lock"`: return a `302 Redirect` to `/subscribe?score=X&ref=Y` where X is the propensity score and Y is the original request path. Set the `Set-Cookie` header for `reader_token` on the redirect response.
4. If the variant is `"open"`: forward the request to the origin URL without injecting any paywall headers. Set the `Set-Cookie` header for `reader_token` only if the token was newly generated.
5. The `x-paywall-variant`, `x-propensity-score`, and `x-reader-token` headers are no longer set on any request.

### Variant System Simplification
- The `PaywallVariant` type is reduced to `"open" | "lock"`. The `"newsletter"` value is removed.
- The `resolveVariantFromScore` function accepts only `(score, lockThreshold)`. If `score >= lockThreshold`, return `"lock"`. Otherwise return `"open"`.
- The `EdgeHeaderName` const object is removed — no longer needed since headers are not injected.
- The `VariantThresholdConfig` type and `DefaultVariantThresholds` constant were already removed in REVISION 1 and are not re-introduced.

### Files Modified
- `src/lib/integration/cloudflare-worker.js` — Rewrite `fetch` handler: pass-through on open, redirect to `/subscribe` on lock.
- `src/core/domain/paywall.types.ts` — Remove `EdgeHeaderName`, simplify `resolveVariantFromScore` to one threshold, remove `UNTRAINED_NEWSLETTER_THRESHOLD`.
- `src/core/use-cases/compute-edge-score.ts` — Remove `newsletterThreshold` from `resolveThresholds()`, pass only `lockThreshold` to `resolveVariantFromScore`.
- `src/core/use-cases/process-historical-analytics.ts` — Remove 50th percentile (`NEWSLETTER_PERCENTILE`) computation.
- `src/lib/integration/worker-script-builder.ts` — Remove `DEFAULT_NEWSLETTER_THRESHOLD` and `newsletterThreshold` field.

### Files Deleted
- `src/components/features/NewsletterCaptureDialog.tsx` — No longer needed.
- `src/components/features/SubscriptionPaywallDialog.tsx` — No longer needed (replaced by `/subscribe` page).

### Files Created
- `src/app/subscribe/page.tsx` — New standalone paywall destination page.

### No New Feature Components
This revision modifies existing files, deletes two feature components, and creates one new page. No new feature UI components are generated.
