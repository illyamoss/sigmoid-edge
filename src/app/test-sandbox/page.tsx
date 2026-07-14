import { notFound } from "next/navigation";

import { SandboxTelemetryPanel } from "@/components/features/SandboxTelemetryPanel";

export default function TestSandboxPage() {
  if (process.env.MODE !== "TESTING") {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <SandboxTelemetryPanel />
    </main>
  );
}
