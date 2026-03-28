import { Badge, Empty } from "@cloudflare/kumo";
import { ArticleIcon } from "@phosphor-icons/react";
import type { Article, Feed } from "@cloud-reader/types";

interface ArticleListProps {
  articles: Article[];
  selectedArticleId: string | null;
  selectedFeed: Feed | null;
  onSelectArticle: (id: string) => void;
}

export function ArticleList({
  articles,
  selectedArticleId,
  selectedFeed,
  onSelectArticle,
}: ArticleListProps) {
  const title = selectedFeed?.title ?? selectedFeed?.url ?? "All articles";

  if (articles.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <header className="border-b border-kumo-line px-4 py-3">
          <h2 className="font-semibold text-kumo-strong">{title}</h2>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <Empty
            icon={<ArticleIcon size={32} />}
            title="No articles"
            description="Add a feed to get started, or refresh an existing one."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-kumo-line px-4 py-3">
        <h2 className="font-semibold text-kumo-strong">{title}</h2>
        <p className="text-sm text-kumo-dimmed">{articles.length} articles</p>
      </header>

      <ul className="flex-1 overflow-y-auto">
        {articles.map((article) => (
          <li key={article.id}>
            <button
              type="button"
              onClick={() => onSelectArticle(article.id)}
              className={[
                "w-full border-b border-kumo-line px-4 py-3 text-left transition-colors",
                "hover:bg-kumo-tint",
                selectedArticleId === article.id ? "bg-kumo-tint" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={[
                    "line-clamp-2 text-sm leading-snug",
                    article.read === 0 ? "font-semibold text-kumo-strong" : "text-kumo-dimmed",
                  ].join(" ")}
                >
                  {article.title ?? article.url}
                </span>
                {article.read === 0 && (
                  <Badge variant="primary" className="mt-0.5 shrink-0">
                    New
                  </Badge>
                )}
              </div>
              {article.summary && (
                <p className="mt-1 line-clamp-2 text-xs text-kumo-dimmed">{article.summary}</p>
              )}
              {article.publishedAt && (
                <p className="mt-1 text-xs text-kumo-subtle">
                  {new Date(article.publishedAt).toLocaleDateString()}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
