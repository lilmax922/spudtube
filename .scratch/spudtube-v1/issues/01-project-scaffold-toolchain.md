# 01: Project scaffold & toolchain

**What to build:** A cloneable, runnable foundation: Nuxt + TypeScript app started via pnpm; antfu ESLint wrapping the Nuxt ESLint setup with auto-imports disabled at all three sites; Tailwind + shadcn-vue initialized; Dockerized local Postgres (compose file with named volume + healthcheck); Drizzle wired through `DATABASE_URL`; Vitest running under both node and happy-dom environments; scripts for typecheck/lint/build/test. This is the prefactor that makes every later slice easy.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Fresh clone → README steps → dev server serves an app shell
- [ ] All four gates pass on the untouched scaffold: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`
- [ ] Docker compose brings up healthy Postgres reachable via `DATABASE_URL`; a Drizzle smoke migration applies
- [ ] One node-environment test and one happy-dom component test pass as pattern-setters
- [ ] Lint demonstrably enforces kebab-case filenames and antfu style
