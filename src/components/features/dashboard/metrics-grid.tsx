"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  Server,
  Users,
  Target,
  Activity,
} from "lucide-react";

import type { DashboardMetrics } from "@/core/domain/dashboard.types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MetricCard = {
  label: string;
  value: string;
  subValue: string;
  icon: typeof TrendingUp;
  trendBadgeVariant: "success" | "warning" | "danger" | "default";
  trendLabel: string;
};

type MetricsGridProps = {
  metrics: DashboardMetrics;
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

function buildMetricCards(metrics: DashboardMetrics): MetricCard[] {
  return [
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
      label: "Infrastructure Costs",
      value: formatCurrency(metrics.totalCosts),
      subValue: "Monthly serverless",
      icon: Server,
      trendBadgeVariant: "default",
      trendLabel: "Fixed",
    },
    {
      label: "Net Profit",
      value: formatCurrency(metrics.netProfit),
      subValue: "Revenue minus costs",
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
      trendBadgeVariant:
        metrics.avgPropensityScore >= 0.35 ? "success" : "warning",
      trendLabel: "Live",
    },
  ];
}

export function MetricsGridTelemetry({ metrics }: MetricsGridProps) {
  const cards = buildMetricCards(metrics);

  return (
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
            <Card>
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
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">
                    {card.subValue}
                  </span>
                  <Badge variant={card.trendBadgeVariant}>
                    {card.trendLabel}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
