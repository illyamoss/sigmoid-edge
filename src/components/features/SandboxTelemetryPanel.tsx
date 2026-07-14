"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

import type { PaywallVariant } from "@/core/domain/database.types";
import type { EdgeFeatureSnapshot } from "@/core/domain/paywall.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

const READER_COOKIE_NAME = "reader_token";
const WORKER_BLOG_BASE = "http://localhost:8787/blog/the-future-of-edge-computing";

type ScoreState = {
  variant: PaywallVariant;
  score: number;
};

type LoadingState = "idle" | "loading" | "success" | "error";

type ReaderProfile = {
  id: string;
  label: string;
  token: string | null;
  description: string;
};

const READER_PROFILES: ReaderProfile[] = [
  {
    id: "new",
    label: "New Random Reader",
    token: null,
    description: "First-time visitor with no history. Gets a random UUID from the worker.",
  },
  {
    id: "casual",
    label: "Casual Reader",
    token: "reader_casual_0000",
    description: "Low frequency, high recency, low engagement. Expected score: ~0.3% — open variant.",
  },
  {
    id: "converter",
    label: "Converter Reader",
    token: "reader_conv_0000",
    description: "High frequency, low recency, high engagement. Expected score: ~99.8% — lock variant, redirected to /subscribe.",
  },
];

const DEFAULT_FEATURES: EdgeFeatureSnapshot = {
  frequency: 5,
  recency: 3,
  engagement: 30000,
  velocity: 8,
};

function variantBadgeVariant(
  variant: PaywallVariant,
): "success" | "danger" {
  if (variant === "open") return "success";
  return "danger";
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^|; )${name}=([^;]+)`));
  return match ? match[2] ?? null : null;
}

function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; SameSite=Lax`;
}

function clearCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0`;
}

export function SandboxTelemetryPanel() {
  const [features, setFeatures] = useState<EdgeFeatureSnapshot>(DEFAULT_FEATURES);
  const [scoreState, setScoreState] = useState<ScoreState>({
    variant: "open",
    score: 0,
  });
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string>("new");
  const [profileConfirmed, setProfileConfirmed] = useState(false);

  useEffect(() => {
    setCurrentToken(getCookie(READER_COOKIE_NAME));
  }, []);

  const computeScore = useCallback(async (snapshot: EdgeFeatureSnapshot) => {
    setLoadingState("loading");
    try {
      const response = await fetch("/api/v1/edge-score", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug: "default", features: snapshot }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errorBody.error ?? `HTTP ${response.status}`);
      }

      const result = (await response.json()) as ScoreState;
      setScoreState(result);
      setLoadingState("success");
    } catch {
      setScoreState({ variant: "open", score: 0 });
      setLoadingState("error");
    }
  }, []);

  useEffect(() => {
    computeScore(features);
  }, [features, computeScore]);

  function handleFrequencyChange(values: number[]) {
    const value = values[0];
    if (value === undefined) return;
    setFeatures((prev) => ({ ...prev, frequency: value }));
  }

  function handleRecencyChange(values: number[]) {
    const value = values[0];
    if (value === undefined) return;
    setFeatures((prev) => ({ ...prev, recency: value }));
  }

  function handleEngagementChange(values: number[]) {
    const value = values[0];
    if (value === undefined) return;
    setFeatures((prev) => ({ ...prev, engagement: value }));
  }

  function handleVelocityChange(values: number[]) {
    const value = values[0];
    if (value === undefined) return;
    setFeatures((prev) => ({ ...prev, velocity: value }));
  }

  function handleReset() {
    setFeatures(DEFAULT_FEATURES);
  }

  function handleSetProfile() {
    const profile = READER_PROFILES.find((p) => p.id === selectedProfile);
    if (!profile) return;

    if (profile.token === null) {
      clearCookie(READER_COOKIE_NAME);
    } else {
      setCookie(READER_COOKIE_NAME, profile.token);
    }

    setCurrentToken(getCookie(READER_COOKIE_NAME));
    setProfileConfirmed(true);
    setTimeout(() => setProfileConfirmed(false), 1500);
  }

  const scorePercentage = (scoreState.score * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Edge Scoring Sandbox</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manually adjust reader feature vectors and observe real-time
          propensity scoring and paywall variant selection.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reader Profile</CardTitle>
          <CardDescription>
            Set a reader_token cookie to simulate different reader types. After
            setting a profile, visit the blog through the worker to test the
            redirect behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="text-sm text-zinc-400">Current token: </span>
            <code className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-xs text-zinc-200">
              {currentToken ?? "(none — new reader)"}
            </code>
          </div>

          <div className="space-y-2">
            {READER_PROFILES.map((profile) => (
              <label
                key={profile.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                  selectedProfile === profile.id
                    ? "border-zinc-600 bg-zinc-800"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                }`}
              >
                <input
                  type="radio"
                  name="readerProfile"
                  value={profile.id}
                  checked={selectedProfile === profile.id}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="mt-1 accent-zinc-100"
                />
                <div>
                  <div className="text-sm font-medium text-zinc-100">
                    {profile.label}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {profile.token ?? "No cookie set"}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-400">
                    {profile.description}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleSetProfile}
              className="min-w-[120px]"
            >
              {profileConfirmed ? "Profile Set" : "Set Profile"}
            </Button>
            {profileConfirmed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-emerald-400"
              >
                Cookie updated
              </motion.span>
            )}
          </div>

          <a
            href={
              selectedProfile === "new"
                ? WORKER_BLOG_BASE
                : `${WORKER_BLOG_BASE}?reader_token=${
                    READER_PROFILES.find((p) => p.id === selectedProfile)?.token ?? ""
                  }`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-medium text-zinc-100 underline underline-offset-4 transition-colors hover:text-zinc-300"
          >
            Visit blog through worker →
          </a>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Feature Controls</CardTitle>
            <CardDescription>
              Simulate reader behavior metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-300">Pageviews (Frequency)</label>
                <span className="text-sm font-mono text-zinc-400">
                  {features.frequency}
                </span>
              </div>
              <Slider
                min={0}
                max={50}
                step={1}
                value={[features.frequency]}
                onValueChange={handleFrequencyChange}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-300">Recency (Days Idle)</label>
                <span className="text-sm font-mono text-zinc-400">
                  {features.recency}
                </span>
              </div>
              <Slider
                min={0}
                max={30}
                step={0.5}
                value={[features.recency]}
                onValueChange={handleRecencyChange}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-300">
                  Engagement (Avg Session msec)
                </label>
                <span className="text-sm font-mono text-zinc-400">
                  {features.engagement.toLocaleString()}
                </span>
              </div>
              <Slider
                min={0}
                max={120000}
                step={1000}
                value={[features.engagement]}
                onValueChange={handleEngagementChange}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-300">
                  Velocity (Clicks / 48h)
                </label>
                <span className="text-sm font-mono text-zinc-400">
                  {features.velocity}
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[features.velocity]}
                onValueChange={handleVelocityChange}
              />
            </div>

            <Button variant="ghost" onClick={handleReset}>
              Reset to Defaults
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Score Output</CardTitle>
            <CardDescription>
              Real-time edge classification result
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              {loadingState === "loading" && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="h-8 w-8 rounded-full border-2 border-zinc-700 border-t-zinc-100"
                />
              )}

              {loadingState === "success" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="text-5xl font-bold text-zinc-100">
                    {scorePercentage}%
                  </div>
                  <Badge variant={variantBadgeVariant(scoreState.variant)}>
                    {scoreState.variant}
                  </Badge>
                </motion.div>
              )}

              {loadingState === "error" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-red-400"
                >
                  Failed to compute score. Check your configuration.
                </motion.div>
              )}

              {loadingState === "idle" && (
                <p className="text-sm text-zinc-500">
                  Adjust sliders to compute score...
                </p>
              )}
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Current Vector
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Frequency</span>
                  <span className="font-mono text-zinc-200">
                    {features.frequency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Recency</span>
                  <span className="font-mono text-zinc-200">
                    {features.recency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Engagement</span>
                  <span className="font-mono text-zinc-200">
                    {features.engagement.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Velocity</span>
                  <span className="font-mono text-zinc-200">
                    {features.velocity}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}