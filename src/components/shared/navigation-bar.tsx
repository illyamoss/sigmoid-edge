import type { ReactNode } from "react";

export function NavigationBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <span className="text-lg font-bold tracking-tight text-zinc-100">
          SigmoidEdge AI
        </span>
      </div>
    </header>
  );
}
