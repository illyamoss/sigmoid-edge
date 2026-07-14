"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Activity,
  Cpu,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { DashboardMetrics } from "@/core/domain/dashboard.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileUploaderZone } from "@/components/features/FileUploaderZone";

type MetricCard = {
  label: string;
  value: string;
  subValue: string;
  icon: LucideIcon;
  trendBadgeVariant: "success" | "warning" | "danger" | "default";
  trendLabel: string;
  isAction?: boolean;
};

type MetricsGridProps = {
  metrics: DashboardMetrics;
  workspaceId: string;
  trainedAt: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatTrainedAt(trainedAt: string): string {
  if (!trainedAt) return "Never";
  try {
    const date = new Date(trainedAt);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown";
  }
}

export function MetricsGridTelemetry({ metrics, workspaceId, trainedAt }: MetricsGridProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const cards: MetricCard[] = [
    {
      label: "Conversion Lift",
      value: formatPercentage(metrics.conversionLift),
      subValue: `Baseline: ${formatRate(metrics.baselineConversionRate)}`,
      icon: TrendingUp,
      trendBadgeVariant: metrics.conversionLift >= 0 ? "success" : "danger",
      trendLabel: formatRate(metrics.liveConversionRate),
    },
    {
      label: "Total Revenue",
      value: formatCurrency(metrics.totalRevenue),
      subValue: `${metrics.convertedReaders} subscribers`,
      icon: DollarSign,
      trendBadgeVariant: "success",
      trendLabel: "Live",
    },
    {
      label: "Net Profit",
      value: formatCurrency(metrics.netProfit),
      subValue: `Minus ${formatCurrency(metrics.totalCosts)} costs`,
      icon: Activity,
      trendBadgeVariant: metrics.netProfit >= 0 ? "success" : "danger",
      trendLabel: metrics.netProfit >= 0 ? "Profitable" : "Loss",
    },
    {
      label: "Total Readers",
      value: metrics.totalReaders.toLocaleString(),
      subValue: `${metrics.totalEvents} events logged`,
      icon: Users,
      trendBadgeVariant: "default",
      trendLabel: "Tracked",
    },
    {
      label: "Avg Propensity",
      value: formatRate(metrics.avgPropensityScore),
      subValue: "Across all events",
      icon: Target,
      trendBadgeVariant: metrics.avgPropensityScore >= 0.35 ? "success" : "warning",
      trendLabel: "Live",
    },
    {
      label: "Model Training",
      value: "Active",
      subValue: `Trained: ${formatTrainedAt(trainedAt)}`,
      icon: Cpu,
      trendBadgeVariant: trainedAt ? "success" : "warning",
      trendLabel: trainedAt ? "Trained" : "Pending",
      isAction: true,
    },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.3 }}
            >
              <Card className="h-full flex flex-col justify-between bg-zinc-900/30 border-zinc-800/80 shadow-2xl ring-1 ring-white/5 backdrop-blur-sm transition-all hover:bg-zinc-900/40 hover:ring-white/10">
                <div>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">
                      {card.label}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-zinc-500" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-2xl font-bold text-zinc-100">
                      {card.value}
                    </div>
                  </CardContent>
                </div>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      {card.subValue}
                    </span>
                    {card.isAction ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsModalOpen(true)}
                        className="h-6 px-2 text-[10px] font-semibold border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100"
                      >
                        Upload Data
                      </Button>
                    ) : (
                      <Badge variant={card.trendBadgeVariant}>
                        {card.trendLabel}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">
                    Data Ingestion &amp; Model Training
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Upload raw GA4 BigQuery JSON and Stripe customers list to retrain the edge scoring model.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {workspaceId ? (
                <FileUploaderZone
                  workspaceId={workspaceId}
                  endpoint="/api/v1/train"
                  refreshOnComplete
                  onUploadComplete={() => setIsModalOpen(false)}
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 text-sm font-medium text-zinc-500">
                  No workspace configured.
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
