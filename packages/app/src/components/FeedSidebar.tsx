import { Sidebar, Badge } from "@cloudflare/kumo";
import { RssIcon, ArrowsClockwiseIcon } from "@phosphor-icons/react";
import type { Feed } from "@cloud-reader/types";

interface FeedSidebarProps {
  feeds: Feed[];
  selectedFeedId: string | null;
  unreadCounts: Record<string, number>;
  onSelectFeed: (id: string | null) => void;
  onRefreshFeed: (id: string) => void;
  onAddFeed: () => void;
  isRefreshing: Record<string, boolean>;
}

export function FeedSidebar({
  feeds,
  selectedFeedId,
  unreadCounts,
  onSelectFeed,
  onRefreshFeed,
  onAddFeed,
  isRefreshing,
}: FeedSidebarProps) {
  return (
    <Sidebar>
      <Sidebar.Header>
        <div className="flex items-center gap-2 px-2 py-1">
          <RssIcon weight="bold" className="text-kumo-brand" size={20} />
          <span className="font-semibold text-kumo-strong">cloud-reader</span>
        </div>
      </Sidebar.Header>

      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.GroupLabel>Feeds</Sidebar.GroupLabel>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              {/* All articles view */}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  icon={<RssIcon />}
                  active={selectedFeedId === null}
                  onClick={() => onSelectFeed(null)}
                >
                  All articles
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>

              {feeds.map((feed) => {
                const unread = unreadCounts[feed.id] ?? 0;
                return (
                  <Sidebar.MenuItem key={feed.id}>
                    <Sidebar.MenuButton
                      active={selectedFeedId === feed.id}
                      onClick={() => onSelectFeed(feed.id)}
                    >
                      <span className="flex-1 truncate">{feed.title ?? feed.url}</span>
                      {unread > 0 && <Badge variant="primary">{unread}</Badge>}
                    </Sidebar.MenuButton>
                    <Sidebar.MenuAction
                      title="Refresh feed"
                      onClick={() => onRefreshFeed(feed.id)}
                      disabled={isRefreshing[feed.id]}
                    >
                      <ArrowsClockwiseIcon
                        className={isRefreshing[feed.id] ? "animate-spin" : ""}
                      />
                    </Sidebar.MenuAction>
                  </Sidebar.MenuItem>
                );
              })}
            </Sidebar.Menu>
          </Sidebar.GroupContent>
        </Sidebar.Group>
      </Sidebar.Content>

      <Sidebar.Footer>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton onClick={onAddFeed}>+ Add feed</Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
        <Sidebar.Trigger />
      </Sidebar.Footer>
    </Sidebar>
  );
}
