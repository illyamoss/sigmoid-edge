# FEATURE SPECIFICATION: 02_historical_data_ingestion

## 1. PRODUCT CONTEXT & OBJECTIVE
Build the Extract-Transform-Load (ETL) pipeline and native machine learning training infrastructure. This feature accepts raw historical file uploads matching external GA4 BigQuery streams and Stripe customer objects, merges the rows using shared tracking indicators, computes RFM engagement features, and runs a pure TypeScript logistic regression fitting loop. It includes a secondary mock ingestion pipeline forced strictly behind an environment-gated testing environment variables guard.

## 2. FUNCTIONAL REQUIREMENTS & DATA FLOW
- **Data Inputs**: JSON file streaming arrays uploaded via the dashboard containing raw GA4 rows (`user_pseudo_id`, `event_name`, `event_timestamp`, `engagement_time_msec`) and Stripe Customer entries (`id`, `created`, `metadata.user_pseudo_id`).
- **Business Logic Processing**:
  1. Parse GA4 events to isolate specific reader traffic metrics, computing overall pageview counts, engagement session duration statistics, and days elapsed since peak activity.
  2. Map individual rows to Stripe subscription vectors to assign binary `0` or `1` labels.
  3. Ingest arrays into the `ml-logistic-regression` classifier engine to fit optimized statistical parameter vectors.
  4. **Testing Condition Guard**: If environment configuration sets `MODE=TESTING`, incoming GET triggers to the ingestion route must short-circuit production parsing loops, run an automated random high-fidelity vector seeder containing 400 casual bounces and 100 deep converting paths mimicking actual BigQuery metrics, and complete the fitting loop locally.
- **Data Outputs / Mutations**: Writes consolidated rows to `readers_features` and updates the workspace `override_rules` JSONB column with cached model weights and intercept metrics.

## 3. PRESENTATION LAYER (UI Components & UX Details)
- **Component Breakdowns**:
  - `FileUploaderZone`: An interactive zone supporting drag-and-drop actions for text data schemas. Displays localized loading progress flags during computation loops.
- **Design & Styling (shadcn/ui context)**:
  - Utilize `Card`, `Button`, and `Progress` abstract structural primitives. Zinc dark themes match border rules.
- **Animations & Micro-interactions**:
  - Pulsing skeleton masks play during server processing actions, transitioning into smooth fade animations once data commits successfully.

## 4. DEPENDENCIES & STEP-BY-STEP FILES TO GENERATE
1. **Domain Layer**: `src/core/domain/ingestion.schema.ts`
   - Zod object verification definitions checking incoming GA4 and Stripe payload files.
2. **Core Service Interface**: `src/core/services/classifier.interface.ts`
   - Abstract contract signatures defining `trainModel` and `predictPropensity` hooks.
3. **Infrastructure Service Layer**: `src/lib/integration/edge-classifier.service.ts`
   - Core file implementation matching the classifier contract using pure-JS math matrices.
4. **Use Case Layer**: `src/core/use-cases/process-historical-analytics.ts`
   - Orchestration file parsing text records, filtering database bounds, and executing operations.
5. **Routing/Page Layer**: `src/app/api/v1/train/route.ts`
   - Secure server routing handler invoking the ETL compilation runtime thread, accepting seed mock operations if `MODE=TESTING` flags match.

## 5. STREAMING AUTOMATION WEBHOOK NODE
Establish a high-speed API route to handle continuous, real-time subscription synchronization streams, completely cutting out manual data updates after initialization steps pass.

### 5.1 Real-Time Subscription Event Ingestion
- **Route Endpoint Layout**: `src/app/api/v1/stripe-stream/route.ts`
- **Data Inputs**: Incoming cryptographically signed HTTP POST webhooks arriving directly from external Stripe API event pools.
- **Business Logic Processing Pipeline**:
  1. Verify the inbound server payload signatures natively using the shared workspace endpoint key tracking string.
  2. Parse and intercept operational events matching structural tags `customer.subscription.created` and `customer.subscription.deleted`.
  3. Extract custom tracking metadata payloads (`user_pseudo_id`) attached to the transaction customer mapping schemas.
  4. Query the `readers_features` row corresponding to the reader matching that unique tracking ID.
  5. Mutate the table column parameter state, flipping `has_subscribed` values directly to `1` (for creation events) or dropping it to `0` (for deletions).
- **Data Outputs**: Automated state updates directly matching live transactional modifications across database tables.

---

## REVISION 1: Post-Training Threshold Computation and Mock Data Initialization

### Rationale
The existing training pipeline persists model weights, intercept, and standardization parameters to the workspace `override_rules` JSONB column but does not compute or persist data-driven variant thresholds. After training completes, the system must score all ingested readers using the freshly fitted model, compute percentile-based thresholds from the resulting score distribution, and persist those thresholds alongside the weights. Additionally, the mock data layer used in TESTING mode must genuinely train the logistic regression model on its generated reader dataset at initialization rather than using hardcoded weight constants.

### Threshold Computation Pipeline
After the `trainModel` call returns a fitted `ClassifierModel`, the use case must execute the following additional steps before persisting to the database:

1. **Score All Readers**: For each `RfmFeatureSet` in the compiled dataset, call `classifier.predictPropensity(features, model)` to produce a propensity score. Collect all scores into a single array.
2. **Compute Lock Threshold**: Calculate the 75th percentile of the score array. This value becomes `lockThreshold`.
3. **Compute Newsletter Threshold**: Calculate the 50th percentile (median) of the score array. This value becomes `newsletterThreshold`.
4. **Persist Thresholds**: Store `lockThreshold` and `newsletterThreshold` inside the `override_rules` JSONB object alongside the existing `weights`, `intercept`, `mean`, `scale`, `trainedAt`, and `sampleSize` fields.

### Use Case Layer Impact
- `src/core/use-cases/process-historical-analytics.ts` — After `trainModel` returns and before `saveOverrideRules` is called, iterate over the compiled `TrainingRow` feature vectors, score each one using the trained model, compute the 75th and 50th percentiles of the resulting score distribution, and include both threshold values in the `WorkspaceOverrideRules` object passed to `saveOverrideRules`.

### Mock Data Initialization Impact
- The mock data module (`src/lib/integration/mock/mock-data.ts`) must, at module load time, generate its 500 mock readers (400 casual + 100 converted), build `TrainingRow[]` from their features and `hasSubscribed` labels, call `EdgeClassifierService.trainModel()` synchronously, score all 500 readers using the trained model, compute the 75th and 50th percentile thresholds from the score distribution, and populate `MOCK_OVERRIDE_RULES` with the fitted weights, intercept, mean, scale, and both computed thresholds.
- The hardcoded weight and threshold constants previously present in the mock data module must be replaced entirely by the output of this training loop. No hand-picked heuristic values may remain.

### Testing Route Impact
- `src/app/api/v1/train/route.ts` — The GET handler for TESTING mode must execute the full threshold computation pipeline, not just the training step. The returned response must include the computed `lockThreshold` and `newsletterThreshold` values.

### No New Files
This revision modifies existing files only. No new files are generated.

---

## REVISION 2: Real GA4 BigQuery Format and Stripe SDK Pull

### Rationale
The original spec defined a simplified flat GA4 event schema and a manual Stripe JSON upload flow. In production, publishers export GA4 data from BigQuery in the real nested format, not a simplified one. Additionally, Stripe customer data should be pulled directly via the Stripe SDK rather than requiring a manual JSON export and upload. This revision replaces the input format and adds the Stripe SDK pull option.

### GA4 Format Change
The `ga4EventSchema` in `src/core/domain/ingestion.schema.ts` is replaced entirely by `ga4BigQueryEventSchema`. There is no simplified format. The new schema matches the real Google Analytics 4 BigQuery `events_*` table export format, which includes deeply nested `event_params` arrays and `event_timestamp` as a microsecond integer. See `07_real_data_integration.md` for the full schema specification.

### Stripe API Pull
A new `stripeSource` field is added to `ingestionRequestSchema` with values `"api"` (pull via Stripe SDK) or `"upload"` (manual JSON upload, default). When `stripeSource: "api"`, the `POST /api/v1/train` route calls a new `pullStripeCustomers()` function that paginates all Stripe customers via `stripe.customers.list()` and filters to those with `metadata.user_pseudo_id` set. The `STRIPE_SECRET_KEY` environment variable must be configured.

### Files Modified
- `src/core/domain/ingestion.schema.ts` — Replace `ga4EventSchema` with `ga4BigQueryEventSchema`, add `stripeSource` and `noGa4` fields to `ingestionRequestSchema`.
- `src/app/api/v1/train/route.ts` — Accept `stripeSource` flag, call Stripe puller when `"api"`, validate GA4 against BigQuery schema and transform.
- `src/app/page.tsx` — Add "Pull from Stripe" button.

### Files Created
- `src/lib/integration/ga4-transformer.ts` — Converts BigQuery format events to internal flat format.
- `src/lib/integration/stripe-puller.ts` — Paginates Stripe customers and filters by `metadata.user_pseudo_id`.

### Files Modified (Data)
- `src/lib/integration/mock-seeder.ts` — Outputs real BigQuery format instead of simplified format.
