# cloud-reader — Worklog

Agent memory bank. Each increment is logged here with what was built, decisions
made, options discarded, and any dead ends. Read this before starting any new
work to avoid re-litigating settled decisions or repeating failed approaches.

---

## Increment 0 — Monorepo scaffold
**Date:** 2026-03-27
**Status:** Complete

### What was built
- Root `package.json` with pnpm workspace config and root-level scripts
- `pnpm-workspace.yaml` declaring `packages/*`
- Root `tsconfig.json` with strict TypeScript settings (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- `.gitignore` covering `node_modules`, `.wrangler`, D1 local db files, build output
- `AGENTS.md` — full project context document
- `WORKLOG.md` — this file

### Decisions made
- **pnpm over npm:** Chosen for strict dependency isolation (prevents phantom deps
  between packages), faster installs, and consistency with the vega repo and the
  Kumo repo which both use pnpm.
- **Monorepo from the start:** Even though the CLI (phase 3) doesn't exist yet,
  the monorepo structure is established now so it doesn't require restructuring later.
  The `cli` package is not scaffolded yet — it will be added in phase 3.
- **TypeScript strict mode:** `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
  enabled from day one. These are harder to add later than to start with.

### Options considered and discarded
- **npm workspaces:** Rejected in favour of pnpm. npm's hoisting can cause phantom
  dependencies where a package accidentally imports something installed for a sibling
  package. pnpm's strict linking prevents this.
- **Single-package (no monorepo):** Rejected because the CLI tool (phase 3) needs
  to be a separate Node.js binary with its own `package.json` and build, and the
  frontend needs its own Vite build. A monorepo is the cleanest way to share types
  across all three without publishing to npm.

### Dead ends / gotchas
- None at this stage.

---

<!-- New increments are appended below this line -->

## Increment 6 — Feeds API + Hono router
**Date:** 2026-03-27
**Status:** Complete

### What was built
- `hono` added as a runtime dependency
- `src/worker/index.ts` — refactored to use `createApp(dbOverride?)` factory with
  Hono. DB injected via context variable middleware so routes are testable without
  a real D1 binding.
- `src/worker/routes/feeds.ts` — Hono router: `GET /`, `POST /`, `DELETE /:id`,
  `POST /:id/refresh`
- `src/worker/routes/articles.ts` — stub returning 501 (implemented in increment 7)
- `src/worker/cron.ts` — `runCron(db)` extracted from index
- `src/worker/feeds.test.ts` — 11 tests using `app.request()` with in-memory DB

### Decisions made
- **Hono over hand-rolled routing:** Switched at user request. Hono gives typed
  routing, `c.req.param()`, `c.json()`, middleware, and `app.request()` for testing
  — eliminates all the manual URL parsing and method switching.
- **`createApp(dbOverride?)` factory:** Allows tests to pass a `LibSQLDatabase`
  instance as the DB without needing a real D1 binding. The middleware injects it
  into Hono context so all routes use `c.get("db")` rather than calling
  `drizzle(c.env.DB)` directly — clean separation of construction from use.
- **`Variables` type on Hono app:** Typed context variables (`db: DrizzleD1Database`)
  give full type safety on `c.get("db")` throughout all route handlers.

### Options considered and discarded
- **Hand-rolled routing (original plan):** Rejected mid-increment at user request.
  The regex matching and manual method dispatch was already getting verbose.

### Dead ends / gotchas
- None.

## Increment 5 — Refresh logic + tests
**Date:** 2026-03-27
**Status:** Complete

### What was built
- `packages/worker/src/lib/refresh.ts` — `refreshFeed(feedId, db)`: loads feed from
  DB, fetches RSS URL, parses XML, updates feed metadata, upserts articles (check
  existence then insert or update), returns `{ added, updated }`.
- `packages/worker/src/lib/test-helpers.ts` — `createTestDb()`: creates an in-memory
  libsql database with the cloud-reader schema applied, used as a drop-in for D1 in tests.
- `packages/worker/src/lib/refresh.test.ts` — 9 tests: added count, article storage,
  feed metadata update, article fields, upsert on re-refresh, read flag preservation,
  feed-not-found error, HTTP failure error, unparseable XML error.
- `@libsql/client` added as devDependency for in-memory SQLite in tests.

### Decisions made
- **Check-then-insert upsert pattern:** D1's `onConflictDoUpdate` support in Drizzle
  requires careful handling with the `libsql` driver in tests. Using a
  select-then-insert-or-update pattern works identically across both D1 and libsql,
  keeping test behavior consistent with production.
- **`db as never` cast in tests:** The test DB is `LibSQLDatabase` but `refreshFeed`
  takes `DrizzleD1Database`. Both share compatible Drizzle query interfaces — casting
  avoids a complex generic type parameter on `refreshFeed` while keeping production
  types correct.
- **`vi.stubGlobal("fetch")` for network mocking:** No network calls in tests.
  `fetch` is stubbed globally per test via `beforeEach`/`afterEach`.

### Dead ends / gotchas
- None.

## Increment 4 — RSS parsing + tests
**Date:** 2026-03-27
**Status:** Complete

### What was built
- `packages/worker/src/lib/parse.ts` — `parseFeed(xml)` normalizes RSS 2.0 and Atom
  feeds into `ParsedFeed`. Handles: feed metadata (title, siteUrl, description, imageUrl),
  articles (url, title, summary, content, publishedAt), `content:encoded`, CDATA, Atom
  text constructs, Atom link rel filtering, fallback from `published` → `updated`.
- `packages/worker/src/lib/parse.test.ts` — 12 tests covering RSS 2.0, Atom, and edge
  cases (no image, no pubDate, invalid XML, unrecognized XML format).

### Decisions made
- **`fast-xml-parser` with `isArray` for `item`/`entry`:** Single-item feeds would
  otherwise return an object instead of an array. The `isArray` option forces consistent
  array output.
- **Filter articles with empty URL:** Articles with no resolvable URL are dropped
  rather than stored with an empty string, which would violate the `NOT NULL` constraint
  and cause upsert collisions.
- **`parseFeed` returns `null` on unrecognized format:** Caller decides how to handle
  (log and skip vs. error).

### Dead ends / gotchas
- `allowImportingTsExtensions: true` is required in `tsconfig.json` to import
  `./parse.ts` with the `.ts` extension in test files. Without it, tsc errors even
  though Vitest handles it fine at runtime.

## Increment 3 — DB schema + migration
**Date:** 2026-03-27
**Status:** Complete

### What was built
- `packages/worker/src/db/schema.ts` — Drizzle schema for `feeds` and `articles` tables
  with all finalized columns, foreign key with `ON DELETE CASCADE`, and three explicit
  indexes on `articles`: `idx_articles_feed_id`, `idx_articles_read`, `idx_articles_published_at`
- `packages/worker/drizzle/0000_silly_rumiko_fujikawa.sql` — generated migration
- `packages/worker/drizzle/meta/` — drizzle-kit journal and snapshot

### Decisions made
- **Explicit index definitions in schema:** Drizzle does not auto-generate query
  indexes — only unique indexes. The three query indexes (`feed_id`, `read`,
  `published_at`) were added using `index()` in the third argument of `sqliteTable`.
- **`published_at` index is not DESC:** Drizzle's SQLite `index()` helper does not
  support descending index direction. A plain ascending index on `published_at` still
  helps the query planner for `ORDER BY published_at DESC` on small-to-medium datasets.

### Dead ends / gotchas
- Generated migration twice. First run lacked indexes (Drizzle only auto-generates
  unique indexes, not query indexes). Had to add `index()` calls to the schema and
  regenerate. The `drizzle/` folder was wiped and regenerated from scratch to get a
  clean `0000_` migration rather than `0001_`.

## Pre-commit hook — Biome + Husky
**Date:** 2026-03-27
**Status:** Complete

### What was built
- `biome.json` — root biome v2 config: linter (recommended rules + `noUnusedImports: error`),
  formatter (2-space, 100 col, double quotes, trailing commas), file includes/excludes
- `.husky/pre-commit` — runs `pnpm lint-staged` then `pnpm type-check`
- `lint-staged` config in root `package.json` — biome lint + format on staged `*.ts/tsx/js/jsx`
- Root scripts: `lint`, `format`
- `husky` + `lint-staged` + `@biomejs/biome` installed as root devDependencies
- `pnpm.onlyBuiltDependencies` already present — no changes needed

### Decisions made
- **Biome over ESLint:** Same tool as vega repo. Single binary, no plugin ecosystem to
  manage, lint + format in one pass.
- **Tests run in pre-commit:** Originally type-check only, but changed to also run
  `pnpm test:run` as an agent guardrail — prevents agents from committing broken code
  without noticing. `--passWithNoTests` prevents failure before test files exist.
- **lint-staged for biome:** Only lints files staged for the current commit — avoids
  re-linting the entire repo on every commit.

### Options considered and discarded
- **lefthook:** Used by Kumo repo. Rejected because husky is simpler, already used
  by vega, and works well with pnpm workspaces.
- **Running tests in pre-commit:** Rejected — test suite will grow and a slow hook
  gets bypassed with `--no-verify`. Type-check catches the most common class of errors.

### Dead ends / gotchas
- Biome v2 changed the config schema from v1. `organizeImports` is now under
  `assist.actions.source`, and `files.ignore` is now `files.includes` with `!` prefixes.
  Running `biome migrate --write` fixed this automatically.
- `biome lint --write` does not apply "unsafe" fixes — the `process.env["KEY"]` →
  `process.env.KEY` suggestion required manual edits despite being trivially safe.

## Increment 2 — Worker package scaffold
**Date:** 2026-03-27
**Status:** Complete

### What was built
- `packages/worker/package.json` — `@cloud-reader/worker`, deps: `drizzle-orm`, `fast-xml-parser`, `@cloud-reader/types`; devDeps: `wrangler`, `drizzle-kit`, `vitest`, `@cloudflare/workers-types`
- `packages/worker/tsconfig.json` — extends root, adds `@cloudflare/workers-types`
- `packages/worker/wrangler.jsonc` — D1 binding (placeholder `database_id` until increment 9), hourly cron trigger
- `packages/worker/drizzle.config.ts` — `d1-http` driver, credentials from env vars
- `packages/worker/vitest.config.ts` — Node environment, `src/**/*.test.ts`
- `packages/worker/src/worker/index.ts` — minimal stub with correct `Env` interface and placeholder handlers
- Root `package.json` updated with `pnpm.onlyBuiltDependencies` to approve native build scripts for `esbuild`, `sharp`, `workerd`

### Decisions made
- **`database_id: "placeholder"`** in `wrangler.jsonc` — actual ID requires running
  `wrangler d1 create` which needs CF credentials. Deferred to increment 9.
- **`drizzle.config.ts` uses env vars for credentials** — `CLOUDFLARE_ACCOUNT_ID`,
  `CLOUDFLARE_DATABASE_ID`, `CLOUDFLARE_D1_TOKEN`. These are only needed for
  `drizzle-kit studio` / remote operations, not for local dev or tests.
- **`pnpm.onlyBuiltDependencies`** in root `package.json` — pnpm v9+ requires
  explicit approval for packages that run install scripts. Added `esbuild`, `sharp`,
  `workerd` (wrangler's runtime binary).

### Dead ends / gotchas
- `ScheduledEvent` is the wrong type for the `scheduled()` handler — the correct
  type is `ScheduledController`. `ScheduledEvent` is the DOM event interface.
  Fixed before committing.

## Increment 1 — Shared types package
**Date:** 2026-03-27
**Status:** Complete

### What was built
- `packages/types/package.json` — `@cloud-reader/types` workspace package
- `packages/types/tsconfig.json` — extends root tsconfig
- `packages/types/src/index.ts` — canonical types:
  - `Feed`, `NewFeed`
  - `Article`, `UpdateArticle`
  - `RefreshResult`, `ApiError`
  - `ParsedFeed`, `ParsedFeedMeta`, `ParsedArticle` — internal shape from parser

### Decisions made
- **No runtime code:** Package is types-only. The `exports` field points directly
  to `src/index.ts` — no build step needed for a types-only package.
- **`ParsedFeed` types included here:** Even though `parse.ts` lives in the worker,
  the parsed feed shape is defined in types so the CLI could eventually use it too
  if it ever parses feeds locally.
- **`read` stays as `number` (not `boolean`):** SQLite stores booleans as integers.
  The `Article` interface reflects the DB representation (`0` / `1`) to avoid
  silent coercion bugs. The API layer converts to boolean when needed.

### Options considered and discarded
- **Separate `ParsedFeed` types in worker:** Rejected — if the CLI ever parses feeds
  locally, it would need to duplicate these types. Defining them in `@cloud-reader/types`
  is free and keeps the canonical source clear.

### Dead ends / gotchas
- None.
