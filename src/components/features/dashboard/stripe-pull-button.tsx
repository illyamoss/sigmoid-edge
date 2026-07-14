"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type StripePullButtonProps = {
  workspaceId: string;
};

type ButtonState = "idle" | "loading" | "success" | "error";

export function StripePullButton({ workspaceId }: StripePullButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<ButtonState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handlePull() {
    setState("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/v1/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          stripeSource: "api",
          noGa4: true,
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errorBody.error ?? `HTTP ${response.status}`);
      }

      setState("success");
      router.refresh();
      setTimeout(() => setState("idle"), 3000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Stripe pull failed";
      setErrorMessage(message);
      setState("error");
      setTimeout(() => setState("idle"), 5000);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        onClick={handlePull}
        disabled={state === "loading"}
        className="w-full"
      >
        {state === "loading" ? (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="mr-2 inline-block h-4 w-4 rounded-full border-2 border-zinc-700 border-t-zinc-100"
          />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {state === "loading" ? "Pulling from Stripe..." : "Pull from Stripe"}
      </Button>
      {state === "error" && (
        <p className="text-xs text-red-400">{errorMessage}</p>
      )}
      {state === "success" && (
        <p className="text-xs text-emerald-400">
          Stripe customers synced and model trained successfully.
        </p>
      )}
    </div>
  );
}