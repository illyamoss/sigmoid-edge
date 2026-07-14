import { headers } from "next/headers";

import { buildComputeDashboardMetrics } from "@/core/use-cases/compute-dashboard-metrics";
import { createRepositories } from "@/lib/integration/repository-factory";
import { MetricsGridTelemetry } from "@/components/features/dashboard/metrics-grid";
import { SegmentationSheet } from "@/components/features/dashboard/segmentation-table";

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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col gap-2 rounded-2xl bg-zinc-900/40 p-6 shadow-xl ring-1 ring-white/10 backdrop-blur-md">
        <h1 className="text-3xl font-extrabold tracking-tight text-white/90 drop-shadow-sm">
          Publisher Analytics Dashboard
        </h1>
        <p className="text-sm font-medium text-zinc-400">
          Monitor conversion performance and revenue tracking across your network.
        </p>
      </div>

      <div className="relative z-10">
        <MetricsGridTelemetry
          metrics={dashboardData.metrics}
          workspaceId={workspaceId}
          trainedAt={workspace?.overrideRules?.trainedAt ?? ""}
        />
      </div>

      <div className="relative z-10">
        <SegmentationSheet segments={dashboardData.segments} />
      </div>
    </div>
  );
}