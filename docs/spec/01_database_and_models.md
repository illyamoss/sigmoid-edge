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