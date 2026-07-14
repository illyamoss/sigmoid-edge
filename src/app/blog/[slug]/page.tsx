import { notFound } from "next/navigation";

import { getArticleBySlug } from "@/lib/mock-articles";
import { ArticleViewer } from "@/components/features/ArticleViewer";

type BlogArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <ArticleViewer
      title={article.title}
      author={article.author}
      publishedAt={article.publishedAt}
      excerpt={article.excerpt}
      paragraphs={article.content.paragraphs.map((p) => p.text)}
    />
  );
}

export async function generateStaticParams() {
  const { getAllArticleSlugs } = await import("@/lib/mock-articles");
  return getAllArticleSlugs().map((slug) => ({ slug }));
}
