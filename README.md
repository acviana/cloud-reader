# cloud-reader

A personal RSS reader built entirely on Cloudflare — Worker, D1, and static assets in a single deployment.

**Live:** https://cloud-reader.alexcostaviana.workers.dev

---

## Features

- Add RSS 2.0 and Atom feeds by URL
- Hourly background refresh via Cloudflare cron triggers; manual refresh-all or per-feed
- Read/unread tracking, auto-mark-read on open
- Sort articles newest or oldest first
- Markdown and HTML article content rendering
- Article titles link to original posts
- Dark/light mode toggle (defaults to light mode)
- Resizable three-pane layout: feed sidebar, article list, article reader
- REST API is fully `curl`-able — no auth in phase 1

---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM + drizzle-kit |
| HTTP router | Hono |
| RSS parsing | fast-xml-parser |
| Frontend | React 19 + Vite |
| UI | @cloudflare/kumo + Tailwind v4 |
| Monorepo | pnpm workspaces |
| Linting | Biome |
| Testing | Vitest |

---

## Project structure

```
cloud-reader/
├── packages/
│   ├── types/      # @cloud-reader/types  — shared TypeScript types
│   ├── worker/     # @cloud-reader/worker — REST API + cron + D1
│   └── app/        # @cloud-reader/app    — React SPA
├── AGENTS.md       # Architecture reference for agents and contributors
└── WORKLOG.md      # Decision log for every increment
```

---

## REST API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/feeds` | List all feeds |
| `POST` | `/api/feeds` | Add a feed `{ url }` |
| `DELETE` | `/api/feeds/:id` | Delete a feed and its articles |
| `POST` | `/api/feeds/:id/refresh` | Manually refresh a feed |
| `GET` | `/api/articles` | List articles (`?feed_id=`, `?unread=true`) |
| `PATCH` | `/api/articles/:id` | Mark read/unread `{ read: boolean }` |

All responses are JSON. Errors return `{ error: string }`.

---

## Development

```bash
# Install dependencies
pnpm install

# Run the worker locally (with local D1)
pnpm dev

# Run the frontend dev server (proxies /api/* to wrangler on :8787)
pnpm --filter @cloud-reader/app dev

# Run all tests
pnpm test:run

# Type-check all packages
pnpm type-check
```

---

## Deployment

```bash
# Build frontend + deploy worker + assets to Cloudflare
pnpm deploy
```

Migrations are applied separately:

```bash
# Apply to local D1
pnpm --filter @cloud-reader/worker db:migrate

# Apply to production D1
pnpm --filter @cloud-reader/worker db:migrate:remote
```

---

## Schema changes

```bash
# Edit packages/worker/src/db/schema.ts, then:
pnpm --filter @cloud-reader/worker db:generate   # generates SQL in drizzle/
pnpm --filter @cloud-reader/worker db:migrate     # apply locally
pnpm --filter @cloud-reader/worker db:migrate:remote  # apply to production
```

---

## Pre-commit hooks

Every commit runs:
1. Biome lint + format on staged files
2. `tsc --noEmit` across all packages
3. `vitest run` across all packages

---

## Roadmap

- **Phase 3:** Cloudflare Access auth, CLI tool, full-text search (D1 FTS5), OPML import/export
