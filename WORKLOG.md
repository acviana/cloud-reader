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
