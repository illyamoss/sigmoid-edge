import type { ReactNode } from "react";

import "./globals.css";
import { NavigationBar } from "@/components/shared/navigation-bar";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-zinc-950">
          <NavigationBar />
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
