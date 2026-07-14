"use client";

import { motion } from "framer-motion";

type ArticleViewerProps = {
  title: string;
  author: string;
  publishedAt: string;
  excerpt: string;
  paragraphs: string[];
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ArticleViewer({
  title,
  author,
  publishedAt,
  excerpt,
  paragraphs,
}: ArticleViewerProps) {
  return (
    <article>
      <header className="mb-8 space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
          {title}
        </h1>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span className="font-medium text-zinc-300">{author}</span>
          <span>·</span>
          <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
        </div>
        <p className="text-lg leading-relaxed text-zinc-400">{excerpt}</p>
      </header>

      <div className="space-y-6">
        {paragraphs.map((text, index) => (
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="text-base leading-relaxed text-zinc-200"
          >
            {text}
          </motion.p>
        ))}
      </div>
    </article>
  );
}