import { Sidebar, Badge } from "@cloudflare/kumo";
import {
  RssIcon,
  ArrowsClockwiseIcon,
  GithubLogoIcon,
  MoonIcon,
  SunIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import type { Feed } from "@cloud-reader/types";

interface FeedSidebarProps {
  feeds: Feed[];
  selectedFeedId: string | null;
  unreadCounts: Record<string, number>;
  isDark: boolean;
  isRefreshingAll: boolean;
  onSelectFeed: (id: string | null) => void;
  onRefreshAll: () => void;
  onAddFeed: () => void;
  onToggleDark: () => void;
}

export function FeedSidebar({
  feeds,
  selectedFeedId,
  unreadCounts,
  isDark,
  isRefreshingAll,
  onSelectFeed,
  onRefreshAll,
  onAddFeed,
  onToggleDark,
}: FeedSidebarProps) {
  return (
    <Sidebar>
      <Sidebar.Header>
        <div className="flex items-center gap-2 px-2 py-2">
          <RssIcon weight="bold" className="text-kumo-brand" size={20} />
          <span className="font-semibold text-kumo-strong">cloud-reader</span>
        </div>
      </Sidebar.Header>

      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  icon={<RssIcon />}
                  active={selectedFeedId === null}
                  onClick={() => onSelectFeed(null)}
                >
                  All articles
                </Sidebar.MenuButton>
                <Sidebar.MenuAction
                  title="Refresh all feeds"
                  onClick={onRefreshAll}
                  disabled={isRefreshingAll}
                >
                  <ArrowsClockwiseIcon className={isRefreshingAll ? "animate-spin" : ""} />
                </Sidebar.MenuAction>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
          </Sidebar.GroupContent>
        </Sidebar.Group>

        <Sidebar.Separator />

        <Sidebar.Group>
          <Sidebar.GroupLabel>Feeds</Sidebar.GroupLabel>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              {feeds.map((feed) => {
                const unread = unreadCounts[feed.id] ?? 0;
                return (
                  <Sidebar.MenuItem key={feed.id}>
                    <Sidebar.MenuButton
                      active={selectedFeedId === feed.id}
                      onClick={() => onSelectFeed(feed.id)}
                    >
                      <span className="flex-1 truncate">{feed.title ?? feed.url}</span>
                      {unread > 0 && <Badge variant="secondary">{unread}</Badge>}
                    </Sidebar.MenuButton>
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
            <Sidebar.MenuButton icon={<PlusIcon />} onClick={onAddFeed}>
              Add feed
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton icon={isDark ? <SunIcon /> : <MoonIcon />} onClick={onToggleDark}>
              {isDark ? "Light mode" : "Dark mode"}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              icon={<GithubLogoIcon />}
              onClick={() =>
                window.open(
                  "https://github.com/acviana/cloud-reader",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              Source code
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
        <Sidebar.Trigger />
      </Sidebar.Footer>
    </Sidebar>
  );
}
