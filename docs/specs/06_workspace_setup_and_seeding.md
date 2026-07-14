# FEATURE SPECIFICATION: 06_workspace_setup_and_seeding

## 1. PRODUCT CONTEXT & OBJECTIVE
Establish the first-run workspace initialization flow and the realistic seed data generation tooling required for end-to-end testing against a real Supabase database. This module provides a `/setup` page where a publisher creates their single workspace via a form, a `POST /api/v1/workspace` API endpoint that inserts the workspace row into the `workspaces` table, and a standalone Node script that generates realistic GA4 and Stripe JSON files for upload through the dashboard's `FileUploaderZone` component. Together these features close the gap between the mock-testing mode and production-realistic testing with a live database.

## 2. FUNCTIONAL REQUIREMENTS & DATA FLOW
- **Data Inputs**: Publisher-entered workspace name and slug via the setup form. Seed data generator configuration (reader counts, distribution ratios) via hardcoded constants in the script.
- **Business Logic Processing**:
  1. The setup page checks whether any workspace row exists in the `workspaces` table. If one exists, the page redirects to `/` (dashboard). If none exists, it renders the `WorkspaceSetupForm`.
  2. The workspace creation API validates the submitted name and slug, auto-derives the slug from the name if the slug field is left blank, and inserts a new row into `workspaces` with `billing_status` defaulting to `"trialing"`.
  3. The seed data generator script produces two JSON files: `ga4-events.json` containing an array of GA4 event objects matching the `ga4EventSchema`, and `stripe-customers.json` containing an array of Stripe customer objects matching the `stripeCustomerSchema`. The distribution is tuned to produce realistic propensity score thresholds: approximately 600 casual readers, 250 moderately engaged readers, and 150 converting readers.
- **Data Outputs / Mutations**: A new `workspaces` row is created. Two JSON seed files are written to disk. No other mutations occur from this module directly; the subsequent upload of seed files through the `FileUploaderZone` triggers the existing `/api/v1/train` ETL pipeline which handles all reader features and model training persistence.

## 3. PRESENTATION LAYER (UI Components & UX Details)
- **Component Breakdowns**:
  - `WorkspaceSetupForm`: Client component rendering a centered card containing a name text input, a slug text input (auto-populated from the name via kebab-case conversion, editable), and a submit button. On successful submission, the form stores the returned workspace ID in local state and redirects to `/` (dashboard). On error, an error message is displayed below the form.
  - `SetupPage`: Server Component that queries the `workspaces` table for any existing row. If a workspace exists, it redirects to `/` using `redirect()` from `next/navigation`. If no workspace exists, it renders the `WorkspaceSetupForm` inside a centered layout with a brief instructional heading.
- **Design & Styling (shadcn/ui context)**:
  - Utilize `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `Input`, and `Button` primitives from the zinc theme library.
  - The setup page uses a vertically centered full-height layout with a max-width of 480px for the card.
- **Animations & Micro-interactions**:
  - The submit button shows a spinner state (rotating border animation) during the API call using framer-motion. No other animations are required for this module.

## 4. DEPENDENCIES & STEP-BY-STEP FILES TO GENERATE
1. **Routing/Page Layer**: `src/app/setup/page.tsx`
   - Server Component that queries the database for an existing workspace. If found, redirects to `/`. If not found, renders the `WorkspaceSetupForm` within a centered layout.
2. **Feature UI Layer**: `src/components/features/setup/workspace-setup-form.tsx`
   - Client component with name and slug inputs, auto-derivation of slug from name, submit handler calling `POST /api/v1/workspace`, and redirect to `/` on success.
3. **Routing/API Layer**: `src/app/api/v1/workspace/route.ts`
   - `POST` handler accepting `{ name, slug }` body, validating with Zod, inserting into the `workspaces` table via Drizzle ORM, and returning `{ id, slug, name }`. Uses the real database repositories directly (not the repository factory) since workspace creation is a production-only operation that must always write to the real database regardless of `MODE`.
4. **Infrastructure/Tooling**: `scripts/generate-seed-data.ts`
   - Standalone Node script executed via `npx tsx scripts/generate-seed-data.ts`. Generates realistic GA4 events and Stripe customers for 1,000 readers with a 600/250/150 distribution. Writes `./seed-data/ga4-events.json` and `./seed-data/stripe-customers.json` to disk. The script uses a seeded random generator for deterministic output across runs.

## 5. SEED DATA GENERATOR SPECIFICATION
The seed data generator must produce two JSON files that are directly uploadable through the `FileUploaderZone` component (which posts to `POST /api/v1/train`).

### 5.1 Reader Distribution
- **Casual Readers (600)**: 1-3 GA4 events per reader, engagement time 500-8,000 msec, events spread across 7-30 days ago. No Stripe customer records.
- **Moderately Engaged Readers (250)**: 4-8 GA4 events per reader, engagement time 8,000-25,000 msec, events spread across 2-14 days ago. No Stripe customer records.
- **Converting Readers (150)**: 8-20 GA4 events per reader, engagement time 15,000-55,000 msec, events within the last 7 days. Each converter has a matching Stripe customer object with `metadata.user_pseudo_id` matching their GA4 `user_pseudo_id`.

### 5.2 Output File Formats
- `ga4-events.json`: A JSON array of objects matching the `ga4EventSchema` from `src/core/domain/ingestion.schema.ts`. Each object has `user_pseudo_id`, `event_name`, `event_timestamp` (ISO 8601 string), and `engagement_time_msec`.
- `stripe-customers.json`: A JSON array of objects matching the `stripeCustomerSchema`. Each object has `id`, `created` (Unix timestamp in seconds), and `metadata.user_pseudo_id`.

### 5.3 Upload Format
The `FileUploaderZone` component expects a single JSON file containing `{ ga4: [...], stripe: [...] }`. The seed data generator must also produce a combined `./seed-data/combined-upload.json` file in this format so the publisher can upload a single file without manual merging.

### 5.4 Event Name Distribution
GA4 event names must cycle through `page_view`, `session_start`, `scroll`, and `click` to simulate realistic traffic patterns. The `page_view` event must appear approximately 25% of the time so the frequency metric (pageview count) produces a meaningful distribution.

## 6. WORKSPACE CREATION API SPECIFICATION
The `POST /api/v1/workspace` endpoint must:

1. Accept a JSON body with `name` (required, 1-120 chars) and `slug` (optional, 1-160 chars, matching `^[a-z0-9-]+$`). If `slug` is omitted, derive it from `name` by converting to lowercase, replacing spaces with hyphens, and stripping non-alphanumeric characters.
2. Validate the body with a Zod schema.
3. Insert a new row into the `workspaces` table via the Drizzle ORM `db` client, with `billingStatus` defaulting to `"trialing"` and all other nullable fields set to `null`.
4. Return `{ id, slug, name }` with HTTP 201 on success, or `{ error, details }` with HTTP 400 on validation failure, or `{ error }` with HTTP 500 on database error.
5. This endpoint must always use the real Drizzle database client, not the repository factory mock layer, because workspace creation is a one-time production operation that must persist regardless of `MODE`.

## 7. RELATIONSHIP TO PRIOR SPECS
- The setup page at `/setup` is accessible via direct URL navigation. It is not linked from the `NavigationBar` (spec `05_blog_and_navigation.md`) because it is a one-time setup page that should not clutter the persistent navigation.
- After workspace creation, the dashboard at `/` (spec `04_publisher_analytics_dashboard.md` REVISION 1) resolves the workspace by the `WORKSPACE_SLUG` environment variable, which the publisher sets to the slug created during setup.
- The seed data files are uploaded through the `FileUploaderZone` component established in spec `02_historical_data_ingestion.md`. The `FileUploaderZone` is added to the dashboard page per REVISION 2 of `04_publisher_analytics_dashboard.md`.
- The existing `POST /api/v1/train` endpoint processes the uploaded seed data through the full ETL pipeline: RFM computation, model training, threshold computation, and persistence to `override_rules`.

## 8. END-TO-END TESTING WORKFLOW
The following steps describe the complete realistic testing workflow enabled by this module:

1. Run `npx drizzle-kit push` to create database tables in Supabase.
2. Set `MODE=PRODUCTION` and `WORKSPACE_SLUG=default` in `.env.local`.
3. Start the Next.js dev server: `npm run dev`.
4. Visit `http://localhost:3000/setup` and create a workspace (e.g., name "My Blog", slug "default").
5. Run `npx tsx scripts/generate-seed-data.ts` to generate seed JSON files.
6. Upload `seed-data/combined-upload.json` through the `FileUploaderZone` on the dashboard at `/`.
7. The system trains the model, computes thresholds, and persists everything to Supabase.
8. Refresh the dashboard to see real KPIs, segments, and the worker script with trained thresholds.
9. Start the Cloudflare Worker: `npx wrangler dev --port 8787`.
10. Visit `http://localhost:8787/blog/[slug]` to see the paywall variant injected by the worker based on the real trained model.

---

## REVISION 1: Seed Data Format and Stripe Pull Replacement

### Rationale
The original spec defined the seed data generator outputting a simplified GA4 event format. Per `07_real_data_integration.md`, the pipeline now accepts only the real GA4 BigQuery export format. The seed data generator must output the real format. Additionally, the Stripe JSON upload is no longer the primary method — the publisher can use the "Pull from Stripe" button on the dashboard instead. The seed data generator should still produce Stripe customers for testing, but the spec must note that the Stripe SDK pull is the recommended path.

### Seed Data Format Changes
The `scripts/generate-seed-data.ts` script must output the real GA4 BigQuery export format instead of the simplified flat format. Specifically:
- `event_timestamp` must be a microsecond integer (not a Date), matching the BigQuery export format.
- Events must include an `event_params` array containing `engagement_time_msec` as a key-value pair, matching the BigQuery nested struct format.
- Events must include the standard BigQuery fields: `event_date`, `event_previous_timestamp`, `user_first_touch_timestamp`, `device`, `geo`, etc.

### Stripe Pull Replacement
The end-to-end testing workflow in §8 is updated to reflect that Stripe data can be pulled via the SDK rather than requiring a JSON upload. Step 6 is modified to read:
> 6. Upload `seed-data/ga4-events.json` through the `FileUploaderZone` on the dashboard at `/`. Then click "Pull from Stripe" to pull Stripe customer data directly via the API. The system trains the model, computes thresholds, and persists everything to Supabase.

### Files Modified
- `scripts/generate-seed-data.ts` — Outputs real BigQuery format with `event_params`, microsecond timestamps, and full field set.
- `src/lib/integration/mock-seeder.ts` — Same format update for the in-memory mock seeder.

### No New Files
This revision modifies existing files only. No new files are generated.
