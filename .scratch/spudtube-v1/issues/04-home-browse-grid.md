# 04: Home browse grid

**What to build:** The zero-ceremony landing: Visitors arrive directly on a poster grid. A Kind toggle (Movies / TV Shows) applies in genre-browse mode; Genre chips come from the catalog and combine with OR semantics; results sort by popularity; scrolling seamlessly loads the next pages.

**Blocked by:** 02, 03, 11.

**Status:** ready-for-human

- [x] Landing shows the grid immediately — no hero, no gate
- [x] Kind toggle refetches the grid for the other catalog
- [x] Multi-genre selection unions results (OR)
- [x] Infinite scroll appends pages without clicks
- [x] Poster cards show localized titles; missing artwork degrades gracefully
- [x] Component tests cover card rendering and mode switching (S3)

## Comments

Implemented on `main` via PR #9 — `feat: home browse grid (ticket 04)` merged 2026-08-22T21:05:58Z (commit `2d2406d`, merge `98c1ec2` + `9cc533a`). Verified merged via `gh pr view 9 --json state,mergedAt`.

- **Landing**: no hero, no gate. Frosted capsule top bar with brand + language switcher; `app/pages/index.vue` renders `BrowseGrid` immediately so the home route is the grid (spec stories 1,4).
- **Kind toggle** (`app/components/kind-toggle.vue`): segment control Movies / TV Shows at the top of the grid; switching refetches the catalog via `useBrowseGrid` and clears genre selection. Tested in `kind-toggle.test.ts` and `browse-grid.test.ts`.
- **Genre chips** (`app/components/genre-chips.vue`): multi-select with OR semantics. TMDB boundary uses `|` (`with_genres=18|10765` in `server/tmdb/client.ts`) so discover returns the union, not the intersection (spec story 3). `Clear all` appears when ≥1 genre is selected.
- **Infinite scroll** (`app/composables/use-infinite-scroll.ts`): `IntersectionObserver` on a sentinel element appends pages 2..N automatically. `useBrowseGrid` (`app/composables/use-browse-grid.ts`) holds a `generation` counter to discard stale-page races — covered explicitly in `use-browse-grid.test.ts`.
- **Poster cards** (`app/components/title-card.vue`): localized title + year via `app/lib/tmdb-image.ts`; missing artwork falls back to `<Clapperboard>` glyph + title (spec story 15 graceful degradation).
- **Architecture (seam S3)**: components are presentational (`title-card`, `kind-toggle`, `genre-chips`); `browse-grid` orchestrates. Data layer is `useBrowseGrid` with an injectable `BrowseFetcher` mocked at the import site in tests (`vi.mock('../composables/use-browse-grid')`); the API fetcher hits `/api/catalog/genres` and `/api/catalog/discover` (seam S1, built in #4). i18n strings live under `browse.*` in `i18n/locales/{en,zh-TW}.json`.
- **Tests**: 4 component tests + composable test added; 2 shell tests updated. `browse-grid.test.ts`, `kind-toggle.test.ts`, `genre-chips.test.ts`, `title-card.test.ts`, `use-browse-grid.test.ts`.
- **Files**: New (10) `browse-grid.{vue,test.ts}`, `title-card.{vue,test.ts}`, `kind-toggle.{vue,test.ts}`, `genre-chips.{vue,test.ts}`, `use-browse-grid.{ts,test.ts}`, `use-infinite-scroll.ts`, `tmdb-image.ts`; Modified (7) `app/app.vue`, `app/app.test.ts`, `language-switcher.test.ts`, `i18n/locales/{en,zh-TW}.json`, `server/tmdb/client.{ts,test.ts}`. 19 files, +935/-27.

Verification evidence: `pnpm typecheck`, `pnpm lint`, `pnpm build` exit 0; `pnpm test` 80/80 green; manual browser verification (dev server): kind toggle refetches, two-genre union works, infinite scroll appends, language switch re-labels.
