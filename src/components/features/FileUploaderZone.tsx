"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, CheckCircle2, AlertCircle, FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type UploadState = "idle" | "uploading" | "success" | "error";

type FileState = {
  name: string;
  size: number;
  data: any[];
};

type FileUploaderZoneProps = {
  workspaceId: string;
  endpoint?: string;
  refreshOnComplete?: boolean;
  onUploadComplete?: (result: unknown) => void;
  onUploadError?: (error: string) => void;
};

export function FileUploaderZone({
  workspaceId,
  endpoint = "/api/v1/train",
  refreshOnComplete = false,
  onUploadComplete,
  onUploadError,
}: FileUploaderZoneProps) {
  const router = useRouter();
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const [ga4File, setGa4File] = useState<FileState | null>(null);
  const [stripeFile, setStripeFile] = useState<FileState | null>(null);

  const ga4InputRef = useRef<HTMLInputElement>(null);
  const stripeInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleGa4Change = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        throw new Error("GA4 dump must be a JSON array of events.");
      }

      if (parsed.length > 0 && typeof parsed[0] === "object" && parsed[0] !== null) {
        const first = parsed[0] as Record<string, any>;
        if (!("user_pseudo_id" in first)) {
          throw new Error("Invalid GA4 dump. user_pseudo_id field missing in events.");
        }
      }

      setGa4File({
        name: file.name,
        size: file.size,
        data: parsed,
      });
      setErrorMessage("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid GA4 JSON format";
      setErrorMessage(message);
      setGa4File(null);
      if (ga4InputRef.current) ga4InputRef.current.value = "";
    }
  };

  const handleStripeChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        throw new Error("Stripe dump must be a JSON array of customers.");
      }

      if (parsed.length > 0 && typeof parsed[0] === "object" && parsed[0] !== null) {
        const first = parsed[0] as Record<string, any>;
        if (!("id" in first)) {
          throw new Error("Invalid Stripe dump. id field missing in customer objects.");
        }
      }

      setStripeFile({
        name: file.name,
        size: file.size,
        data: parsed,
      });
      setErrorMessage("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid Stripe JSON format";
      setErrorMessage(message);
      setStripeFile(null);
      if (stripeInputRef.current) stripeInputRef.current.value = "";
    }
  };

  const handleClearGa4 = () => {
    setGa4File(null);
    if (ga4InputRef.current) ga4InputRef.current.value = "";
    if (uploadState === "success" || uploadState === "error") {
      setUploadState("idle");
    }
  };

  const handleClearStripe = () => {
    setStripeFile(null);
    if (stripeInputRef.current) stripeInputRef.current.value = "";
    if (uploadState === "success" || uploadState === "error") {
      setUploadState("idle");
    }
  };

  const handleTrain = async () => {
    if (!ga4File || !stripeFile) return;

    setUploadState("uploading");
    setProgress(0);
    setErrorMessage("");

    const progressTimer = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 10 : prev));
    }, 150);

    try {
      const payload = {
        workspaceId,
        ga4: ga4File.data,
        stripe: stripeFile.data,
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      clearInterval(progressTimer);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errorBody.error ?? `HTTP ${response.status}`);
      }

      const result = await response.json();
      setProgress(100);
      setUploadState("success");
      onUploadComplete?.(result);
      if (refreshOnComplete) {
        router.refresh();
      }
    } catch (err) {
      clearInterval(progressTimer);
      const message = err instanceof Error ? err.message : "Training request failed";
      setErrorMessage(message);
      setUploadState("error");
      onUploadError?.(message);
    }
  };

  const handleResetAll = () => {
    setGa4File(null);
    setStripeFile(null);
    setUploadState("idle");
    setProgress(0);
    setErrorMessage("");
    if (ga4InputRef.current) ga4InputRef.current.value = "";
    if (stripeInputRef.current) stripeInputRef.current.value = "";
  };

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardContent className="space-y-4 p-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-4 transition-colors hover:border-zinc-700/60">
            <input
              ref={ga4InputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleGa4Change}
              className="hidden"
            />
            <AnimatePresence mode="wait">
              {!ga4File ? (
                <motion.div
                  key="ga4-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-2 py-4"
                >
                  <UploadCloud className="h-6 w-6 text-zinc-500" />
                  <span className="text-xs font-semibold text-zinc-300">
                    GA4 Events Export
                  </span>
                  <p className="text-[10px] text-zinc-500 text-center px-2">
                    Raw JSON dump from Google BigQuery
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => ga4InputRef.current?.click()}
                    className="h-7 px-3 text-[11px] font-medium"
                  >
                    Select GA4 File
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="ga4-loaded"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between rounded-lg bg-zinc-900/60 p-3 ring-1 ring-white/5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-5 w-5 shrink-0 text-amber-500" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-xs font-medium text-zinc-200">
                        {ga4File.name}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {formatBytes(ga4File.size)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearGa4}
                    className="h-6 w-6 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-4 transition-colors hover:border-zinc-700/60">
            <input
              ref={stripeInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleStripeChange}
              className="hidden"
            />
            <AnimatePresence mode="wait">
              {!stripeFile ? (
                <motion.div
                  key="stripe-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-2 py-4"
                >
                  <UploadCloud className="h-6 w-6 text-zinc-500" />
                  <span className="text-xs font-semibold text-zinc-300">
                    Stripe Customer List
                  </span>
                  <p className="text-[10px] text-zinc-500 text-center px-2">
                    Raw Stripe customer profiles JSON export
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => stripeInputRef.current?.click()}
                    className="h-7 px-3 text-[11px] font-medium"
                  >
                    Select Stripe File
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="stripe-loaded"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between rounded-lg bg-zinc-900/60 p-3 ring-1 ring-white/5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-5 w-5 shrink-0 text-blue-500" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-xs font-medium text-zinc-200">
                        {stripeFile.name}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {formatBytes(stripeFile.size)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearStripe}
                    className="h-6 w-6 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {uploadState === "uploading" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 rounded-xl bg-zinc-900/30 p-3 ring-1 ring-white/5"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Training Machine Learning Model...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5 w-full bg-zinc-950" />
            </motion.div>
          )}

          {uploadState === "success" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 rounded-xl bg-emerald-950/20 p-3 ring-1 ring-emerald-500/10 text-emerald-400 text-xs"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Edge scoring model trained successfully. Analytics metrics are updated.</span>
            </motion.div>
          )}

          {uploadState === "error" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 rounded-xl bg-red-950/20 p-3 ring-1 ring-red-500/10 text-red-400 text-xs"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      <CardFooter className="flex gap-3 px-0 pb-0 pt-4">
        {uploadState === "success" || uploadState === "error" ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetAll}
            className="w-full h-9 text-xs font-semibold"
          >
            Reset Ingestion
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={handleTrain}
            disabled={!ga4File || !stripeFile || uploadState === "uploading"}
            className="w-full h-9 text-xs font-semibold bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600"
          >
            {uploadState === "uploading" ? "Training..." : "Train Edge Model"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
