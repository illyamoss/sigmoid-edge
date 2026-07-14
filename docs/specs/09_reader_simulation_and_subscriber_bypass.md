# FEATURE SPECIFICATION: 09_reader_simulation_and_subscriber_bypass

## 1. PRODUCT CONTEXT & OBJECTIVE
Fix two gaps in the edge scoring and testing workflow. First, subscribed readers (`hasSubscribed = 1`) must always bypass the paywall — the edge-score API must return `"open"` immediately for any reader who has already subscribed, regardless of their propensity score. Second, the sandbox page must provide a reader profile picker so developers and publishers can simulate different reader types (casual, converter, new) by setting the `reader_token` cookie to known mock reader tokens and then visiting the blog through the Cloudflare Worker to observe the resulting pass-through or redirect behavior.

## 2. FUNCTIONAL REQUIREMENTS & DATA FLOW

### 2.1 Subscribed Reader Bypass
The edge-score use case at `src/core/use-cases/compute-edge-score.ts` must check whether the requesting reader has already subscribed before computing any propensity score or variant resolution. The logic:

1. Look up the reader record via `readerFeaturesRepository.findByReaderToken(workspaceId, readerToken)`.
2. If `readerRecord` is not null and `readerRecord.hasSubscribed === 1`, return `{ variant: "open", score: 1.0, readerToken }` immediately — no model inference, no threshold comparison.
3. If `readerRecord` is null or the reader is not subscribed, continue with the existing scoring and variant resolution pipeline.
4. The same check must be applied in `buildComputeManualScore` (used by the sandbox PUT endpoint) so the sandbox accurately reflects subscriber bypass behavior.

This change is server-side and retroactive — it applies to all readers already marked as subscribed in the database or mock data.

### 2.2 Reader Profile Picker
The sandbox page at `/test-sandbox` must provide a UI for selecting a reader profile and setting the `reader_token` cookie to a known mock reader token. The available profiles must map to existing mock reader tokens from `src/lib/integration/mock/mock-data.ts`:

| Profile Name | reader_token value | Description | Expected Score | Expected Variant |
|---|---|---|---|---|
| New Random Reader | (none — cookie cleared) | A first-time visitor with no history. The worker generates a new UUID. | ~0.8% | open |
| Casual Reader | `reader_casual_0000` | Low frequency, high recency, low engagement, low velocity. | ~0.3% | open |
| Converter Reader | `reader_conv_0000` | High frequency, low recency, high engagement, high velocity. | ~99.8% | lock |

When a profile is selected:
1. The component sets `document.cookie` with `reader_token=<value>; path=/; max-age=31536000`.
2. The component displays a confirmation message showing the selected profile and token.
3. The component shows a clickable link: "Visit blog through worker →" pointing to `http://localhost:8787/blog/the-future-of-edge-computing` so the user can immediately test the redirect behavior.

### 2.3 Reader Token Display
The sandbox page must read and display the current `reader_token` cookie value at all times. This allows the user to see what token is active, and to confirm that the profile picker successfully changed it. The token value is displayed in a monospace font inside a small badge or code block.

## 3. PRESENTATION LAYER (UI Components & UX Details)

### 3.1 SandboxTelemetryPanel Changes
The existing `SandboxTelemetryPanel` component at `src/components/features/SandboxTelemetryPanel.tsx` must be extended with:

1. **Reader Profile section** — A card above the existing feature controls and score output. Contains:
   - A label "Current Reader Token" with the token value displayed in a `code`-style monospace box.
   - A label "Select Reader Profile" with three radio-button-style options: "New Random Reader", "Casual Reader", "Converter Reader".
   - Each option is a clickable row showing the profile name, the token value, and a brief description of the expected behavior.
   - A "Set Profile" button that writes the cookie and shows confirmation.
   - After setting the profile, a "Visit blog through worker →" link opens in a new tab pointing to the worker URL.

2. **Styling** — Uses existing `Card`, `Button`, and `Badge` primitives. The current token display uses a dark code-block style (`bg-zinc-950 border border-zinc-800 rounded px-2 py-1 font-mono text-xs`).

### 3.2 Animated Feedback
- When "Set Profile" is clicked, the button text briefly changes to "Profile Set" (checkmark icon) for 1.5 seconds before reverting.
- The current token display updates immediately via state.

## 4. FILES TO MODIFY

### 4.1 Use Case Layer
1. **`src/core/use-cases/compute-edge-score.ts`** — In `buildComputeEdgeScore`, after `findByReaderToken` and before feature vector construction, add:
   ```typescript
   if (readerRecord?.hasSubscribed === 1) {
     return { variant: "open", score: 1.0, readerToken: params.readerToken };
   }
   ```
   Same check in `buildComputeManualScore`.

### 4.2 Presentation Layer
2. **`src/components/features/SandboxTelemetryPanel.tsx`** — Add reader profile picker UI at the top of the component. Import cookie reading/writing utilities. Add state for selected profile, confirmation message, and current token display. Add the "Visit blog through worker" link.

### 4.3 No New Files
This revision modifies two existing files only. No new files are created or deleted.

## 5. COOKIE UTILITY
Cookie read/write is a two-line browser API call. No external library is needed:

```typescript
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, maxAgeDays: number = 365): void {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeDays * 86400}; SameSite=Lax`;
}
```

These are small enough to be defined inline in the component file.

## 6. RELATIONSHIP TO PRIOR SPECS
- This spec addresses the UX gap discovered after implementing `08_edge_redirect_and_subscribe_page.md` — the worker now either passes through or redirects, but there was no way to test the redirect path without manually editing cookies.
- The mock reader tokens (`reader_casual_*`, `reader_conv_*`) are generated by `src/lib/integration/mock/mock-data.ts`, established in the REVISION 1 of `02_historical_data_ingestion.md`.
- The sandbox page at `/test-sandbox` was established in `03_edge_scoring_and_middleware.md` and modified in REVISION 1 of `05_blog_and_navigation.md`.
- The `hasSubscribed` column on `readers_features` was established in REVISION 1 of `02_historical_data_ingestion.md` and is set via the training pipeline and Stripe webhook.

---

## REVISION 1: Query Parameter Token Override for Cookie Port Isolation

### Rationale
The sandbox profile picker sets the `reader_token` cookie on `localhost:3000` (Next.js dev server), but cookies are not shared across browser ports. When the user visits `localhost:8787` (Cloudflare Worker), the cookie is not sent. The worker generates a fresh UUID, scoring the reader as unknown (~0.8%) and never triggering the lock/redirect. This revision adds a `?reader_token=` query parameter override to the Worker so the sandbox can pass the selected token directly in the URL, bypassing cookie port isolation entirely.

### Worker Change
The `fetch` handler in `src/lib/integration/cloudflare-worker.js` must check for a `reader_token` query parameter on every request before falling back to the cookie:

```javascript
const queryToken = url.searchParams.get("reader_token");
let readerToken = queryToken || getCookieValue(cookieHeader, READER_TOKEN_COOKIE);
```

If `?reader_token=xxx` is present, it takes priority over the cookie. Normal traffic (no query param) behaves exactly as before.

### Sandbox Change
The "Visit blog through worker →" link in `src/components/features/SandboxTelemetryPanel.tsx` must dynamically include `?reader_token=<selected_profile_token>` when a named profile is selected. When "New Random Reader" is selected, no override is added so the worker generates a UUID.

### Builder Change
The `buildWorkerScript` function in `src/lib/integration/worker-script-builder.ts` must generate worker code that includes the query parameter override, matching the behavior in the actual worker file.

### Files Modified
- `src/lib/integration/cloudflare-worker.js` — Add `?reader_token` query param override before cookie fallback.
- `src/components/features/SandboxTelemetryPanel.tsx` — Dynamic worker link with token query param.
- `src/lib/integration/worker-script-builder.ts` — Generated script includes query param override.

### No New Files
This revision modifies three existing files only.

---

## REVISION 2: Decouple Mock Training Labels from hasSubscribed

### Rationale
The mock data in `src/lib/integration/mock/mock-data.ts` currently sets `hasSubscribed: 1` for all 100 converter readers. This field serves dual purposes: (1) it is the training label during model fitting, and (2) the subscriber bypass in `compute-edge-score.ts` treats `hasSubscribed === 1` as a live subscription indicator.

This conflation causes a bug: the subscriber bypass fires for all converter readers, returning `"open"` with score 1.0 immediately. The worker then passes the request through instead of redirecting to `/subscribe`. Converter readers never trigger a lock redirect because they are incorrectly treated as already paid.

In production, `hasSubscribed` is set to 1 only by the Stripe webhook (real-time subscription events). The mock data must simulate the untrained state where no readers have paid yet — the converter readers are merely **likely** to subscribe, not already subscribed.

### Mock Data Changes
In `src/lib/integration/mock/mock-data.ts`:

1. **Converter reader generation** — Change `hasSubscribed: 1` to `hasSubscribed: 0` and `subscribedAt: new Date(...)` to `subscribedAt: null` for all converter readers.
2. **Training label decoupling** — In `buildTrainingRows()`, determine the label by checking the reader token prefix instead of reading the `hasSubscribed` field:

```typescript
function buildTrainingRows(): TrainingRow[] {
  return mockReaders.map((reader) => ({
    features: [
      reader.frequency,
      reader.recency,
      reader.engagement,
      reader.velocity,
    ] as unknown as ReaderFeatureVector,
    label: reader.readerToken.startsWith("reader_conv_") ? 1 : 0,
  }));
}
```

This preserves correct training (converters still get label 1) while ensuring the subscriber bypass does not fire prematurely for mock readers. Converter readers are now scored through the model and correctly cross the `lockThreshold`, triggering the redirect.

### After Fix Behavior
| Profile | hasSubscribed | Training Label | Model Score | Bypass? | Variant | Worker Action |
|---------|--------------|----------------|-------------|---------|---------|---------------|
| Casual Reader | 0 | 0 | ~0.3% | No | open | Pass through |
| Converter Reader | 0 | 1 | ~99.8% | No | lock | 302 Redirect → /subscribe |
| Real Stripe subscriber (production) | 1 | N/A | 1.0 | Yes | open | Pass through |

### Files Modified
- `src/lib/integration/mock/mock-data.ts` — Set `hasSubscribed: 0` for all mock readers, decouple training labels from `hasSubscribed`.

### No New Files
This revision modifies one existing file only.

---

## REVISION 3: Worker Redirect Constant, Cookie Regex Fix, SameSite Cleanup

### Rationale
Three bugs were discovered during testing of the reader profile picker and worker redirect flow.

1. The worker constructs the redirect URL inline instead of using a constant at the top of the file, making it harder to configure and inconsistent with the generated script template.
2. The `getCookie` helper in `SandboxTelemetryPanel.tsx` uses a broken regex: `(^| )` matches start-of-string or a space, but cookies are delimited by `; ` (semicolon + space). The regex never matches cookies beyond the first one, and fails entirely for single-cookie scenarios because the browser's `document.cookie` format uses `key=value` without a leading delimiter. The UI always shows "Current token: (none — new reader)" even when the cookie is correctly set.
3. The `clearCookie` function uses `SameSite=Lax` which fails to override the original cookie in some browser configurations because the `SameSite` attribute was present in `setCookie` but the deletion attributes must match exactly.

### Worker Redirect URL Constant
The Cloudflare Worker at `src/lib/integration/cloudflare-worker.js` must define the redirect URL as a module-level constant:

```javascript
const REDIRECT_URL = "/subscribe";
```

The `fetch` handler must use this constant when constructing the redirect:

```javascript
const redirectUrl = REDIRECT_URL + "?score=" + scoreResult.score + "&ref=" + encodeURIComponent(url.pathname);
```

The generated worker script in `src/lib/integration/worker-script-builder.ts` must include the same constant in its template string.

### Cookie Regex Fix
The `getCookie` function in `SandboxTelemetryPanel.tsx` must change the regex from `(^| )` to `(^|; )`:

```typescript
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^|; )${name}=([^;]+)`));
  return match ? match[2] ?? null : null;
}
```

This matches either the start of the cookie string (first cookie) or a semicolon-space delimiter (subsequent cookies), correctly parsing all cookies in the `document.cookie` string.

### SameSite Cleanup
The `clearCookie` function in `SandboxTelemetryPanel.tsx` must remove the `SameSite=Lax` attribute to ensure the deletion cookie matches the original cookie in all browser configurations:

```typescript
function clearCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0`;
}
```

Modern browsers default to `SameSite=Lax` when no `SameSite` attribute is specified, so the deletion cookie will match the original cookie set by `setCookie`.

### Files Modified
- `src/lib/integration/cloudflare-worker.js` — Add `REDIRECT_URL` constant at top level, use it in redirect construction.
- `src/lib/integration/worker-script-builder.ts` — Add `REDIRECT_URL` constant to generated worker template, use it in redirect construction.
- `src/components/features/SandboxTelemetryPanel.tsx` — Fix `getCookie` regex from `(^| )` to `(^|; )`. Remove `SameSite=Lax` from `clearCookie`.

### No New Files
This revision modifies three existing files only.

---

## REVISION 4: Subscribe Path Bypass and HttpOnly Cookie Removal

### Rationale
Two runtime bugs were discovered during testing of the profile picker and worker redirect flow.

1. **Redirect loop**: The worker intercepts every request including the `/subscribe` redirect target. When a converter reader scores 99.8%, the worker redirects to `/subscribe`. The browser follows the redirect, the worker intercepts again, scores 99.8% again, and redirects to `/subscribe` again — infinite loop. The worker must skip the edge-score API for the `/subscribe` path and pass through to the origin directly.

2. **Cookie not overridable**: The worker sets the `reader_token` cookie with `HttpOnly; Secure` flags. The `HttpOnly` flag prevents JavaScript's `document.cookie` API from reading or deleting the cookie. When the sandbox calls `clearCookie("reader_token")`, it only deletes the non-HttpOnly cookie written by the sandbox itself — the worker's HttpOnly cookie persists. The `Secure` flag also causes inconsistencies on localhost (HTTP). Combined, the user cannot switch profiles after the first worker visit because the old HttpOnly token always wins and always scores 99.9%.

### Subscribe Path Bypass
The worker's `fetch` handler must check if the request path starts with `REDIRECT_URL` before doing any scoring work. The `origin` variable must be resolved before the bypass check since the pass-through `fetch` call needs it:

```javascript
const url = new URL(request.url);
const origin = (env && env.ORIGIN_URL) || url.origin;

if (url.pathname.startsWith(REDIRECT_URL)) {
  return fetch(origin + url.pathname + url.search);
}
```

The bypass returns immediately — no cookie read, no edge-score API call, no redirect. The request is forwarded to the origin unchanged.

### HttpOnly and Secure Removal
The worker's cookie string must remove the `HttpOnly; Secure` attributes:

```
Before: ...; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000
After:  ...; Path=/; SameSite=Lax; Max-Age=31536000
```

This allows the sandbox's `document.cookie` API to read, write, and delete the `reader_token` cookie. The sandbox can now switch profiles by calling `setCookie` (to impersonate a converter) or `clearCookie` (to simulate a new reader). The profile picker's "Set Profile" and "New Random Reader" actions now take effect immediately because the sandbox can actually modify the cookie that the worker reads.

### Files Modified
- `src/lib/integration/cloudflare-worker.js` — Add `/subscribe` path bypass with `url.pathname.startsWith(REDIRECT_URL)`. Remove `HttpOnly; Secure` from the cookie string.
- `src/lib/integration/worker-script-builder.ts` — Remove `HttpOnly; Secure` from the generated cookie string in the worker template.

### No New Files
This revision modifies two existing files only.

---

## REVISION 5: Blog-Only Scoring Scope and Clean Redirect

### Rationale
Two production issues remained after the subscribe bypass fix.

1. **Static asset spam**: The worker was intercepting all requests including sub-resources (CSS, JS, images). Each static asset request carried the `reader_token` cookie and triggered an edge-score API call. If the score was high, the worker redirected the CSS file request to `/subscribe` — the browser followed the redirect, loaded the page again, requested more CSS, and looped infinitely.

2. **Redundant query params**: The redirect URL included `?score=X&ref=Y` query parameters. These were never used by the `/subscribe` page (it renders a standalone paywall card with no awareness of the score or referrer). The `ref` parameter also incorrectly captured sub-resource paths like `/_next/static/css/...` when CSS files were redirected.

### Blog-Only Scoring Scope
The worker must only call the edge-score API for blog article requests. All other paths must pass through to the origin without any scoring:

```javascript
if (!url.pathname.startsWith("/blog/")) {
  return fetch(origin + url.pathname + url.search);
}
```

This replaces the previous `REDIRECT_URL` bypass check. The set of paths that bypass scoring includes:
- `/subscribe` — the paywall redirect target
- `/_next/*` — Next.js static assets (CSS, JS, chunks, images, fonts)
- `/api/*` — API routes
- `/` — the dashboard
- `/test-sandbox` — the slider sandbox
- `/setup` — the workspace setup page
- All other non-`/blog/` paths

### Clean Redirect
The redirect response must use the plain `REDIRECT_URL` constant without any query parameters:

```javascript
if (scoreResult.variant === "lock") {
  return new Response(null, {
    status: 302,
    headers: {
      "Location": REDIRECT_URL,
      "Set-Cookie": cookie,
    },
  });
}
```

The `?score=X&ref=Y` parameters are removed because they are unused and caused the infinite loop when sub-resource paths appeared in the `ref` parameter.

### Post-Fix Behavior Summary
| Request path | Scoring? | If lock variant | If open variant |
|---|---|---|---|
| `/blog/the-future-of-edge-computing` | Yes | 302 → `/subscribe` | Pass through |
| `/blog/predictive-paywalls-explained` | Yes | 302 → `/subscribe` | Pass through |
| `/subscribe` | No (pass through) | N/A | Renders normally |
| `/_next/static/css/...` | No (pass through) | N/A | Serves CSS |
| `/_next/static/chunks/...` | No (pass through) | N/A | Serves JS |
| `/api/v1/edge-score` | No (pass through) | N/A | Handles API |
| `/test-sandbox` | No (pass through) | N/A | Renders normally |
| `/` (dashboard) | No (pass through) | N/A | Renders normally |

### Files Modified
- `src/lib/integration/cloudflare-worker.js` — Replace `/subscribe` bypass with `/blog/` scope check. Remove query params from redirect location.
- `src/lib/integration/worker-script-builder.ts` — Same changes in the generated worker template.

### No New Files
This revision modifies two existing files only.