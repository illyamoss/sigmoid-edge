# FEATURE SPECIFICATION: 10_dynamic_reader_tracking

## 1. PRODUCT CONTEXT & OBJECTIVE
The edge scoring system currently uses static feature vectors computed during batch training and stored in the `readers_features` table. These vectors are never updated between training runs. A reader can visit 100 blog posts and their propensity score remains identical to day one — the model cannot detect escalating engagement.

This spec adds real-time page view logging to the edge-score API. When a reader visits a blog post through the Cloudflare Worker, the worker sends the engagement time alongside the scoring request. The edge-score use case updates the reader's feature vector in the database before computing the propensity score. Each visit increments frequency, resets recency, recalculates the rolling engagement average, and increments velocity. The model scores against the freshly updated features.

## 2. FUNCTIONAL REQUIREMENTS & DATA FLOW

### 2.1 Logged Page View Request
The edge-score API (`POST /api/v1/edge-score`) accepts an optional `logPageView` field in the request body:

```typescript
{
  workspaceSlug: string;
  readerToken: string;
  logPageView?: {
    engagementTimeMsec: number;  // milliseconds, from the GA4 event param
  };
}
```

The Cloudflare Worker includes this field on every blog request it intercepts.

### 2.2 Feature Update Rules
When `logPageView` is present, the following updates are applied to the reader's feature vector before scoring:

| Feature | Update Rule | Rationale |
|---------|------------|-----------|
| `frequency` | `frequency + 1` | Each page view increments the lifetime page view count. A reader with 30 page views is more engaged than one with 3. |
| `recency` | `0` | The reader just visited — recency measures hours since last visit. Set to 0 now; the next visit will find a positive value. |
| `engagement` | `(engagement * (frequency - 1) + engagementTimeMsec) / frequency` | Rolling average of session duration. The first visit sets it to `engagementTimeMsec`. Subsequent visits blend the new value into the running average. |
| `velocity` | `min(velocity + 1, 50)` | Each page view increments the trailing-48-hour click count. Capped at 50 to prevent unbounded growth. |

### 2.3 Create-on-First-Visit
If no reader record exists for the given `readerToken` (first visit), one is created with:
- `frequency: 1`
- `recency: 0`
- `engagement: <engagementTimeMsec>`
- `velocity: 1`
- `hasSubscribed: 0`

### 2.4 Scoring After Update
After the feature vector is updated and persisted, the existing scoring pipeline runs:
1. Build the feature vector from the freshly updated record.
2. Compute `predictPropensity(features, model)`.
3. Compare against the workspace's `lockThreshold`.
4. Return `{ variant, score, readerToken }`.

This means the score for the **current** request reflects the reader's engagement **including** this visit. If a reader visits 15 times in a day, their score climbs in real-time, and they may cross the lock threshold mid-session.

### 2.5 Repository Interface
A new method is added to `ReaderFeaturesRepositoryPort`:

```typescript
export interface ReaderFeaturesRepositoryPort {
  // ... existing methods ...

  logPageView(
    workspaceId: string,
    readerToken: string,
    engagementTimeMsec: number,
  ): Promise<ReaderFeaturesRecord>;
}
```

The method returns the updated `ReaderFeaturesRecord` so the calling use case can immediately use it for scoring without a second database query.

### 2.6 Supabase (Drizzle) Implementation
The real repository (`src/lib/integration/readers-features.repository.ts`) uses a SQL upsert with computed columns:

```sql
INSERT INTO readers_features (workspace_id, reader_token, frequency, recency, engagement, velocity, created_at, updated_at)
VALUES ($1, $2, 1, 0, $3, 1, NOW(), NOW())
ON CONFLICT ON CONSTRAINT readers_features_workspace_token_unique
DO UPDATE SET
  frequency = readers_features.frequency + 1,
  recency = 0,
  engagement = (readers_features.engagement * (readers_features.frequency) + $3) / (readers_features.frequency + 1),
  velocity = LEAST(readers_features.velocity + 1, 50),
  updated_at = NOW()
RETURNING frequency, recency, engagement, velocity, has_subscribed, subscribed_at;
```

### 2.7 Mock Implementation
The mock repository (`src/lib/integration/mock/mock-readers-features.repository.ts`) stores readers in an in-memory `Map<string, ReaderFeaturesRecord>`. The `logPageView` method:
1. Looks up the reader by token in the map.
2. If found, applies the update rules and stores the updated record.
3. If not found, creates a new record with default values.
4. Returns the updated record.

## 3. CLOUDFLARE WORKER CHANGES
The worker's `fetchEdgeScore` call must include `logPageView` with an estimated engagement time. Since the worker has no access to GA4 engagement metrics at the network level, it uses a **default engagement time of 15,000 msec** (15 seconds) for all page views. This is a reasonable average session duration for a blog article and provides meaningful differentiation between a quick scan and a deep read.

```javascript
async function fetchEdgeScore(origin, workspaceSlug, readerToken) {
  const url = origin.replace(/\/$/, "") + EDGE_SCORE_PATH;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspaceSlug,
      readerToken,
      logPageView: { engagementTimeMsec: 15000 },
    }),
  });
  // ...
}
```

The `worker-script-builder.ts` generated template must include the same request body.

## 4. FILES TO MODIFY (8 files)

### 4.1 Domain Layer
1. **`src/core/domain/ingestion.schema.ts`** — Add `logPageView` optional field to the edge-score request type. Not a Zod schema (the edge-score API uses its own inline schema in `edge-score/route.ts`), just a type export.

### 4.2 Service Interfaces
2. **`src/core/services/repository.interface.ts`** — Add `logPageView(workspaceId, readerToken, engagementTimeMsec): Promise<ReaderFeaturesRecord>` to `ReaderFeaturesRepositoryPort`.

### 4.3 Use Case Layer
3. **`src/core/use-cases/compute-edge-score.ts`** — Accept an optional `logPageView` parameter. If present, call `readerFeaturesRepository.logPageView(workspaceId, readerToken, engagementTimeMsec)` before building the feature vector and scoring. Use the returned updated record instead of the original lookup.

### 4.4 Route Layer
4. **`src/app/api/v1/edge-score/route.ts`** — Parse the optional `logPageView` object from the request body and pass it to `computeEdgeScore`.

### 4.5 Infrastructure Layer
5. **`src/lib/integration/readers-features.repository.ts`** — Add `logPageView` method using Drizzle upsert with feature update formulas.
6. **`src/lib/integration/mock/mock-readers-features.repository.ts`** — Add `logPageView` method with in-memory feature updates.
7. **`src/lib/integration/cloudflare-worker.js`** — Include `logPageView: { engagementTimeMsec: 15000 }` in the edge-score API request body.
8. **`src/lib/integration/worker-script-builder.ts`** — Same change in the generated worker script template.

## 5. BEHAVIOR AFTER IMPLEMENTATION

| Visit # | frequency | recency | engagement | velocity | Approx score | Variant |
|---------|-----------|---------|------------|----------|-------------|---------|
| 1 | 1 | 0 | 15000 | 1 | ~0.8% | open |
| 2 | 2 | 0 | 15000 | 2 | ~0.8% | open |
| 5 | 5 | 0 | 15000 | 5 | ~0.9% | open |
| 10 | 10 | 0 | 15000 | 10 | ~1.5% | open |
| 25 | 25 | 0 | 15000 | 25 | ~5.2% | lock |
| 50 | 50 | 0 | 15000 | 50 | ~18% | lock |

The exact thresholds depend on the trained model weights and lockThreshold, but the key point is the score **rises over time** with engagement. A brand-new reader always gets open. A returning reader who visits frequently crosses the threshold naturally.

## 6. RELATIONSHIP TO PRIOR SPECS
- This spec adds real-time mutation to the `readers_features` table established in `01_database_and_models.md`.
- The `ReaderFeaturesRepositoryPort` was established in `02_historical_data_ingestion.md` and the mock repository in the same spec's revisions.
- The edge-score API route was established in `03_edge_scoring_and_middleware.md`.
- The Cloudflare Worker behavior was last modified in REVISION 5 of `09_reader_simulation_and_subscriber_bypass.md`.
- The worker-script-builder was created in `04_publisher_analytics_dashboard.md` and modified in `09_reader_simulation_and_subscriber_bypass.md`.
- This is the first spec that introduces real-time (per-request) database writes.

## 7. IMPLEMENTATION STATUS: COMPLETE

**Implemented files (7 total):**

| File | Change |
|------|--------|
| `src/core/services/repository.interface.ts` | Added `logPageView` to `ReaderFeaturesRepositoryPort` |
| `src/core/use-cases/compute-edge-score.ts` | Extended `ComputeEdgeScoreParams` with optional `logPageView`; branches on presence |
| `src/app/api/v1/edge-score/route.ts` | Extended `edgeScoreBodySchema`; passes `logPageView` to use case |
| `src/lib/integration/readers-features.repository.ts` | Added `logPageView` with Drizzle atomic upsert + `RETURNING` |
| `src/lib/integration/mock/mock-readers-features.repository.ts` | Rewrote with mutable `Map` + in-memory `logPageView` |
| `src/lib/integration/cloudflare-worker.js` | Added `logPageView: { engagementTimeMsec: 15000 }` to `fetchEdgeScore` |
| `src/lib/integration/worker-script-builder.ts` | Same change in generated template |