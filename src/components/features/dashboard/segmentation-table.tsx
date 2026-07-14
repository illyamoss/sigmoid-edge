"use client";

import { motion } from "framer-motion";

import type { PaywallVariant } from "@/core/domain/database.types";
import type { SegmentRow } from "@/core/domain/dashboard.types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SegmentationSheetProps = {
  segments: SegmentRow[];
};

function variantBadgeVariant(
  variant: PaywallVariant,
): "success" | "danger" {
  if (variant === "open") return "success";
  return "danger";
}

function formatRate(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatScore(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function SegmentationSheet({ segments }: SegmentationSheetProps) {
  if (segments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reader Segmentation</CardTitle>
          <CardDescription>
            No conversion log data available yet. Deploy your edge worker and
            collect traffic to see segmentation analytics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
            Waiting for live data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reader Segmentation</CardTitle>
        <CardDescription>
          Variant distribution and conversion performance across active reader
          buckets
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variant</TableHead>
              <TableHead className="text-right">Readers</TableHead>
              <TableHead className="text-right">Share</TableHead>
              <TableHead className="text-right">Conv. Rate</TableHead>
              <TableHead className="text-right">Avg Score</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((row, index) => (
              <motion.tr
                key={row.variant}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08, duration: 0.25 }}
                className="border-b border-zinc-800 transition-colors hover:bg-zinc-800/50"
              >
                <TableCell>
                  <Badge variant={variantBadgeVariant(row.variant)}>
                    {row.variant}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {row.readerCount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-zinc-400">
                  {formatRate(row.percentageOfTotal)}
                </TableCell>
                <TableCell className="text-right">
                  {formatRate(row.conversionRate)}
                </TableCell>
                <TableCell className="text-right text-zinc-400">
                  {formatScore(row.avgPropensityScore)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(row.revenueContribution)}
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
