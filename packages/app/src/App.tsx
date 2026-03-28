import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@cloudflare/kumo";
import type { Article, Feed } from "@cloud-reader/types";
import { articlesApi, feedsApi } from "./lib/api.ts";
import { FeedSidebar } from "./components/FeedSidebar.tsx";
import { AddFeedDialog } from "./components/AddFeedDialog.tsx";
import { ArticleList } from "./components/ArticleList.tsx";
import { ArticleReader } from "./components/ArticleReader.tsx";

export function App() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [addFeedOpen, setAddFeedOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState<Record<string, boolean>>({});
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Apply color-scheme to <html> — Kumo's light-dark() tokens respond to this
  useEffect(() => {
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  // Load feeds on mount
  useEffect(() => {
    feedsApi.list().then(setFeeds).catch(console.error);
  }, []);

  // Load articles when selected feed changes
  useEffect(() => {
    const opts = selectedFeedId ? { feedId: selectedFeedId } : undefined;
    articlesApi.list(opts).then(setArticles).catch(console.error);
    setSelectedArticleId(null);
  }, [selectedFeedId]);

  // Unread counts per feed
  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const article of articles) {
      if (article.read === 0) {
        counts[article.feedId] = (counts[article.feedId] ?? 0) + 1;
      }
    }
    return counts;
  }, [articles]);

  const selectedFeed = feeds.find((f) => f.id === selectedFeedId) ?? null;
  const selectedArticle = articles.find((a) => a.id === selectedArticleId) ?? null;
  const selectedArticleFeed = selectedArticle
    ? (feeds.find((f) => f.id === selectedArticle.feedId) ?? null)
    : null;

  const handleRefreshFeed = useCallback(
    async (id: string) => {
      setIsRefreshing((prev) => ({ ...prev, [id]: true }));
      try {
        await feedsApi.refresh(id);
        // Reload articles for current view
        const opts = selectedFeedId ? { feedId: selectedFeedId } : undefined;
        const updated = await articlesApi.list(opts);
        setArticles(updated);
        // Refresh feed metadata
        const updatedFeeds = await feedsApi.list();
        setFeeds(updatedFeeds);
      } catch (err) {
        console.error("Refresh failed:", err);
      } finally {
        setIsRefreshing((prev) => ({ ...prev, [id]: false }));
      }
    },
    [selectedFeedId],
  );

  const handleRefreshAll = useCallback(async () => {
    setIsRefreshingAll(true);
    try {
      await Promise.allSettled(feeds.map((f) => feedsApi.refresh(f.id)));
      const opts = selectedFeedId ? { feedId: selectedFeedId } : undefined;
      const [updatedArticles, updatedFeeds] = await Promise.all([
        articlesApi.list(opts),
        feedsApi.list(),
      ]);
      setArticles(updatedArticles);
      setFeeds(updatedFeeds);
    } catch (err) {
      console.error("Refresh all failed:", err);
    } finally {
      setIsRefreshingAll(false);
    }
  }, [feeds, selectedFeedId]);

  const handleAddFeed = useCallback(
    async (url: string) => {
      const feed = await feedsApi.create({ url });
      setFeeds((prev) => [...prev, feed]);
      // Auto-refresh after adding
      handleRefreshFeed(feed.id);
    },
    [handleRefreshFeed],
  );

  const handleDeleteFeed = useCallback(async (id: string) => {
    await feedsApi.delete(id);
    setFeeds((prev) => prev.filter((f) => f.id !== id));
    setSelectedFeedId(null);
    setArticles([]);
    setSelectedArticleId(null);
  }, []);

  const handleMarkRead = useCallback(async (id: string, read: boolean) => {
    const updated = await articlesApi.update(id, { read });
    setArticles((prev) => prev.map((a) => (a.id === id ? updated : a)));
  }, []);

  const handleSelectArticle = useCallback(
    async (id: string) => {
      setSelectedArticleId(id);
      // Mark as read automatically on open
      const article = articles.find((a) => a.id === id);
      if (article && article.read === 0) {
        await handleMarkRead(id, true);
      }
    },
    [articles, handleMarkRead],
  );

  return (
    <Sidebar.Provider defaultOpen defaultWidth={280} minWidth={220} resizable className="h-full">
      <FeedSidebar
        feeds={feeds}
        selectedFeedId={selectedFeedId}
        unreadCounts={unreadCounts}
        isDark={isDark}
        isRefreshingAll={isRefreshingAll}
        onSelectFeed={setSelectedFeedId}
        onRefreshAll={handleRefreshAll}
        onAddFeed={() => setAddFeedOpen(true)}
        onToggleDark={() => setIsDark((d) => !d)}
      />

      {/* Main content — two-pane: article list + reader */}
      <main className="flex h-full min-w-0 flex-1">
        {/* Article list pane */}
        <div className="w-96 shrink-0 border-r border-kumo-line">
          <ArticleList
            articles={articles}
            selectedArticleId={selectedArticleId}
            selectedFeed={selectedFeed}
            feedsById={Object.fromEntries(feeds.map((f) => [f.id, f]))}
            isRefreshing={selectedFeedId !== null && (isRefreshing[selectedFeedId] ?? false)}
            onSelectArticle={handleSelectArticle}
            onRefresh={selectedFeedId !== null ? () => handleRefreshFeed(selectedFeedId) : null}
            onDeleteFeed={selectedFeedId !== null ? () => handleDeleteFeed(selectedFeedId) : null}
          />
        </div>

        {/* Article reader pane */}
        <div className="min-w-0 flex-1">
          <ArticleReader
            article={selectedArticle}
            feed={selectedArticleFeed}
            onMarkRead={handleMarkRead}
          />
        </div>
      </main>

      <AddFeedDialog open={addFeedOpen} onOpenChange={setAddFeedOpen} onAdd={handleAddFeed} />
    </Sidebar.Provider>
  );
}
