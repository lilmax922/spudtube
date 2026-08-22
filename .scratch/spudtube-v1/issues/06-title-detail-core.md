# 06: Title detail core (identity, trailer, recommendations)

**What to build:** Detail routes for both Kinds showing the identity block — backdrop, poster, overview (zh-TW with English fallback), Genres, release year, runtime — plus an embedded trailer and a recommendations strip whose items link to their own detail pages. Reaching a Title that TMDB no longer has degrades gracefully instead of crashing.

**Blocked by:** 02, 03, 11.

**Status:** ready-for-human

- [x] Direct URL visits work for a known movie id and tv id
- [x] Trailer embeds when available and disappears cleanly when not
- [x] Recommendations strip navigates Title → Title
- [x] Unknown/removed ids render a friendly not-found state
- [x] Route-level tests run against the faked S1 client; component tests cover identity block rendering

## Comments

Implemented on `main` via PR #7 — `feat: title detail core — identity, trailer, recommendations (ticket 06)` merged 2026-08-22T18:01:57Z (commit `b60ec93`). Verified merged via `gh pr view 7 --json state,mergedAt`.

- **Routes**: separate trees `/movie/[id]` (`app/pages/movie/[id].vue`) and `/tv/[id]` (`app/pages/tv/[id].vue`) both render `app/components/title-detail-page.vue`, which composes the page via `useTitleDetail`. Direct URL visits work for a known movie and tv id (spec stories 8–10).
- **Identity block** (`app/components/title-identity-block.vue` + `title-facts-panel.vue`): TMDB-style hero — backdrop with dark overlay, poster left, title + inline year + meta chips (genres/year/runtime) + tagline + overview right; two-column grid below (facts sidebar: kind / released / runtime | trailer panel). Overview/tagline use zh-TW with English fallback (`pickOverview` in `server/tmdb/mappers.ts`). `app/lib/images.ts` / `app/lib/kind.ts` build TMDB image URLs and Kind↔segment mapping; `app/lib/title-detail-fixtures.ts` shares fakes (`MOVIE_DETAIL`, `TV_DETAIL`, `MOVIE_DETAIL_NO_TRAILER`).
- **Trailer** (`app/components/title-trailer.vue`): embeds YouTube Trailer when `videos` contains an official Trailer (prefers zh over en via `pickTrailerKey`), disappears cleanly when none.
- **Recommendations strip** (`app/components/recommendations-strip.vue`): driven by `GET /api/catalog/:kind/:id/recommendations` (seam S1 proxy); cards link Title → Title. Tested in `recommendations-strip.test.ts` and route tests `app/pages/movie/[id].test.ts` / `app/pages/tv/[id].test.ts`.
- **Graceful degradation**: `server/tmdb/client.ts` maps upstream 404 → `null` (negative-cached 1h in `server/tmdb/cache.ts`); `useTitleDetail` maps 400 → `title-not-found` (`app/components/title-not-found.vue`) rather than crashing (spec: catalog drift).
- **Home refactor**: `app/pages/index.vue` + `app/app.vue` — home content moves into a real page so the shell is just chrome; `docs/design/spudtube-v1-prototype.html` added as visual reference, `docs/agents/design-system.md` and `.scratch/spudtube-v1/decisions/design-baseline.md` aligned with the prototype.
- **Files**: New (14) `title-identity-block.{vue,test.ts}`, `title-trailer.{vue,test.ts}`, `title-not-found.vue`, `recommendations-strip.{vue,test.ts}`, `title-facts-panel.{vue,test.ts}`, `title-detail-page.vue`, `use-title-detail.ts`, `images.ts`, `kind.ts`, `title-detail-fixtures.ts`, `movie/[id].{vue,test.ts}`, `tv/[id].{vue,test.ts}`, `spudtube-v1-prototype.html`; Modified `app/app.vue`, `language-switcher.test.ts`, `i18n/locales/{en,zh-TW}.json`. 27 files, +1844/-16.
- **Tests**: route-level tests run against the faked S1 client (`createFakeTransport`); component tests cover identity block rendering.

Verification evidence: `pnpm typecheck`, `pnpm lint`, `pnpm build` exit 0; `pnpm test` 21 files / 77 tests green.
