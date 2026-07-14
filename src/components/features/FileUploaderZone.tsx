"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type UploadState = "idle" | "uploading" | "success" | "error";

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
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const file = files[0];
      if (!file) return;

      setFileName(file.name);
      setState("uploading");
      setProgress(0);
      setErrorMessage("");

      const progressTimer = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 5 : prev));
      }, 200);

      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as Record<string, unknown>;

        const payload: Record<string, unknown> = {
          workspaceId,
          ...parsed,
        };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(errorBody.error ?? `HTTP ${response.status}`);
        }

        const result = await response.json();
        setProgress(100);
        clearInterval(progressTimer);
        setState("success");
        onUploadComplete?.(result);
        if (refreshOnComplete) {
          router.refresh();
        }
      } catch (error) {
        clearInterval(progressTimer);
        const message = error instanceof Error ? error.message : "Upload failed";
        setErrorMessage(message);
        setState("error");
        onUploadError?.(message);
      }
    },
    [endpoint, workspaceId, refreshOnComplete, onUploadComplete, onUploadError],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer.files.length > 0) {
        handleFiles(event.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files.length > 0) {
        handleFiles(event.target.files);
      }
    },
    [handleFiles],
  );

  const handleReset = useCallback(() => {
    setState("idle");
    setProgress(0);
    setErrorMessage("");
    setFileName("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  return (
    <Card
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "border-dashed transition-colors",
        state === "uploading" && "border-zinc-600",
      )}
    >
      <CardHeader>
        <CardTitle>Historical Data Ingestion</CardTitle>
        <CardDescription>
          Drag and drop a JSON file containing GA4 and Stripe export arrays.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleInputChange}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-4 py-8"
            >
              <UploadCloud className="h-12 w-12 text-zinc-500" />
              <p className="text-sm text-zinc-400">
                Drop your GA4 / Stripe JSON file here, or click to browse.
              </p>
              <Button
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                Select File
              </Button>
            </motion.div>
          )}

          {state === "uploading" && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="h-3 w-3/4 rounded-full bg-zinc-800"
              />
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                className="h-3 w-1/2 rounded-full bg-zinc-800"
              />
              <p className="text-sm text-zinc-400">
                Processing {fileName}…
              </p>
              <Progress value={progress} className="w-full" />
            </motion.div>
          )}

          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <CheckCircle2 className="h-12 w-12 text-emerald-400" />
              <p className="text-sm text-zinc-200">
                {fileName} committed successfully.
              </p>
            </motion.div>
          )}

          {state === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <AlertCircle className="h-12 w-12 text-red-400" />
              <p className="text-sm text-red-300">{errorMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      <CardFooter>
        {state === "success" || state === "error" ? (
          <Button variant="ghost" onClick={handleReset}>
            Reset
          </Button>
        ) : (
          <p className="text-xs text-zinc-500">
            Supported format: JSON containing {"{ ga4: [...], stripe: [...] }}"}
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
