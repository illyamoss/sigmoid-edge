# FEATURE SPECIFICATION: 05_blog_and_navigation

## 1. PRODUCT CONTEXT & OBJECTIVE
Establish the public-facing blog content layer and site-wide navigation structure. This module renders a browsable listing of all published articles at `/blog` and individual article pages at `/blog/[slug]`, with a shared navigation header linking between the publisher dashboard at `/` and the blog content at `/blog`. It completes the site structure by separating the commercial control panel (dashboard) from the reader-facing content (blog).

## 2. FUNCTIONAL REQUIREMENTS & DATA FLOW
- **Data Inputs**: The article listing page reads all available articles from the mock article data module. The individual article page reads the `x-paywall-variant` and `x-propensity-score` headers injected by the Cloudflare Worker (or defaults to `open` when accessed directly without the worker).
- **Business Logic Processing**:
  1. The blog listing page fetches all articles, sorts them by `publishedAt` in descending chronological order, and passes them as props to the `ArticleList` client component.
  2. The individual article page reads the `x-paywall-variant` header and resolves the variant (`open`, `newsletter`, or `lock`) to pass to the `ArticleViewer` component.
  3. The root layout renders a persistent navigation bar with links to the dashboard (`/`) and the blog (`/blog`), styled with the zinc dark theme.
- **Data Outputs / Mutations**: No mutations. Both pages are read-only Server Components that delegate interactivity to client-side feature components.

## 3. PRESENTATION LAYER (UI Components & UX Details)
- **Component Breakdowns**:
  - `ArticleList`: Client component rendering a vertical stack of article cards. Each card displays the article title, author, publication date formatted in long form, a two-line excerpt, and a "Read Article" link navigating to `/blog/[slug]`. Cards animate into view using framer-motion staggered entrance (each card delayed by 0.08s, fading in and translating 12px upward).
  - `NavigationBar`: Server component rendered in the root layout. Displays the SigmoidEdge AI logo text on the left, with two navigation links: "Dashboard" linking to `/` and "Blog" linking to `/blog`. The active link is highlighted using a zinc-100 text color and a subtle bottom border, while inactive links use zinc-400.
- **Design & Styling (shadcn/ui context)**:
  - Utilize `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `Button` abstract primitives for article cards.
  - The navigation bar uses a sticky top border-bottom layout with zinc-950 background and zinc-800 border.
- **Animations & Micro-interactions**:
  - Article cards use framer-motion staggered fade-in with a 12px upward translation, staggered by 0.08s per card.
  - Hover on article cards transitions the card border from zinc-800 to zinc-700 over 200ms.

## 4. DEPENDENCIES & STEP-BY-STEP FILES TO GENERATE
1. **Feature UI Layer**: `src/components/features/blog/article-list.tsx`
   - Client component accepting an array of article metadata objects (slug, title, author, publishedAt, excerpt) and rendering staggered article cards with navigation links.
2. **Routing/Page Layer**: `src/app/blog/page.tsx`
   - Server Component fetching all articles from the mock article data module, sorting by `publishedAt` descending, and passing them to `ArticleList`.
3. **Routing/Page Layer**: `src/app/blog/[slug]/page.tsx`
   - Server Component reading the `x-paywall-variant` and `x-propensity-score` headers, resolving the article by slug, and rendering `ArticleViewer` with the variant and score. This file is moved from `src/app/article/[slug]/page.tsx` per REVISION 1 of `03_edge_scoring_and_middleware.md`.
4. **Routing/Page Layer**: `src/app/blog/[slug]/layout.tsx`
   - Minimal article layout wrapper providing a max-width container and a back-link to `/blog`. This file is moved from `src/app/article/[slug]/layout.tsx`.
5. **Routing/Page Layer**: `src/app/layout.tsx`
   - Updated root layout including the navigation bar component, global CSS import, and zinc dark theme body styling.
6. **Shared UI Layer**: `src/components/shared/navigation-bar.tsx`
   - Server component rendering the persistent navigation header with links to `/` (Dashboard) and `/blog` (Blog), using `usePathname` from `next/navigation` to highlight the active link.

## 5. MOCK ARTICLE DATA
- The existing `src/lib/mock-articles.ts` module is the data source for both the blog listing and individual article pages. No changes to this module are required.
- The `getAllArticleSlugs` function is used by `generateStaticParams` in the article page for static generation.
- The `getArticleBySlug` function is used by the article page to resolve article content by slug.

## 6. RELATIONSHIP TO PRIOR SPECS
- This spec depends on the `ArticleViewer`, `NewsletterCaptureDialog`, and `SubscriptionPaywallDialog` components established in `03_edge_scoring_and_middleware.md`.
- The article page at `/blog/[slug]` replaces the original `/article/[slug]` route per REVISION 1 of `03_edge_scoring_and_middleware.md`.
- The navigation bar links to the dashboard at `/`, which is established by REVISION 1 of `04_publisher_analytics_dashboard.md`.

---

## REVISION 1: Blog Clean of Paywall Awareness, ArticleViewer Simplified

### Rationale
The blog article page at `/blog/[slug]` previously read `x-paywall-variant` and `x-propensity-score` headers to conditionally render paywall UI (blur masks, dialog overlays, CTA buttons). This coupling between the edge layer and the application layer is unnecessary. The Cloudflare Worker now either passes the request through (open variant, blog renders normally) or redirects to a dedicated `/subscribe` page (lock variant, blog is never reached). The blog must have zero awareness of the paywall. The `ArticleViewer` component is simplified to always show the full article content with no conditional rendering.

### ArticleViewer Simplification
The `ArticleViewer` component in `src/components/features/ArticleViewer.tsx` must be updated to:

1. Remove the `variant` prop — no longer needed.
2. Remove the `score` prop — no longer needed.
3. Remove all blur mask rendering and blurred paragraph logic.
4. Remove the "Subscribe to Unlock" and "Subscribe to Newsletter" CTA buttons.
5. Remove imports and usage of `NewsletterCaptureDialog` and `SubscriptionPaywallDialog`.
6. Remove the `Badge` and `motion` button variants for paywall CTA.
7. Accept only `title`, `author`, `publishedAt`, `excerpt`, and `paragraphs` as props.
8. Always render all paragraphs with framer-motion fade-in animations, no conditional truncation.

### Article Page Simplification
The `/blog/[slug]` page in `src/app/blog/[slug]/page.tsx` must be updated to:

1. Remove the `resolvePaywallVariant()` function entirely.
2. Remove the `headers()` import from `next/headers`.
3. Remove the `type PaywallVariant` import.
4. Fetch the article by slug and check for `notFound()`.
5. Render `ArticleViewer` with only the article content props (title, author, publishedAt, excerpt, paragraphs).
6. No conditional logic based on variant.

### Component Deletions
- `NewsletterCaptureDialog` (`src/components/features/NewsletterCaptureDialog.tsx`) — **Deleted**. No longer used anywhere.
- `SubscriptionPaywallDialog` (`src/components/features/SubscriptionPaywallDialog.tsx`) — **Deleted**. Replaced by the standalone `/subscribe` page.

### Sandbox Telemetry Impact
The `SandboxTelemetryPanel` no longer shows a `"newsletter"` badge variant. It shows only `"lock"` (danger, red) for high engagement scores and `"open"` (success, green) for low engagement scores.

### Files Modified
- `src/components/features/ArticleViewer.tsx` — Simplified: always shows full article, no variant/score props, no blur/CTA.
- `src/app/blog/[slug]/page.tsx` — Removed paywall header reading, renders article directly.
- `src/components/features/SandboxTelemetryPanel.tsx` — Updated badge variants to lock/open only.

### Files Deleted
- `src/components/features/NewsletterCaptureDialog.tsx`
- `src/components/features/SubscriptionPaywallDialog.tsx`

### No New Files
This revision modifies and deletes existing files only. No new files are generated.
