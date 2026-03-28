# cloud-reader — Agent Guide

Personal RSS reader built on Cloudflare Workers and D1. This document is the
authoritative reference for any agent or contributor working in this repository.
Read it fully before making changes.

---

## Agent Rules

These rules are mandatory. Follow them on every task without exception.

1. **Update `WORKLOG.md` before every commit.** Every commit must have a
   corresponding worklog entry documenting what was built, decisions made,
   options considered and discarded, and any dead ends or gotchas. Do not
   commit code without updating the worklog first.

2. **Update `AGENTS.md` before every commit** if the task introduced new
   conventions, stack changes, architectural decisions, or anything a future
   agent would need to know to work in this codebase. When in doubt, add it.

3. **Never commit without running the pre-commit checks.** The hook runs
   lint → type-check → tests. All three must pass. If tests fail, fix them
   before committing — do not skip with `--no-verify`.

4. **Read `WORKLOG.md` before starting any task.** It contains decisions
   already made and dead ends already explored. Do not re-litigate settled
   decisions without a good reason.

---

## What This Is

A self-hosted RSS reader with:
- A REST API backend served from a Cloudflare Worker
- A D1 (SQLite) database for feeds and articles
- Hourly cron-based feed refresh
- A React frontend (Vite + Kumo component library) served as Worker static assets
- A CLI tool for terminal access to the API (phase 3)

This is a **personal, single-user application**. There is no multi-tenancy, no
per-user auth in phase 1. Cloudflare Access (Zero Trust) is deferred to phase 3.

---

## Monorepo Structure

```
cloud-reader/
├── package.json              # Root: pnpm workspace config + root scripts
├── pnpm-workspace.yaml       # Declares packages/*
├── tsconfig.json             # Root: base TS config, extended by all packages
├── AGENTS.md                 # This file
├── WORKLOG.md                # Increment-by-increment build log (agent memory)
└── packages/
    ├── types/                # @cloud-reader/types  — shared TS types
    ├── worker/               # @cloud-reader/worker — CF Worker + D1 API + cron
    ├── app/                  # @cloud-reader/app    — React frontend (phase 2)
    └── cli/                  # @cloud-reader/cli    — CLI tool (phase 3)
```

### Package purposes

| Package | Description |
|---------|-------------|
| `@cloud-reader/types` | Shared `Feed`, `Article`, `NewFeed`, `NewArticle` TypeScript interfaces. No runtime code — types only. Imported by worker, app, and cli. |
| `@cloud-reader/worker` | Cloudflare Worker. Owns the REST API, D1 queries via Drizzle, RSS fetching/parsing, and the hourly cron handler. |
| `@cloud-reader/app` | React SPA built with Vite. Uses `@cloudflare/kumo` component library. Served as static assets from the worker. |
| `@cloud-reader/cli` | Node.js CLI binary. Makes HTTP calls to the deployed worker REST API. Phase 3 — not yet scaffolded. |

---

## Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Cloudflare Workers | Edge deployment, free tier, native D1 binding |
| Database | Cloudflare D1 (SQLite) | Serverless SQLite, integrated with Workers, supports Drizzle |
| ORM | Drizzle ORM + drizzle-kit | Type-safe queries, proper migration support for D1, no `PRAGMA user_version` issues |
| HTTP router | Hono | Lightweight, typed routing; `app.request()` enables clean unit tests without real D1 |
| RSS parsing | `fast-xml-parser` | Pure JS, no native deps, works in Workers runtime, handles RSS 2.0 + Atom |
| Markdown rendering | `marked` | Converts markdown content to HTML for feeds that provide markdown bodies |
| Frontend | React 19 + Vite | Standard SPA setup, good Kumo compatibility |
| UI components | `@cloudflare/kumo` | Cloudflare's own component library, built on Base UI, Tailwind v4 |
| Testing | Vitest | Fast, native ESM, works in Node for D1 tests |
| Monorepo | pnpm workspaces | Strict dependency isolation, fast installs, consistent with Kumo and vega repos |
| Linter | Biome | Fast Rust-based linter + formatter, consistent with vega repo, single config at root |
| Language | TypeScript (strict) | `strict: true` + `noUncheckedIndexedAccess` throughout |

---

## Key Design Decisions

### D1 over Durable Objects
Originally planned to use a Durable Object with SQLite for serialized DB access.
Switched to D1 because: this is a single-user app with no meaningful write
concurrency, D1 gives better tooling (dashboard query console, drizzle-kit
migrations), and the DO added architectural complexity with no real benefit.

### REST API (not RPC)
The Worker exposes a plain HTTP REST API. This makes it directly `curl`-able and
CLI-friendly without any translation layer. All endpoints return JSON.

### Worker serves the frontend
The React app is built to `packages/app/dist/` by Vite, then served as static
assets from the Worker via the `assets` binding. NOT Cloudflare Pages. This keeps
everything in one deployment unit.

### Shared types package
`@cloud-reader/types` contains the canonical `Feed` and `Article` interfaces.
All packages import from here. Never define these types inline in worker or app code.

### Drizzle migrations
Schema changes go through `drizzle-kit generate` (produces SQL in `packages/worker/drizzle/`)
then `wrangler d1 migrations apply` to apply locally or remotely. Never manually
edit generated migration files.

---

## Data Model

### `feeds`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | `crypto.randomUUID()` |
| `url` | `text` UNIQUE NOT NULL | The RSS/Atom feed URL |
| `title` | `text` | From feed `<title>` |
| `site_url` | `text` | From feed `<link>` |
| `description` | `text` | From feed `<description>` / `<subtitle>` |
| `image_url` | `text` | From feed `<image>` or `<itunes:image>` |
| `last_fetched_at` | `integer` | Unix ms, updated on each successful refresh |
| `created_at` | `integer` | Unix ms, set on insert |

### `articles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | `crypto.randomUUID()` |
| `feed_id` | `text` FK → `feeds.id` ON DELETE CASCADE | |
| `url` | `text` UNIQUE NOT NULL | Upsert key |
| `title` | `text` | |
| `summary` | `text` | `<description>` excerpt |
| `content` | `text` | `<content:encoded>` full body |
| `published_at` | `integer` | Unix ms |
| `read` | `integer` NOT NULL DEFAULT 0 | 0 = unread, 1 = read |
| `created_at` | `integer` | Unix ms, set on insert, NOT updated on upsert |

### Indexes
- `idx_articles_feed_id` on `articles(feed_id)`
- `idx_articles_read` on `articles(read)`
- `idx_articles_published_at` on `articles(published_at DESC)`

---

## REST API

Base path: `/api`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/feeds` | List all feeds |
| `POST` | `/api/feeds` | Add feed `{ url: string }` → `201` |
| `DELETE` | `/api/feeds/:id` | Delete feed + cascade articles → `204` |
| `POST` | `/api/feeds/:id/refresh` | Manually refresh feed → `200 { added, updated }` |
| `GET` | `/api/articles` | List articles. Query params: `feed_id`, `unread=true` |
| `PATCH` | `/api/articles/:id` | Update article `{ read: boolean }` → `200` |

All error responses: `{ error: string }` with appropriate HTTP status.

---

## Cron

Runs hourly (`0 * * * *`). Calls `refreshFeed()` for every feed in D1.
Uses `Promise.allSettled` — one failing feed does not abort others.

---

## Frontend Conventions

- **Dark mode:** toggled via `document.documentElement.style.colorScheme`. Kumo uses CSS `light-dark()` internally so all tokens respond automatically. Never use `dark:` Tailwind prefixes. Default is **light mode** (`isDark` initialises to `false`) — does not follow OS preference.
- **No app-wide custom theming:** Kumo owns its component colours via `light-dark()` and `--color-kumo-*` variables. Theming only the parts we own (article body, cards) while Kumo's chrome stays neutral looks fragmented. Stick to Kumo's light/dark toggle.
- **Semantic tokens only:** use `bg-kumo-base`, `text-kumo-default` etc. Never raw Tailwind colors (`bg-blue-500`).
- **All content panes must have `bg-kumo-base`:** the sidebar has its own background from Kumo; the article list and reader must explicitly set `bg-kumo-base` or they'll use the browser default and look wrong in dark mode. Note: `bg-kumo-surface` is a visibly different (elevated) color — do not use it for pane backgrounds, only for cards/dialogs that sit above the base layer.
- **Article typography:** use the `.article-body` CSS class (defined in `app.css`) for rendered article content — NOT Tailwind's `prose` classes. `prose` doesn't use Kumo's CSS variables so colors break in dark mode. `.article-body` uses `var(--color-kumo-*)` directly.
- **HTML entities in article cards:** use `DOMParser` to strip tags and decode all entities. Never manual regex replacement.
- **Article content rendering:** `marked` converts markdown → HTML. Heuristic: if content contains HTML tags treat as HTML, otherwise parse as markdown.
- **Sort order:** article list sorts client-side by `publishedAt ?? createdAt`. Default is newest-first.
- **Auto-mark-read:** selecting an article marks it read automatically.
- **Refresh layout:** refresh-all is a `Sidebar.MenuAction` on the "All articles" row. Per-feed refresh is a button in the `ArticleList` header, shown only when a single feed is selected. No refresh icons on individual sidebar feed rows.
- **Sidebar width:** `defaultWidth={280}`, `minWidth={220}`, `resizable`. Do not reduce these without good reason — feed titles need space.

## General Conventions

- **Exports:** named exports only, no default exports except in `vite.config.ts` and worker entry
- **File naming:** `kebab-case.ts`, test files colocated as `foo.test.ts`
- **Error handling:** Worker endpoints return `{ error: string }` JSON, never throw to the client
- **Types:** always import from `@cloud-reader/types`, never redefine inline
- **SQL:** Drizzle query builder for all queries, raw `sql` template tag only when necessary
- **IDs:** always `crypto.randomUUID()`
- **Timestamps:** always Unix milliseconds (`Date.now()`), stored as `integer`

---

## Pre-commit Hook

Husky runs on every commit:
1. **lint-staged** — biome lint + format on staged `*.ts/tsx/js/jsx` files only
2. **type-check** — `tsc --noEmit` across all packages

To run manually:
```bash
pnpm lint        # biome lint on entire repo
pnpm format      # biome format --write on entire repo
pnpm type-check  # tsc --noEmit across all packages
```

Tests are run on every commit as a guardrail — particularly important for agent-authored
commits. `--passWithNoTests` is set so the hook doesn't fail before any test files exist.

---

## Commands

```bash
# Install all dependencies
pnpm install

# Run worker in local dev mode (with local D1)
pnpm dev

# Run all tests
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Type-check all packages
pnpm type-check

# Build the frontend
pnpm build

# Deploy worker + frontend to Cloudflare
pnpm deploy

# Generate Drizzle migration from schema changes
pnpm --filter @cloud-reader/worker db:generate

# Apply migrations locally
pnpm --filter @cloud-reader/worker db:migrate

# Apply migrations to production
pnpm --filter @cloud-reader/worker db:migrate:remote

# Open Drizzle Studio (local DB browser)
pnpm --filter @cloud-reader/worker db:studio
```

---

## Deployment

- **Production URL:** `https://cloud-reader.alexcostaviana.workers.dev`
- **Deploy command:** `pnpm run --filter @cloud-reader/worker deploy` (or `pnpm run deploy` from root)
- **Local dev:** `pnpm dev` (uses local D1 via wrangler)

---

## Phase Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | Complete | API layer — Worker, D1, REST endpoints, cron, Vitest |
| 2 | Complete | Frontend — React, Vite, Kumo, static assets |
| 3 | Deferred | Auth (Cloudflare Access), CLI tool, FTS5 search, OPML import/export |

See `WORKLOG.md` for increment-by-increment progress and decisions.
