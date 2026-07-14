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
