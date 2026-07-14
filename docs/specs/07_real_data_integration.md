# FEATURE SPECIFICATION: 07_real_data_integration

## 1. PRODUCT CONTEXT & OBJECTIVE
Replace the simplified, hand-crafted GA4 event schema with the real Google Analytics 4 BigQuery export format, and eliminate manual Stripe customer JSON uploads by pulling subscription data directly via the Stripe SDK. The ingestion pipeline must accept the real BigQuery export format natively — there is no "simplified" alternative. For Stripe, the initial historical training must use the Stripe API to paginate through all customers with `metadata.user_pseudo_id` set, removing the requirement for the publisher to manually export and upload a Stripe JSON file.

## 2. FUNCTIONAL REQUIREMENTS & DATA FLOW

### 2.1 GA4 Real BigQuery Format
The ingestion pipeline must accept the real Google Analytics 4 BigQuery `events_*` table export format. This is the format produced natively when a publisher exports their GA4 data from BigQuery. The schema is:

```
event_date (STRING)                    — "YYYYMMDD"
event_timestamp (INT64)                — microseconds since Unix epoch
event_name (STRING)
event_params (ARRAY<STRUCT>)           — key-value pairs
  ├─ key (STRING)
  └─ value (STRUCT)
       ├─ string_value (STRING)
       ├─ int_value (INT64)            — in JSON BigQuery exports this is a STRING
       ├─ float_value (FLOAT64)
       └─ double_value (FLOAT64)
event_previous_timestamp (INT64)
event_value_in_usd (FLOAT64)
event_bundle_sequence_id (INT64)
event_server_timestamp_offset (INT64)
user_pseudo_id (STRING)
user_id (STRING)
user_first_touch_timestamp (INT64)
user_ltv (STRUCT)
device (STRUCT)
geo (STRUCT)
traffic_source (STRUCT)
ecommerce (STRUCT)
items (ARRAY<STRUCT>)
collected_traffic_source (STRUCT)
privacy_info (STRUCT)
```

From this full schema, the pipeline extracts only:
- `user_pseudo_id` (STRING) — maps directly to reader identity.
- `event_name` (STRING) — maps directly; `"page_view"` events are counted for the frequency metric.
- `event_timestamp` (INT64, microseconds) — divided by 1000 to produce a JavaScript Date in milliseconds.
- `engagement_time_msec` — extracted from `event_params` by finding the entry where `key === "engagement_time_msec"` and reading `value.int_value` (which is a string in BigQuery JSON exports and must be parsed with `Number()`).

### 2.2 Stripe API Pull
For the initial historical training, the publisher must not need to upload a Stripe JSON file. Instead, the `POST /api/v1/train` endpoint accepts a `stripeSource: "api"` flag and:

1. Resolves the Stripe client from `STRIPE_SECRET_KEY` environment variable.
2. Paginates through all customers via `stripe.customers.list({ limit: 100 })`, with automatic pagination using `starting_after`.
3. For each customer, checks if `metadata.user_pseudo_id` is set and non-empty.
4. If set, extracts `id`, `created` (Unix timestamp in seconds), and `metadata.user_pseudo_id` into the internal `StripeCustomer` format used by the ETL pipeline.
5. Returns total customers found and how many had `user_pseudo_id` metadata.
6. There is no cap on customer count — the pagination runs to completion.

### 2.3 Data Join
The two datasets are joined by `user_pseudo_id`:
- GA4 events carry `user_pseudo_id` natively (GA4's client ID / device ID).
- Stripe customers must have `metadata.user_pseudo_id` set by the publisher's checkout implementation (e.g., when creating a Stripe Checkout Session, the publisher passes `metadata.user_pseudo_id` from the reader's cookie).
- The ETL pipeline matches GA4 `user_pseudo_id` values against Stripe `metadata.user_pseudo_id` values to assign binary labels (1 = subscribed, 0 = not subscribed).

### 2.4 Business Logic Processing
1. Accept raw GA4 BigQuery JSON export array at `POST /api/v1/train`.
2. Validate each event against the real BigQuery Zod schema.
3. Transform each event: extract `user_pseudo_id`, `event_name`, convert `event_timestamp` from microseconds to Date, find `engagement_time_msec` in `event_params`.
4. If `stripeSource` is `"api"`, paginate all Stripe customers via SDK and filter by `metadata.user_pseudo_id`.
5. Continue with existing ETL pipeline: RFM computation, model training, threshold computation, persistence.

## 3. PRESENTATION LAYER (UI Components & UX Details)
- **FileUploaderZone**: The existing uploader component remains unchanged. It still accepts a single JSON file and posts it to `/api/v1/train`. The only difference is the expected format is now the real BigQuery export, not a simplified format.
- **"Train from Stripe" Button**: The dashboard must render a secondary button labeled "Pull from Stripe" that calls `POST /api/v1/train` with `stripeSource: "api"` and `noGa4: true`. This button is rendered next to the `FileUploaderZone` in the Data Ingestion card. It shows a loading state while the Stripe pull + training runs.
- **Design & Styling (shadcn/ui context)**:
  - The "Pull from Stripe" button uses the `Button` `secondary` variant to visually distinguish it from the file upload trigger.
- **Animations & Micro-interactions**:
  - The Stripe pull button shows a rotating spinner (framer-motion) during the API call.

## 4. FILES TO MODIFY

### 4.1 `src/core/domain/ingestion.schema.ts`
- Remove the flat `ga4EventSchema` entirely. There is no simplified format.
- Add `ga4BigQueryEventSchema` matching the real BigQuery export format described in §2.1.
- Add `InternalGa4Event` type (post-transform, used by the ETL pipeline internally).
- Add `stripeSource?: "api" | "upload"` to `ingestionRequestSchema` (default `"upload"`).
- Add `noGa4?: boolean` to allow Stripe-only training without GA4 events.

### 4.2 `src/lib/integration/ga4-transformer.ts` (new)
- `transformBigQueryEvent(raw: Ga4BigQueryEvent): InternalGa4Event`:
  - Maps `user_pseudo_id` and `event_name` directly.
  - Converts `event_timestamp` from microseconds to Date: `new Date(raw.event_timestamp / 1000)`.
  - Extracts `engagement_time_msec` from `event_params`: finds entry with `key === "engagement_time_msec"`, reads `Number(value.int_value)`, defaults to `0` if not found.
- `transformBigQueryEvents(events: Ga4BigQueryEvent[]): InternalGa4Event[]` — batch transform.

### 4.3 `src/lib/integration/stripe-puller.ts` (new)
- `pullStripeCustomers(): Promise<StripeCustomer[]>`:
  - Creates Stripe client from `STRIPE_SECRET_KEY`.
  - Paginates `stripe.customers.list({ limit: 100 })` using `starting_after`.
  - Filters to customers with `metadata.user_pseudo_id` set and non-empty.
  - Returns `{ id, created, metadata: { user_pseudo_id } }[]`.
  - Throws descriptive error if `STRIPE_SECRET_KEY` is missing.

### 4.4 `src/app/api/v1/train/route.ts`
- Before Zod validation, check if `stripeSource === "api"`:
  - If API mode: call `pullStripeCustomers()`, ignore GA4 from body (or accept `noGa4: true`).
  - If upload mode (default or `"upload"`): validate GA4 against BigQuery schema, transform via `transformBigQueryEvents()`.
- Proceed with existing ETL pipeline using transformed events + pulled customers.

### 4.5 `src/app/page.tsx`
- Add a "Pull from Stripe" button section next to the `FileUploaderZone` in the Data Ingestion card.
- Button sends `POST /api/v1/train` with `{ workspaceId, stripeSource: "api", noGa4: true }`.
- Shows loading spinner during the call, calls `router.refresh()` on completion.

### 4.6 `src/lib/integration/mock-seeder.ts`
- Update `generateMockSeedData()` to output the real BigQuery format:
  - `event_timestamp` as microsecond integers (not Date objects).
  - `event_params` array with `engagement_time_msec` key-value pairs.
  - Include the full standard field set matching the BigQuery schema.

## 5. KEY DESIGN DECISIONS
1. **One format only.** No auto-detection, no dual schema. The simplified `ga4EventSchema` is deleted. Only the real BigQuery format exists.
2. **Transformation is explicit.** Raw BigQuery events are validated against `ga4BigQueryEventSchema`, then transformed to an internal flat format. The pipeline after transformation is unchanged.
3. **`engagement_time_msec` defaults to 0** when not found in `event_params`. BigQuery exports may omit this parameter for events where engagement isn't tracked.
4. **Stripe pagination is unbounded.** The system fetches all pages until `data.length < 100`. For typical publishers (<10k customers) this takes a few seconds.
5. **The internal flat type is NOT exported from `ingestion.schema.ts`.** It lives in the transformer module, making clear it is an implementation detail, not a contract.
6. **The webhook (`/api/v1/stripe-stream`) continues to handle real-time updates.** The puller is only for the one-time initial historical training.

## 6. RELATIONSHIP TO PRIOR SPECS
- This spec replaces the GA4 input format defined in `02_historical_data_ingestion.md` §4.1 (the `ga4EventSchema`). See REVISION 1 of that spec.
- The Stripe puller complements the real-time webhook in `02_historical_data_ingestion.md` §5.1 (`/api/v1/stripe-stream`) by providing the initial historical batch import.
- The `ingestionRequestSchema` was established in `02_historical_data_ingestion.md` §4.1 and is modified here to add `stripeSource` and `noGa4` fields.
- The seed data format change is tracked in REVISION 1 of `06_workspace_setup_and_seeding.md`.

## 7. REAL GA4 BIGQUERY EXPORT NOTES
The real GA4 BigQuery export produces one row per event. The `event_timestamp` is in microseconds (not milliseconds). A JSON export from BigQuery will have:

- `event_timestamp` as a numeric value like `1705334400000000` (13 digits = microseconds, not 10 digits = seconds).
- `event_params` as an array of objects like `[{"key":"engagement_time_msec","value":{"int_value":"4500"}}, ...]`.
- `value.int_value` as a **string** (BigQuery JSON exports represent INT64 as strings to preserve precision).

The transformer must account for all three of these characteristics.