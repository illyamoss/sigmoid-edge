"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, FileCode } from "lucide-react";

import type { WorkerConfigParams } from "@/core/domain/dashboard.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type WorkerScriptExporterProps = {
  workerScript: string;
  workerConfig: WorkerConfigParams;
};

function buildConfigSummary(config: WorkerConfigParams): { label: string; value: string }[] {
  return [
    { label: "Workspace Slug", value: config.workspaceSlug },
    { label: "Origin URL", value: config.originUrl },
    { label: "Edge Score Endpoint", value: config.edgeScoreEndpoint },
    { label: "Lock Threshold", value: config.lockThreshold.toFixed(2) },
    { label: "Cookie Name", value: config.cookieName },
    {
      label: "Cookie Max-Age",
      value: `${(config.cookieMaxAgeSeconds / 86400).toFixed(0)} days`,
    },
  ];
}

export function WorkerScriptExporter({
  workerScript,
  workerConfig,
}: WorkerScriptExporterProps) {
  const [copied, setCopied] = useState(false);
  const configSummary = buildConfigSummary(workerConfig);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(workerScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-zinc-400" />
              Edge Worker Script
            </CardTitle>
            <CardDescription>
              Deploy this script to your Cloudflare Worker to intercept traffic
              and inject paywall headers.
            </CardDescription>
          </div>
          <Badge variant="success">Ready</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {configSummary.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2"
            >
              <span className="text-xs text-zinc-500">{item.label}</span>
              <span className="text-xs font-mono text-zinc-200">
                {item.value}
              </span>
            </div>
          ))}
        </div>

        <div className="relative">
          <pre className="max-h-64 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-300">
            <code>{workerScript}</code>
          </pre>
          <motion.div
            className="absolute right-3 top-3"
            animate={{ scale: copied ? 1.1 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              size="sm"
              variant={copied ? "secondary" : "default"}
              onClick={handleCopy}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span
                    key="copied"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Script
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
