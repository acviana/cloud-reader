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
