import { headers } from "next/headers";

import { buildComputeDashboardMetrics } from "@/core/use-cases/compute-dashboard-metrics";
import { createRepositories } from "@/lib/integration/repository-factory";
import { buildWorkerScript } from "@/lib/integration/worker-script-builder";
import { MetricsGridTelemetry } from "@/components/features/dashboard/metrics-grid";
import { SegmentationSheet } from "@/components/features/dashboard/segmentation-table";
import { WorkerScriptExporter } from "@/components/features/dashboard/worker-exporter";
import { FileUploaderZone } from "@/components/features/FileUploaderZone";
import { StripePullButton } from "@/components/features/dashboard/stripe-pull-button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default async function HomePage() {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const originUrl = `${protocol}://${host}`;

  const workspaceSlug = process.env.WORKSPACE_SLUG ?? "default";

  const repos = createRepositories();

  const workspace = await repos.workspace.findBySlug(workspaceSlug);
  const workspaceId = workspace?.id ?? "";

  const computeDashboardMetrics = buildComputeDashboardMetrics({
    workspaceRepository: repos.workspace,
    conversionLogRepository: repos.conversionLogs,
    readerFeaturesRepository: repos.readers,
  });

  const dashboardData = await computeDashboardMetrics({
    workspaceSlug,
    originUrl,
  });

  const workerScript = buildWorkerScript(dashboardData.workerConfig);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">
          Publisher Analytics Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Monitor conversion performance, revenue tracking, and edge deployment
          configuration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Ingestion &amp; Model Training</CardTitle>
          <CardDescription>
            Upload a GA4 BigQuery JSON export to retrain the edge scoring model,
            or pull customer data directly from Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workspaceId ? (
            <>
              <FileUploaderZone
                workspaceId={workspaceId}
                endpoint="/api/v1/train"
                refreshOnComplete
              />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900 px-2 text-zinc-500">or</span>
                </div>
              </div>
              <StripePullButton workspaceId={workspaceId} />
            </>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
              No workspace found. Set the WORKSPACE_SLUG environment variable or
              visit /setup to create a workspace.
            </div>
          )}
        </CardContent>
      </Card>

      <MetricsGridTelemetry metrics={dashboardData.metrics} />

      <SegmentationSheet segments={dashboardData.segments} />

      <WorkerScriptExporter
        workerScript={workerScript}
        workerConfig={dashboardData.workerConfig}
      />
    </div>
  );
}