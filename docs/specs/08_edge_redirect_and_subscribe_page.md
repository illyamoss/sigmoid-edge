# FEATURE SPECIFICATION: 08_edge_redirect_and_subscribe_page

## 1. PRODUCT CONTEXT & OBJECTIVE
Simplify the paywall variant system from three variants (open, newsletter, lock) to a binary decision (open or lock), and change the Cloudflare Worker's behavior from injecting headers to either passing through to the blog or redirecting to a standalone `/subscribe` page. The blog article page must have zero awareness of the paywall — it always renders the full article. The ML model's only job is to decide whether to let the reader through or redirect them to payment.

## 2. FUNCTIONAL REQUIREMENTS & DATA FLOW

### 2.1 Variant System Simplification
The three-variant system is reduced to two:
- **"open"** — The Cloudflare Worker passes the request through to the origin blog. No headers are injected. The blog renders the full article with no knowledge of the paywall.
- **"lock"** — The Cloudflare Worker redirects the reader to `/subscribe` with query parameters `?score=X&ref=Y` (X is the propensity score, Y is the original article path).

The "newsletter" variant is removed entirely from:
- The `PaywallVariant` const object and type
- The `resolveVariantFromScore` function
- The `WorkspaceOverrideRules` type
- The database `paywall_variant` enum
- The mock data generation
- The dashboard segmentation table
- The sandbox telemetry panel

### 2.2 Threshold Simplification
With only two variants, only one threshold is needed:
- `lockThreshold` (75th percentile of score distribution) — if `score >= lockThreshold`, the reader is redirected to `/subscribe`.
- If `score < lockThreshold`, the reader is passed through to the blog (open variant).
- The `newsletterThreshold` is no longer computed, stored, or used anywhere.

### 2.3 Cloudflare Worker Behavior Change
The Worker no longer injects `x-paywall-variant`, `x-propensity-score`, or `x-reader-token` headers into the origin request. Instead:

1. The Worker intercepts the request.
2. It reads or generates the `reader_token` cookie.
3. It calls the edge-score API (`POST /api/v1/edge-score`) to get the variant and score.
4. If the result is `"open"`: it passes the request through to the origin URL without any paywall headers. The blog renders the full article normally.
5. If the result is `"lock"`: it returns a `302 Redirect` to `/subscribe?score=X&ref=Y` where X is the propensity score and Y is the original request path.
6. The `Set-Cookie` header for `reader_token` is still set on all responses to maintain reader identity across requests.

### 2.4 Blog Article Page (Clean)
The `/blog/[slug]` page must not read any paywall-related headers. It must:
- Fetch the article by slug.
- Render the full article content via `ArticleViewer`.
- Have no awareness of variants, propensity scores, blur masks, or dialog overlays.

### 2.5 Subscribe Page
A new `/subscribe` page serves as the paywall destination. It:
- Reads the `score` and `ref` query parameters from the URL.
- Renders a centered card with a "Subscribe to Continue" heading, a description explaining that the content is exclusive to subscribers, a pricing display, and a subscription CTA button.
- Uses the existing `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Button`, and `Input` primitives with the zinc dark theme.
- The subscription CTA button is disabled for now — clicking it shows a "Coming soon" message.

## 3. FILES TO MODIFY, CREATE, AND DELETE

### 3.1 Domain Layer
1. **`src/core/domain/database.types.ts`** — Remove `Newsletter: "newsletter"` from `PaywallVariant`. Remove `newsletterThreshold` from `WorkspaceOverrideRules` type and Zod schema.

2. **`src/core/domain/paywall.types.ts`** — Remove `UNTRAINED_NEWSLETTER_THRESHOLD`. Simplify `resolveVariantFromScore` to accept only `(score, lockThreshold)`: if `score >= lockThreshold` return `"lock"`, else `"open"`. Remove `EdgeHeaderName` const.

3. **`src/core/domain/dashboard.types.ts`** — Remove `newsletterThreshold` from `WorkerConfigParams`.

### 3.2 Schema Layer
4. **`src/lib/db/schemas/publisher.schema.ts`** — Remove `PaywallVariant.Newsletter` from `paywallVariantValues`. Remove `newsletterThreshold` from `WorkspaceOverrideRules` type.

### 3.3 Use Case Layer
5. **`src/core/use-cases/process-historical-analytics.ts`** — Remove the 50th percentile computation. Remove `NEWSLETTER_PERCENTILE` constant.

6. **`src/core/use-cases/compute-edge-score.ts`** — Remove `newsletterThreshold` from `resolveThresholds()`. Pass only `lockThreshold` to `resolveVariantFromScore`.

7. **`src/core/use-cases/compute-dashboard-metrics.ts`** — Remove `"newsletter"` from `VARIANT_ORDER`. Remove `newsletterThreshold` from `buildWorkerConfig()`.

### 3.4 Infrastructure Layer
8. **`src/lib/integration/mock/mock-data.ts`** — Remove `"newsletter"` from `pickVariant()`. Conversion logs use only `"open"` or `"lock"`.

9. **`src/lib/integration/worker-script-builder.ts`** — Remove `DEFAULT_NEWSLETTER_THRESHOLD` and `newsletterThreshold` from `parseWorkerConfig()`.

10. **`src/lib/integration/cloudflare-worker.js`** — Rewrite the `fetch` handler:
    - Remove all paywall header constants and header injection code.
    - Call edge-score API; if `"lock"` → return `302 Redirect` to `/subscribe?score=X&ref=Y` with `Set-Cookie` for `reader_token`.
    - If `"open"` → forward request to origin URL with no paywall headers, setting `Set-Cookie` only if new token.

### 3.5 Presentation Layer
11. **`src/components/features/ArticleViewer.tsx`** — Simplify to always show full article. Remove `variant` and `score` props. Remove blur masks, dialog overlays, and conditional CTA buttons.

12. **`src/components/features/NewsletterCaptureDialog.tsx`** — **Delete**.

13. **`src/components/features/SubscriptionPaywallDialog.tsx`** — **Delete**.

14. **`src/components/features/SandboxTelemetryPanel.tsx`** — Show only two variant badges: `"lock"` (danger) and `"open"` (success). Remove `"warning"` badge.

15. **`src/components/features/dashboard/worker-exporter.tsx`** — Remove "Newsletter Threshold" row.

16. **`src/components/features/dashboard/segmentation-table.tsx`** — Show only two rows (open, lock).

### 3.6 Routing Layer
17. **`src/app/blog/[slug]/page.tsx`** — Remove `resolvePaywallVariant()` and `headers()` import. Render `ArticleViewer` with only article content props.

18. **`src/app/subscribe/page.tsx`** — **New page**. Reads `searchParams` for `score` and `ref`. Renders standalone paywall card with pricing and disabled subscription button.

## 4. WORKER BEHAVIOR SPECIFICATION

The new worker `fetch` handler:

```
function fetch(request, env, ctx):
  url = parse(request.url)
  workspaceSlug = resolveWorkspaceSlug(url.hostname)
  
  cookieHeader = request.headers.get("Cookie")
  readerToken = getCookieValue(cookieHeader, "reader_token")
  isNewToken = !readerToken
  if readerToken is null: readerToken = generateUUID()
  
  origin = env.ORIGIN_URL ?? url.origin
  
  scoreResult = POST(origin + "/api/v1/edge-score", { workspaceSlug, readerToken })
  
  cookie = "reader_token=" + readerToken + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000"
  
  if scoreResult.variant == "lock":
    redirectUrl = "/subscribe?score=" + scoreResult.score + "&ref=" + url.pathname
    return Response.redirect(redirectUrl, 302) with Set-Cookie header
  else:
    targetUrl = origin + url.pathname + url.search
    originResponse = fetch(targetUrl, { method, headers: original headers, body })
    response = new Response(originResponse.body, originResponse)
    if isNewToken: response.headers.set("Set-Cookie", cookie)
    return response
```

## 5. RELATIONSHIP TO PRIOR SPECS
- This spec removes the "newsletter" variant established in `03_edge_scoring_and_middleware.md` and its REVISION 1.
- The `WorkspaceOverrideRules` type was extended in REVISION 1 of `01_database_and_models.md` and is now simplified to remove `newsletterThreshold`.
- The threshold computation was established in REVISION 1 of `02_historical_data_ingestion.md` and is now simplified to only the 75th percentile.
- The `ArticleViewer` component was created in `03_edge_scoring_and_middleware.md` and `05_blog_and_navigation.md` and is now simplified.
- The blog page at `/blog/[slug]` was established in `05_blog_and_navigation.md` and is now cleaned of paywall awareness.
- The dashboard segmentation table was established in `04_publisher_analytics_dashboard.md` and is now simplified to two variants.