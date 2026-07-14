export type ArticleParagraph = {
  text: string;
};

export type ArticleContent = {
  paragraphs: ArticleParagraph[];
};

export type Article = {
  slug: string;
  title: string;
  author: string;
  publishedAt: string;
  excerpt: string;
  content: ArticleContent;
};

const articles: Article[] = [
  {
    slug: "the-future-of-edge-computing",
    title: "The Future of Edge Computing in Digital Publishing",
    author: "Sarah Chen",
    publishedAt: "2025-01-15T09:00:00Z",
    excerpt:
      "How serverless edge networks are reshaping the way publishers deliver content and monetize audiences.",
    content: {
      paragraphs: [
        {
          text: "Edge computing has emerged as a transformative force in the digital publishing landscape. By moving computation closer to the user, publishers can now deliver personalized content experiences with near-zero latency, opening entirely new possibilities for audience engagement and monetization strategies.",
        },
        {
          text: "The traditional model of centralized content delivery networks is rapidly giving way to distributed edge architectures. These new systems leverage serverless functions at network nodes worldwide, enabling real-time personalization, dynamic paywall decisions, and intelligent content recommendations without the overhead of round-trip requests to a central origin server.",
        },
        {
          text: "Consider the case of a mid-sized newsroom serving readers across multiple continents. With edge computing, each reader's experience can be tailored in under two milliseconds. The edge worker evaluates behavior signals, runs lightweight machine learning inference, and injects layout instructions into the response headers before the page even begins rendering.",
        },
        {
          text: "This architecture fundamentally changes the economics of digital publishing. Instead of expensive enterprise contracts with platforms like Piano.io, publishers can self-host sophisticated propensity scoring models on infrastructure that costs less than twenty dollars per month. The barrier to entry has dropped from five-figure commitments to a serverless billing model that scales with actual usage.",
        },
        {
          text: "The implications extend beyond cost savings. Edge-native publishing systems enable real-time experimentation at a granularity that was previously impossible. Editorial teams can test paywall thresholds, newsletter prompts, and content gating strategies on a per-reader basis, continuously optimizing conversion funnels without deploying new code or waiting for batch processing cycles.",
        },
        {
          text: "As we look toward the future, the convergence of edge computing with predictive machine learning will redefine the publisher-reader relationship. The ability to deliver the right content, at the right time, with the right monetization strategy, all computed locally at the network edge, represents the next frontier of digital media.",
        },
      ],
    },
  },
  {
    slug: "predictive-paywalls-explained",
    title: "Predictive Paywalls: A Technical Deep Dive",
    author: "Marcus Reid",
    publishedAt: "2025-02-20T14:30:00Z",
    excerpt:
      "Understanding the mathematics behind real-time subscriber propensity scoring at the edge.",
    content: {
      paragraphs: [
        {
          text: "Predictive paywalling is built on a deceptively simple premise: use historical reader behavior data to predict, in real-time, the probability that a given visitor will subscribe. The implementation, however, requires careful orchestration of data engineering, machine learning, and edge networking.",
        },
        {
          text: "The model itself is a logistic regression classifier evaluating four primary features: frequency (total pageviews), recency (days since last visit), engagement (average session duration in milliseconds), and velocity (clicks in the trailing forty-eight hours). These features are computed from raw GA4 event streams and enriched with Stripe subscription labels during the training phase.",
        },
        {
          text: "Training occurs asynchronously. Historical GA4 BigQuery exports and Stripe customer objects are ingested through a one-time CSV or JSON upload pipeline. The system merges these datasets using a shared tracking identifier, the user pseudo ID, and fits a logistic regression model using gradient descent with L2 regularization.",
        },
        {
          text: "Once trained, the model parameters, weights, intercept, and standardization statistics, are cached as a compact JSONB object in the workspace database record. At request time, the edge worker retrieves these cached weights and performs a dot-product calculation against the current reader's feature vector.",
        },
        {
          text: "The resulting probability score is mapped to one of three variant buckets. Scores above seventy-five percent receive the open variant, granting full article access. Scores between thirty-five and seventy-five percent trigger the newsletter variant, surfacing an email capture prompt. Scores below thirty-five percent trigger the lock variant, displaying a subscription paywall.",
        },
        {
          text: "This entire computation, from cookie read to header injection, completes in under two milliseconds. The edge worker adds negligible overhead to the request lifecycle, making it practical for high-traffic publishing sites where every millisecond of latency impacts bounce rates and ad revenue.",
        },
      ],
    },
  },
  {
    slug: "building-with-sigmoid-edge",
    title: "Building Your First Edge-Native Paywall with SigmoidEdge AI",
    author: "Aisha Patel",
    publishedAt: "2025-03-10T08:00:00Z",
    excerpt:
      "A step-by-step guide to deploying self-hosted predictive paywalls on Cloudflare Workers and Next.js.",
    content: {
      paragraphs: [
        {
          text: "Getting started with SigmoidEdge AI requires three infrastructure components: a Supabase Postgres database for persistent storage, a Next.js application for the editorial dashboard and API routes, and a Cloudflare Worker for edge-level request interception.",
        },
        {
          text: "The first step is provisioning a Supabase project and configuring the database connection string. The schema consists of three primary tables: workspaces for multi-tenant isolation, readers_features for consolidated engagement metrics, and conversion_logs for real-time event tracking.",
        },
        {
          text: "Once the database is ready, the next step is deploying the Next.js application. This provides the dashboard interface for historical data ingestion, model training, and analytics visualization. The ingestion pipeline accepts JSON files containing GA4 and Stripe exports, validates them with Zod schemas, and processes them through the ETL use case.",
        },
        {
          text: "After the model is trained and cached, the Cloudflare Worker is deployed to the publisher's edge network. The worker intercepts all incoming traffic, identifies visitors via the reader token cookie, and calls the edge score API to compute a real-time propensity score.",
        },
        {
          text: "The worker then injects two custom headers into the origin request: the paywall variant and the propensity score. The Next.js application reads these headers at the server component level and dynamically renders the appropriate content layout, from fully open articles to gated paywall screens.",
        },
        {
          text: "The result is a fully self-hosted, edge-native paywall system that costs less than twenty dollars per month in infrastructure, requires no enterprise contracts, and gives publishers complete control over their reader data and monetization strategies.",
        },
      ],
    },
  },
];

export function getArticleBySlug(slug: string): Article | null {
  const article = articles.find((item) => item.slug === slug);
  return article ?? null;
}

export function getAllArticleSlugs(): string[] {
  return articles.map((item) => item.slug);
}

export { articles };
