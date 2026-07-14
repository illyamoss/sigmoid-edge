import type { ReactNode } from "react";

export default function BlogArticleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <a
        href="/blog"
        className="mb-8 inline-flex items-center text-sm text-zinc-400 transition-colors hover:text-zinc-100"
      >
        ← Back to Blog
      </a>
      {children}
    </div>
  );
}
