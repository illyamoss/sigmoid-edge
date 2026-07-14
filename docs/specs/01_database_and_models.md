# FEATURE SPECIFICATION: 01_database_and_models

## 1. PRODUCT CONTEXT & OBJECTIVE
Establish the persistent relational storage foundations for the platform. This module maps out multi-tenant database tables to track independent publishing workspaces, store consolidated user engagement metrics, log real-time edge transaction variants, and securely cache the statistical machine learning parameter states.

## 2. FUNCTIONAL REQUIREMENTS & DATA FLOW
- **Data Inputs**: Configuration values passed during database deployment and schema initialization hooks via the Drizzle ORM client interface.
- **Business Logic Processing**: 
  1. Enforce strict relational schema definitions using PostgreSQL data types.
  2. Implement native database enum declarations to manage workspace billing statuses and served frontend variant states.
  3. Wire cascade deletion parameters across child logging relationships.
- **Data Outputs / Mutations**: Generation of type-safe TypeScript interfaces and schema maps committed directly to the persistent layer.

## 3. PRESENTATION LAYER (UI Components & UX Details)
- **Component Breakdowns**:
  - `DatabaseSchemaView`: Internal configuration script node. No client visual view layer elements are required in this system phase.

## 4. DEPENDENCIES & STEP-BY-STEP FILES TO GENERATE
1. **Domain Layer**: `src/core/domain/database.types.ts`
   - Explicit primitive maps and matching structural enums for Workspace, ReaderFeatures, and ConversionLogs.
2. **Infrastructure Schema Layer**: `src/lib/db/schemas/publisher.schema.ts`
   - Strict relational table declarations handling `workspaces`, `readers_features`, and `conversion_logs` objects.

## 5. Supabase
You have to create an ENV variable for the Supabase database, and the secure string will be provided.

---

## REVISION 1: Data-Driven Thresholds in Override Rules

### Rationale
The `override_rules` JSONB column on the `workspaces` table must store not only the logistic regression weights, intercept, and standardization parameters, but also two data-driven threshold values that determine how propensity scores map to paywall variants. These thresholds are computed from the actual score distribution of the workspace's readers after training — they are not hardcoded heuristics.

### Schema Changes
The `WorkspaceOverrideRules` type must be extended to include the following fields alongside the existing `weights`, `intercept`, `mean`, `scale`, `trainedAt`, and `sampleSize`:

1. `lockThreshold: number` — The propensity score at or above which a reader is served the `lock` (paywall) variant. Computed as the 75th percentile of the score distribution across all ingested readers in the workspace.
2. `newsletterThreshold: number` — The propensity score at or above which (but below `lockThreshold`) a reader is served the `newsletter` variant. Computed as the 50th percentile (median) of the same score distribution.

### Domain Layer Impact
- `src/core/domain/database.types.ts` — The `WorkspaceOverrideRules` type and matching Zod schema must include `lockThreshold` and `newsletterThreshold` as required `number` fields.
- `src/lib/db/schemas/publisher.schema.ts` — The `WorkspaceOverrideRules` type referenced by the `override_rules` JSONB column must be updated to match.

### No New Files
This revision modifies existing type declarations only. No new files are generated.

---

## REVISION 2: Remove Newsletter Threshold from Override Rules

### Rationale
The variant system is simplified from three variants (open, newsletter, lock) to two (open, lock). The `newsletterThreshold` field is no longer needed because the 50th percentile threshold is never used in variant resolution. Only the 75th percentile `lockThreshold` is computed and stored.

### Schema Changes
The `WorkspaceOverrideRules` type must be updated to remove the `newsletterThreshold` field. The `lockThreshold` field is retained. The type now contains:
- `weights`, `intercept`, `mean`, `scale` (standardization parameters)
- `lockThreshold` (75th percentile of score distribution)
- `trainedAt`, `sampleSize` (metadata)

### Domain Layer Impact
- `src/core/domain/database.types.ts` — Remove `newsletterThreshold` from `WorkspaceOverrideRules` type and Zod schema.
- `src/lib/db/schemas/publisher.schema.ts` — Remove `newsletterThreshold` from `WorkspaceOverrideRules` type.

### No New Files
This revision modifies existing type declarations only. No new files are generated.