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
- **Type-check only in hook (not full tests):** Pre-commit stays fast (~1-2s).
  Full `vitest run` deferred to manual runs and CI.
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
