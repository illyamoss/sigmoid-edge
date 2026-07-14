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
