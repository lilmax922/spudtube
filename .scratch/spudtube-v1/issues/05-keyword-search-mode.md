# 05: Keyword search mode

**What to build:** A search mode separate from genre browsing: one keyword query searches Movies AND TV Shows simultaneously (multi-search), results are labeled by Kind, infinite scroll continues inside results, and the two modes never stack — entering search clears genre filters, leaving search restores the browse state.

**Blocked by:** 04.

**Status:** ready-for-human

- [x] A query returns mixed-Kind results, each visibly labeled MOVIE or TV_SHOW
- [x] Mode switch is exclusive: no combined filter+search states
- [x] Empty query and no-results states render intentionally
- [x] Search pagination continues via infinite scroll

## Comments

Implemented on branch `feat/keyword-search-mode` (local, not yet pushed/merged).

- **Multi-search** reuses the seam S1 endpoint from #4: `useKeywordSearch` (`app/composables/use-keyword-search.ts`) calls `/api/catalog/search` (TMDB multi-search) with the trimmed query; the server maps `media_type` to Kind, so a single query returns MOVIE + TV_SHOW mixed results.
- **Kind labels**: `TitleCard` gained an optional `showKind` prop rendering a frosted badge on the poster (`detail.kind.movie/tv` localized, uppercased). Only search results pass it — browse cards stay unlabeled. The kind→label-key mapping lives in `app/lib/kind.ts` (`kindLabelKey`), shared with `title-facts-panel`.
- **Exclusive modes**: `browse-grid.vue` owns a `mode` ref. Submitting a non-empty query switches to search mode: Kind toggle + genre chips + clear-all are hidden, and `clearGenres()` runs on entry (per spec: entering search clears genre filters). Clearing search (X button, or submitting an empty query while in search mode) restores the browse grid. The search field stays visible in both modes.
- **Intentional states**: empty query keeps/returns the user to browse mode (no dead-end — the X stays available in search mode even with an empty input via `clearable`); zero-result queries render a `No results for "{query}"` panel; separate `search.error`/`search.loading` messages. Search `aria-busy` covers both first-load and append; a loadMore failure shows an inline error line.
- **Infinite scroll** continues inside search results via the same sentinel (`useInfiniteScroll`), dispatching to `searchLoadMore` in search mode and `loadMore` in browse mode. Pagination always uses the last *submitted* query (`searchedQuery`), not the live input text.
- **Refactor (from code review)**: the paging state machine (generation guard, append, error flags) duplicated between browse and search was extracted into `usePagedResults` (`app/composables/use-paged-results.ts`), now used by both composables. Explicit return-type interfaces added per code-standard. No behavior change to browse — its composable tests pass untouched.
- **Tests**: `use-keyword-search.test.ts` (6: first page, empty-query reset, append/last page, error, searched-query pagination, stale append discard), `search-field.test.ts` (4: placeholder, model, submit, clear incl. `clearable`), `title-card.test.ts` (+3 badge tests), `browse-grid.test.ts` (+7: submit hides browse controls, empty submit stays/leaves, mixed-kind labels, no-results, clear→browse, empty-input X, sentinel dispatch). Shell tests (`app.test.ts`, `language-switcher.test.ts`) updated to ref-shaped composable mocks.
- **Files**: New (5) `use-keyword-search.{ts,test.ts}`, `use-paged-results.ts`, `search-field.{vue,test.ts}`; Modified (10) `browse-grid.{vue,test.ts}`, `title-card.{vue,test.ts}`, `title-facts-panel.vue`, `use-browse-grid.ts`, `lib/kind.ts`, `i18n/locales/{en,zh-TW}.json`, `app.test.ts`, `language-switcher.test.ts`.

Verification evidence: `pnpm test` 129/129 green; `pnpm typecheck`, `pnpm lint`, `pnpm build` exit 0. Browser verification deferred: no `TMDB_TOKEN` in this environment; component tests cover both modes at the S3 seam.
