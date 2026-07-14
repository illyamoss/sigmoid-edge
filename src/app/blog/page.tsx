import { articles } from "@/lib/mock-articles";
import { ArticleList } from "@/components/features/blog/article-list";

export default function BlogPage() {
  const sortedArticles = [...articles].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-zinc-100">
        Blog
      </h1>
      <ArticleList articles={sortedArticles} />
    </div>
  );
}
