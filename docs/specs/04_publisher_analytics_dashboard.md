# FEATURE SPECIFICATION: 04_publisher_analytics_dashboard

## 1. PRODUCT CONTEXT & OBJECTIVE
Design the core client control panel interface for independent publishers. This view serves as the main hub to display statistical conversion performance improvements, monitor overall network financial volume, track active reader bucket divisions, and export edge deployment scripts seamlessly.

## 2. FUNCTIONAL REQUIREMENTS & DATA FLOW
- **Data Inputs**: Relational database records read from the logs table matching the publisher's tracking context.
- **Business Logic Processing**:
  1. Calculate historical baseline conversion variables against active live data logs.
  2. Compute real-time financial tracking values across transactions.
  3. Parse raw worker script text layouts into dynamic configuration parameters.
- **Data Outputs / Mutations**: Configuration changes inside workspace parameters update JSON layout rows.

## 3. PRESENTATION LAYER (UI Components & UX Details)
- **Component Breakdown**:
  - `MetricsGridTelemetry`: High-impact KPI display rendering Conversion Lift, Total Revenue, and Costs.
  - `SegmentationSheet`: Reactive tracking matrix detailing parameters and target bucket values.
  - `WorkerScriptExporter`: Visual card wrapper housing script copies alongside interaction indicator triggers.
- **Design & Styling (shadcn/ui context)**:
  - Utilize `Table`, `Card`, `Badge`, and `Button` slate-neutral design definitions.
- **Animations & Micro-interactions**:
  - Rows expand using clean framer-motion stagger steps, while copying script text shifts button layouts instantly.

## 4. DEPENDENCIES & STEP-BY-STEP FILES TO GENERATE
1. **Feature UI Layer**: `src/components/features/dashboard/metrics-grid.tsx`
2. **Feature UI Layer**: `src/components/features/dashboard/segmentation-table.tsx`
3. **Feature UI Layer**: `src/components/features/dashboard/worker-exporter.tsx`
4. **Routing/Page Layer**: `src/app/(dashboard)/[workspaceId]/page.tsx`
   - Server Component path aggregating and passing metrics down to pure layout views.

---

## REVISION 1: Dashboard at Root Route, Single-Workspace Resolution, and Data-Driven Threshold Display

### Rationale
This application is deployed per-publisher: a single client hosts a single blog website with a single workspace. There is no multi-tenant routing requirement and no need for a workspace ID in the URL path. The dashboard must serve as the root landing page at `/`, resolving the active workspace from an environment variable rather than a dynamic route parameter. Additionally, the `WorkerScriptExporter` component must display the data-driven threshold values computed from the workspace's training data (see REVISION 1 of `02_historical_data_ingestion.md`), not hardcoded heuristic values.

### Route Changes
1. The dashboard page must move from `src/app/(dashboard)/[workspaceId]/page.tsx` to `src/app/page.tsx`. The `[workspaceId]` dynamic segment is removed entirely.
2. The dashboard layout must move from `src/app/(dashboard)/[workspaceId]/layout.tsx` to `src/app/layout.tsx` (or be merged into the existing root layout).
3. The `(dashboard)` route group directory and all files within it must be deleted.
4. The root `src/app/page.tsx` must resolve the active workspace by reading the `WORKSPACE_SLUG` environment variable, falling back to `"default"` if unset, and passing that slug to the `buildComputeDashboardMetrics` use case via the repository factory.

### Workspace Resolution
- An environment variable `WORKSPACE_SLUG` must be added to `.env.example` and `.env.local`. In TESTING mode, this value is `"default"`. In production, the publisher sets this to their workspace slug.
- The dashboard page must call `workspaceRepository.findBySlug(process.env.WSPACE_SLUG ?? "default")` to resolve the workspace ID, then pass that ID to `computeDashboardMetrics`.
- If the workspace is not found, the page must render a configuration error state instructing the publisher to set the `WORKSPACE_SLUG` environment variable.

### WorkerScriptExporter Threshold Display
- The `WorkerConfigParams` type in `src/core/domain/dashboard.types.ts` must replace the `openThreshold` and `newsletterThreshold` fields with `lockThreshold` and `newsletterThreshold` respectively, reflecting the inverted variant logic from REVISION 1 of `03_edge_scoring_and_middleware.md`.
- The `buildWorkerConfig` function in `src/core/use-cases/compute-dashboard-metrics.ts` must read `lockThreshold` and `newsletterThreshold` from the workspace's `overrideRules` and populate the `WorkerConfigParams` accordingly.
- The `WorkerScriptExporter` component must display both threshold values in its configuration summary grid, showing the data-driven values computed from the workspace's training data.

### Files Modified
- `src/app/page.tsx` — Becomes the dashboard, resolving workspace from `WORKSPACE_SLUG` env var.
- `src/app/layout.tsx` — Updated to include dashboard navigation (links to `/` and `/blog`).
- `src/core/domain/dashboard.types.ts` — `WorkerConfigParams` threshold field names updated.
- `src/core/use-cases/compute-dashboard-metrics.ts` — `buildWorkerConfig` reads thresholds from `overrideRules`.
- `src/components/features/dashboard/worker-exporter.tsx` — Display updated threshold field names.
- `.env.example` and `.env.local` — Add `WORKSPACE_SLUG`.

### Files Deleted
- `src/app/(dashboard)/[workspaceId]/page.tsx`
- `src/app/(dashboard)/[workspaceId]/layout.tsx`
- The entire `src/app/(dashboard)/` directory.

### No New Files
This revision modifies and deletes existing files only. No new feature components are generated.

---

## REVISION 2: FileUploaderZone Integration for Model Retraining

### Rationale
The dashboard currently displays metrics, segments, and the worker script exporter but provides no mechanism for the publisher to upload new training data or retrain the model from within the dashboard interface. The `FileUploaderZone` component (established in `02_historical_data_ingestion.md`) already handles JSON file uploads and posts to `POST /api/v1/train`, but it is not rendered anywhere in the dashboard. This revision wires the `FileUploaderZone` into the root dashboard page so the publisher can upload GA4 + Stripe seed data directly, triggering the full ETL pipeline (training, threshold computation, persistence) without leaving the dashboard.

### Integration Changes
1. The root dashboard page (`src/app/page.tsx`) must render the `FileUploaderZone` component as the first section above the `MetricsGridTelemetry`, inside a card with a heading like "Data Ingestion & Model Training" and a brief description explaining that uploading GA4 + Stripe JSON retrains the edge scoring model.
2. The dashboard page must resolve the workspace ID from the workspace record returned by `workspaceRepository.findBySlug(workspaceSlug)` and pass it as the `workspaceId` prop to `FileUploaderZone`. The `FileUploaderZone` component already merges this `workspaceId` into the POST body sent to `/api/v1/train`.
3. After a successful upload, the `FileUploaderZone` `onUploadComplete` callback must trigger a full page refresh (`router.refresh()`) so the dashboard re-fetches metrics, segments, and the worker script with the newly trained model data.

### FileUploaderZone Props
The `FileUploaderZone` component already accepts `workspaceId`, `endpoint` (defaults to `/api/v1/train`), `onUploadComplete`, and `onUploadError` props. No changes to the component itself are required. The dashboard page passes:
- `workspaceId={workspace.id}` — the resolved workspace UUID
- `endpoint="/api/v1/train"` — the existing training API (already the default)
- `onUploadComplete` — a handler that calls `router.refresh()` to reload server component data

### Files Modified
- `src/app/page.tsx` — Add `FileUploaderZone` import, resolve workspace ID, render uploader above metrics grid, add refresh-on-complete handler.

### No New Files
This revision modifies the existing dashboard page only. No new feature components are generated. The `FileUploaderZone` component is reused from `02_historical_data_ingestion.md`.
