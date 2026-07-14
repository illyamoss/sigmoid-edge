"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import type { Article } from "@/lib/mock-articles";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

type ArticleListProps = {
  articles: Article[];
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ArticleList({ articles }: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
        No articles published yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article, index) => (
        <motion.div
          key={article.slug}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08, duration: 0.3 }}
        >
          <Link href={`/blog/${article.slug}`}>
            <Card className="transition-colors duration-200 hover:border-zinc-700">
              <CardHeader>
                <CardTitle className="text-xl text-zinc-100">
                  {article.title}
                </CardTitle>
                <CardDescription>
                  {article.author} · {formatDate(article.publishedAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-zinc-400 line-clamp-2">
                  {article.excerpt}
                </p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
