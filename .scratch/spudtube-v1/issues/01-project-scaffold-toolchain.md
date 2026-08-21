# 01: Project scaffold & toolchain

**What to build:** A cloneable, runnable foundation: Nuxt + TypeScript app started via pnpm; antfu ESLint wrapping the Nuxt ESLint setup with auto-imports disabled at all three sites; Tailwind + shadcn-vue initialized; Dockerized local Postgres (compose file with named volume + healthcheck); Drizzle wired through `DATABASE_URL`; Vitest running under both node and happy-dom environments; scripts for typecheck/lint/build/test. This is the prefactor that makes every later slice easy.

**Blocked by:** None (can start immediately).

**Status:** ready-for-human

- [x] Fresh clone → README steps → dev server serves an app shell
- [x] All four gates pass on the untouched scaffold: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`
- [x] Docker compose brings up healthy Postgres reachable via `DATABASE_URL`; a Drizzle smoke migration applies
- [x] One node-environment test and one happy-dom component test pass as pattern-setters
- [x] Lint demonstrably enforces kebab-case filenames and antfu style

## Comments

Implemented on `main`. Summary of decisions:

- **Nuxt 4.5** hand-rolled (no create-nuxt clobber of existing docs): `app/` srcDir layout per Nuxt 4 directory-structure docs; root `tsconfig.json` uses project references over `.nuxt/tsconfig.{app,server,shared,node}.json` so typecheck covers server code too (verified with negative probes).
- **Auto-imports off at all three sites**: `imports.autoImport: false`, `components.dirs: []`, `nitro.imports: false`; h3 imported explicitly as owning package.
- **ESLint**: `@antfu/eslint-config` composed inside `withNuxt()` (`eslint.config.standalone: false`). antfu 9.x no longer enables `unicorn/filename-case` by default — enabled explicitly (`kebabCase`) per code-standard. Generated Drizzle migrations globally ignored.
- **Health endpoint lives in `server/api/`** (`/api/health`): `server/routes/**` maps to root paths; `/api/**` prefix belongs to `server/api/`.
- **Tests**: official Nuxt stack — Vitest runner + `@nuxt/test-utils` (nuxt environment, happy-dom DOM base) with `@vue/test-utils` arriving as its transitive peer. Two projects split by directory — `node` (server/shared) and `happy-dom` (app, wrapped in `defineVitestProject`). Pattern-setters: health route tested through h3's `toWebHandler` (real request→response boundary); app shell mounted with `mountSuspended()` from `@nuxt/test-utils/runtime`. Known upstream issue nuxt/test-utils#1490 (Vitest 4 chokes on the never-executed `setupBun`'s `import('bun:test')`) — worked around by aliasing `bun:test` in the happy-dom project config.
- **Drizzle**: schema starts with only the spec-derived `kind` enum (CONTEXT.md Kind); migration `0000` generated, applied, and verified inside the container (`enum_range` + journal row count). `createDb()` factory in `server/database/db.ts` is the single wiring point for `DATABASE_URL`.
- **Postgres 18 note**: image mounts data at `/var/lib/postgresql` (not `.../data`) — compose volume reflects that.
- **Supply-chain**: pnpm 11 policies recorded in `pnpm-workspace.yaml` (`allowBuilds`, `minimumReleaseAgeExclude`, `trustPolicy: no-downgrade` with one exclusion for `semver@6.3.1`, flagged as takeover-risk by pnpm's trust registry — known-good npm package).
- **TypeScript pinned to 5.9**: TS 7 breaks @typescript-eslint peer range (<6.1).
- Pre-commit hook wired via simple-git-hooks + lint-staged (`eslint --fix` on staged files).

Verification evidence: all four gates exit 0; dev server SSR renders app shell and `/api/health` returns JSON; `BadName.ts` probe fails lint with `unicorn/filename-case` then passes after removal.
