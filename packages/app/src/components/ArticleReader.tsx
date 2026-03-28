import { Button, Empty } from "@cloudflare/kumo";
import { ArticleIcon, ArrowSquareOutIcon, CheckIcon } from "@phosphor-icons/react";
import type { Article } from "@cloud-reader/types";

interface ArticleReaderProps {
  article: Article | null;
  onMarkRead: (id: string, read: boolean) => void;
}

export function ArticleReader({ article, onMarkRead }: ArticleReaderProps) {
  if (!article) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty
          icon={<ArticleIcon size={32} />}
          title="No article selected"
          description="Select an article from the list to read it."
        />
      </div>
    );
  }

  const isRead = article.read === 1;

  return (
    <div className="flex h-full flex-col">
      {/* Article header */}
      <header className="flex items-start justify-between gap-4 border-b border-kumo-line px-6 py-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold leading-snug text-kumo-strong">
            {article.title ?? "Untitled"}
          </h1>
          {article.publishedAt && (
            <p className="mt-1 text-sm text-kumo-dimmed">
              {new Date(article.publishedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            variant={isRead ? "secondary" : "primary"}
            size="sm"
            icon={<CheckIcon />}
            onClick={() => onMarkRead(article.id, !isRead)}
          >
            {isRead ? "Mark unread" : "Mark read"}
          </Button>

          {article.url && (
            <Button
              variant="secondary"
              size="sm"
              shape="square"
              icon={<ArrowSquareOutIcon />}
              aria-label="Open original article"
              onClick={() => window.open(article.url, "_blank", "noopener,noreferrer")}
            />
          )}
        </div>
      </header>

      {/* Article body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {article.content ? (
          <div
            className="prose prose-sm max-w-none text-kumo-default"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: article content from trusted RSS feeds
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        ) : article.summary ? (
          <p className="text-kumo-default">{article.summary}</p>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Empty
              icon={<ArticleIcon size={32} />}
              title="No content available"
              description="This feed doesn't include full article content."
            />
          </div>
        )}
      </div>
    </div>
  );
}
