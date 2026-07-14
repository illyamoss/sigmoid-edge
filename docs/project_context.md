# MASTER PROJECT CONTEXT: SigmoidEdge AI (Disrupting Piano.io)

## 1. PRODUCT METRIC VISION & VALUE PROP
SigmoidEdge AI is a serverless, edge-native subscriber propensity scoring engine built to disrupt enterprise paywall giants like Piano.io. 
- **The Structural Problem**: Piano.io locks its predictive AI behavior scoring models behind five-figure contract values and enterprise revenue minimums that a 2-to-20 person digital publisher cannot clear. Mid-sized digital media newsrooms and premium blogs are forced to rely on rigid, primitive metered gates that treat every reader identically, resulting in high bounce rates and leaked subscription margins.
- **The Solution**: SigmoidEdge AI allows publishers to self-host a highly advanced predictive machine learning classifier natively inside their own serverless edge network (Cloudflare Workers + Next.js 15 App Router + Supabase Postgres) for less than $20/month in total resource infrastructure costs.

## 2. SYSTEM ARCHITECTURE & REUSABLE ASSETS
To eliminate technical debt, prevent git merge conflicts, and allow frictionless multi-tenant scaling across independent clients, the codebase enforces an ironclad Clean Architecture boundary:
- `src/core/domain/`: Pure TypeScript interfaces and structured Zod schema maps.
- `src/core/use-cases/`: Decoupled orchestrators of pure data analytics processing and model rules.
- `src/lib/integration/`: Concrete infrastructure implementations (Drizzle ORM clients, ML model wrappers, Webhook processing scripts).
- `src/components/features/`: Isolated visual presentation blocks using a slate-neutral, high-contrast dark theme.

## 3. CORE TECHNICAL ENGINE LOGIC
- **The Edge Processing Loop**: A 30-line serverless Cloudflare Worker proxy script sits directly in front of the publisher's root domain. It intercepts traffic, pulls/generates a tracking cookie (`reader_token`), computes an ultra-fast dot-product vector matrix calculation using cached logistic regression weights, and passes a dynamic variant flag string header (`x-paywall-variant`: 'open' | 'newsletter' | 'lock') downstream to the frontend layout views in under 2 milliseconds.
- **The Machine Learning Model**: A pure-TypeScript Logistic Regression model (`ml-logistic-regression`) that evaluates four real-world parameters: Frequency (Pageviews), Recency (Days Idle), Engagement (Average Session Duration), and Velocity (Clicks in the last 48 hours). It fits mathematical probability curves asynchronously using background Cron scripts without running heavy Python backend runtime servers.

## 4. INGESTION, TESTING, & INITIALIZATION PIPELINE
- **Data Ingestion Hybrid Bridge**: Onboarding uses a one-time manual drag-and-drop CSV export zone that parses raw historical Google Analytics 4 (GA4 BigQuery Event stream formatting) and Stripe Customer Objects JSON logs to seed the model. Ongoing automation utilizes copy-paste Stripe Webhooks that stream live client transactions directly to the endpoint node `/api/v1/stripe-stream` to automatically re-tune weights in the background.
- **The Testing Environment**: When the environment variable configuration reads `MODE=TESTING`, the system enables a sandboxed sandbox route `/test-sandbox`. This route bypasses production database gates and renders an active user console simulator to demonstrate live edge scoring progressions, backed by an automated high-fidelity seed engine generating balanced mock tracking rows.

## 5. REVENUE AND RETENTION ENGINE LAWS
- All service contracts and setup commissions settle via borderless cryptographic stablecoins (USDC) on high-throughput ledgers (Solana or Base).
- The platform operates on a self-hosted client infrastructure model. The client owns their data, hosts the code inside their private Vercel/Supabase layers, and registers their keys directly—eliminating all central system liability.
