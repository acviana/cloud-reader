import { Button, Empty } from "@cloudflare/kumo";
import { ArticleIcon, ArrowSquareOutIcon, CheckIcon } from "@phosphor-icons/react";
import { marked } from "marked";
import type { Article, Feed } from "@cloud-reader/types";

/**
 * Render article body content as HTML.
 * RSS feeds may provide HTML (content:encoded) or Markdown.
 * Heuristic: if the string contains HTML tags, treat as HTML; otherwise parse as Markdown.
 */
function renderContent(raw: string): string {
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(raw);
  if (looksLikeHtml) return raw;
  // Parse markdown synchronously
  return marked.parse(raw, { async: false }) as string;
}

interface ArticleReaderProps {
  article: Article | null;
  feed: Feed | null;
  onMarkRead: (id: string, read: boolean) => void;
}

export function ArticleReader({ article, feed, onMarkRead }: ArticleReaderProps) {
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
          <h1 className="text-xl font-semibold leading-snug">
            {article.url ? (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-kumo-strong hover:text-kumo-brand hover:underline"
              >
                {article.title ?? "Untitled"}
              </a>
            ) : (
              <span className="text-kumo-strong">{article.title ?? "Untitled"}</span>
            )}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-kumo-dimmed">
            {feed && <span>{feed.title ?? feed.url}</span>}
            {feed && article.publishedAt && <span aria-hidden>·</span>}
            {article.publishedAt && (
              <span>
                {new Date(article.publishedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
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
            dangerouslySetInnerHTML={{ __html: renderContent(article.content) }}
          />
        ) : article.summary ? (
          <div
            className="prose prose-sm max-w-none text-kumo-default"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: article summary from trusted RSS feeds
            dangerouslySetInnerHTML={{ __html: renderContent(article.summary) }}
          />
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
