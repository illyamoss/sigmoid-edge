<div align="center">

# SigmoidEdge AI

### Self-Hosted Predictive Paywall Engine for Independent Publishers

An open-source, edge-native subscriber propensity scoring engine that brings enterprise-grade AI paywalls to independent publishers — for under $20/month in infrastructure costs.

**Next.js 15 · Cloudflare Workers · Supabase Postgres · Pure TypeScript ML**

[Quick Start](#-quick-start) · [Architecture](#-architecture) · [How It Works](#-how-it-works) · [API Reference](#-api-reference) · [Contributing](#-contributing)

</div>

---

## The Problem

Enterprise paywall platforms like Piano.io lock their predictive AI scoring behind five-figure contracts and revenue minimums. Independent publishers and mid-sized newsrooms are forced to use primitive metered gates that treat every reader identically — resulting in high bounce rates and leaked subscription revenue.

## The Solution

SigmoidEdge AI lets any publisher deploy a machine learning-driven dynamic paywall on their own infrastructure. It evaluates every reader in real-time using a logistic regression classifier and decides — on a per-pageview basis — whether to show an open article, a newsletter prompt, or a hard subscription lock.

The entire system runs on commodity serverless infrastructure: **Cloudflare Workers** for sub-2ms edge scoring, **Next.js 15 App Router** for the analytics dashboard, **Supabase Postgres** for persistence, and a **pure TypeScript ML engine** with zero Python dependencies.

---

## ✨ Features

- **Real-Time Edge Scoring** — A Cloudflare Worker intercepts every page request and computes a subscriber propensity score via fast dot-product matrix math in under 2ms
- **Pure TypeScript ML** — Logistic regression classifier trained on four behavioral signals: Frequency, Recency, Engagement, and Velocity
- **Publisher Analytics Dashboard** — Premium dark-mode dashboard with live KPIs: conversion lift, revenue, profit, reader segmentation
- **Two-Step Data Ingestion** — Upload raw GA4 BigQuery exports and Stripe customer lists directly from the browser to retrain the model
- **Drag-and-Drop Retraining** — No data science team required. Upload CSVs, click Train, and the model updates in seconds
- **Testing Sandbox** — Full offline mode with high-fidelity mock data (500 readers, seeded model) for development without any external services
- **Clean Architecture** — Strict dependency inversion with framework-agnostic business logic, swappable infrastructure, and zero `any` types

---

## 🏗 Architecture

The codebase enforces strict [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) boundaries adapted for Next.js App Router:

```
src/
├── app/                          # Routing Layer (Next.js App Router)
│   ├── layout.tsx                # Root HTML shell, dark theme, navigation
│   ├── page.tsx                  # Publisher analytics dashboard
│   ├── blog/                     # Demo blog with dynamic articles
│   ├── subscribe/                # Stripe checkout flow
│   ├── test-sandbox/             # Offline testing sandbox
│   └── api/v1/
│       ├── edge-score/           # POST — compute propensity score for a reader
│       ├── train/                # POST — ingest GA4 + Stripe data, retrain model
│       └── stripe-stream/        # POST — Stripe webhook receiver
│
├── components/
│   ├── ui/                       # Atomic primitives (shadcn/ui + Radix)
│   ├── shared/                   # Cross-cutting layouts (NavigationBar)
│   └── features/
│       ├── dashboard/            # MetricsGrid, SegmentationTable
│       ├── blog/                 # Article cards, blog layout
│       ├── FileUploaderZone.tsx   # Two-slot GA4/Stripe file uploader
│       └── SandboxTelemetryPanel.tsx
│
├── core/                         # Business Logic (pure TS, zero framework imports)
│   ├── domain/                   # Types, Zod schemas, interfaces
│   ├── use-cases/                # Orchestrators (compute-edge-score, process-analytics)
│   └── services/                 # Abstract repository & classifier contracts
│
└── lib/                          # Infrastructure (concrete implementations)
    ├── db/                       # Drizzle ORM client, Postgres connection
    └── integration/
        ├── cloudflare-worker.js  # Edge worker (deployed to CF)
        ├── edge-classifier.service.ts  # Logistic regression engine
        ├── ga4-transformer.ts    # GA4 BigQuery → feature vectors
        ├── stripe-puller.ts      # Stripe customer → conversion labels
        ├── repository-factory.ts # Mock/production repository switch
        └── mock/                 # Full mock data layer for testing
```

### Dependency Flow

```
app/ → components/ → core/ ← lib/
          ↓              ↑
     (UI renders)    (implements interfaces)
```

Dependencies always flow **inward**. The `core/` layer never imports from `app/`, `components/`, or `lib/`. Infrastructure in `lib/` implements the abstract contracts declared in `core/services/`.

---

## 🔄 How It Works

### The Edge Scoring Loop

```
Reader visits blog post
        │
        ▼
┌─────────────────────┐
│  Cloudflare Worker   │  ← Intercepts request at the edge
│  (cloudflare-worker) │
└────────┬────────────┘
         │
         │ 1. Read/set reader_token cookie
         │ 2. POST /api/v1/edge-score { readerToken }
         │
         ▼
┌─────────────────────┐
│  Edge Score API      │  ← Pulls reader features from DB
│  compute-edge-score  │  ← Runs σ(w·x + b) logistic regression
└────────┬────────────┘
         │
         │  Returns: { score: 0.82, variant: "lock", threshold: 0.78 }
         │
         ▼
┌─────────────────────┐
│  Cloudflare Worker   │  ← Sets x-paywall-variant header
│  Proxies to origin   │  ← Logs conversion event
└────────┬────────────┘
         │
         ▼
   Reader sees paywall
   or open article
```

### The ML Model

A pure TypeScript logistic regression classifier evaluates four real-world behavioral signals:

| Signal | Description | Example |
|--------|-------------|---------|
| **Frequency** | Total pageviews across all sessions | `14 visits` |
| **Recency** | Days since the reader's last visit | `0.8 days` |
| **Engagement** | Cumulative reading time in milliseconds | `32,450ms` |
| **Velocity** | Pageviews within the last 48 hours | `7 pages` |

The model standardizes these features (zero-mean, unit-variance), applies learned weights via a dot product, and passes the result through a sigmoid function to produce a probability score between 0 and 1.

### The Retraining Loop

1. **Export** raw GA4 event data from Google BigQuery and a Stripe customer list
2. **Upload** both JSON files via the dashboard's Model Training card
3. The server **maps** GA4 `user_pseudo_id` to Stripe `customer.id` to label which readers converted
4. A new logistic regression model is **trained** on the labeled dataset
5. Updated weights and lock threshold are **persisted** to the workspace
6. The Cloudflare Worker immediately picks up the new model parameters

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A **Supabase** project (for production) or just `MODE=TESTING` for local development

### 1. Clone & Install

```bash
git clone https://github.com/your-username/sigmoid-edge.git
cd sigmoid-edge
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

For **local development with mock data** (no external services needed):

```env
MODE=TESTING
WORKSPACE_SLUG=default
```

For **production**, fill in all values in `.env.local`:

```env
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
MODE=PRODUCTION
WORKSPACE_SLUG=default
EDGE_API_BASE_URL=https://your-blog-domain.com
```

### 3. Push Database Schema (Production Only)

```bash
npm run db:push
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the analytics dashboard.

### 5. Start the Edge Worker (Optional)

```bash
npm run worker:dev
```

This starts the Cloudflare Worker locally at `http://localhost:8787`.

---

## 📡 API Reference

### `POST /api/v1/edge-score`

Computes a propensity score for a given reader.

```json
{
  "workspaceSlug": "default",
  "readerToken": "reader_abc123",
  "engagementTimeMsec": 15000
}
```

**Response:**

```json
{
  "score": 0.82,
  "variant": "lock",
  "threshold": 0.78
}
```

### `POST /api/v1/train`

Ingests GA4 + Stripe data and retrains the scoring model.

```json
{
  "workspaceId": "workspace-uuid",
  "ga4": [ { "user_pseudo_id": "...", "event_name": "page_view", ... } ],
  "stripe": [ { "id": "cus_...", "email": "...", ... } ]
}
```

**Response:**

```json
{
  "rowsProcessed": 1250,
  "model": {
    "weights": [0.42, -0.18, 0.31, 0.55],
    "intercept": -1.23,
    "lockThreshold": 0.78,
    "sampleSize": 1250,
    "trainedAt": "2025-01-15T10:30:00Z"
  }
}
```

### `POST /api/v1/stripe-stream`

Receives Stripe webhook events to automatically mark readers as subscribers.

---

## 🧪 Testing Mode

Set `MODE=TESTING` in your environment to run the entire platform offline with realistic mock data:

- **500 synthetic readers** (400 casual, 100 converted subscribers)
- **Pre-trained logistic regression model** with realistic weights
- **~1,000 conversion log events** with propensity scores
- **Fully functional dashboard** with all KPIs populated

No database, no Stripe, no GA4 — everything runs in-memory.

### Test Sandbox

Navigate to `/test-sandbox` to interact with a live edge scoring simulator. It lets you adjust reader behavior parameters in real-time and observe how the model responds.

### Generating Mock Upload Data

A script is included to generate realistic GA4 and Stripe JSON dumps for testing the ingestion pipeline:

```bash
node generate_mocks.cjs
```

This creates `mock_ga4_dump.json` and `mock_stripe_dump.json` in the project root, ready to upload through the dashboard.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 15 (App Router) | Server components, API routes, SSR |
| **Edge** | Cloudflare Workers | Sub-2ms request interception and scoring |
| **Database** | Supabase Postgres | Reader profiles, conversion logs, model weights |
| **ORM** | Drizzle ORM | Type-safe queries, schema migrations |
| **ML Engine** | Custom TypeScript | Logistic regression, feature standardization |
| **Validation** | Zod | Runtime schema validation for all API boundaries |
| **UI** | React 19 + Radix + Framer Motion | Premium dark-mode dashboard |
| **Styling** | Tailwind CSS | Utility-first CSS with custom design tokens |
| **Payments** | Stripe | Subscription billing, webhook processing |

---

## 📂 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MODE` | Yes | `TESTING` for mock data, `PRODUCTION` for live |
| `WORKSPACE_SLUG` | Yes | Workspace identifier (default: `default`) |
| `DATABASE_URL` | Production | Postgres connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Supabase service role key |
| `STRIPE_SECRET_KEY` | Production | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Production | Stripe webhook signing secret |
| `EDGE_API_BASE_URL` | Production | Your blog's public origin URL |
| `TESTING_WORKSPACE_ID` | Testing | Override workspace UUID for testing |

---

## 📜 Scripts

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run typecheck    # Strict TypeScript compilation check
npm run lint         # ESLint
npm run db:push      # Push Drizzle schema to Supabase
npm run db:generate  # Generate Drizzle migration files
npm run worker:dev   # Start Cloudflare Worker locally
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Ensure `npm run typecheck` passes with zero errors
4. Submit a pull request

Please follow the architectural boundaries documented in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). The `core/` layer must remain framework-agnostic with zero external imports.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built for publishers who refuse to pay enterprise prices for enterprise-grade AI.**

</div>
