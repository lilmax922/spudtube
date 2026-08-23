# 10: WatchStatus & My List

**What to build:** A status toggle on detail pages (WATCHLISTED / WATCHED) plus a single My List page with three tabs — Watchlist, Watched, Rated. State machine: exactly one state per User×Title; marking WATCHED removes WATCHLISTED; re-watchlisting moves it back. Tabs join stored references with batched live TMDB details (current poster/name). A reference TMDB has removed renders as a degraded entry without breaking the list.

**Blocked by:** 06, 08, 14.

**Status:** ready-for-human

- [x] Transition rules hold, including WATCHED-overwrites-WATCHLISTED and clearing-to-null (integration-tested)
- [x] Invalid payloads rejected with 400 `{ issues }` before any business logic runs (integration-tested)
- [x] Cross-user isolation integration-tested: another User cannot see or mutate my statuses
- [x] Three tabs show the correct sets with live details
- [x] Removed-from-catalog references degrade gracefully; the rest of the list still loads
- [x] Anonymous gating matches Rating behavior

## Comments

Implemented on the current branch, aligned with the merged ticket 09 (same route/composable/component shapes; i18n keys are disjoint — the two tickets' shared files conflict mechanically, not semantically).

- **Data layer**: `server/db/schema/title-status.ts` colocates `watchStatusEnum`, the `title_status` table (composite PK `(user_id, kind, tmdb_id)`, **nullable** `status` per ADR 0003 — clearing sets NULL in place, the row stays), relations, `WatchStatus`/`TitleStatus`/`InsertTitleStatus` types and the three drizzle-zod variants (`InsertTitleStatusSchema` / `SelectTitleStatusSchema` / `UpdateTitleStatusSchema`, refined where defined). Migration `0004_far_tony_stark` created via `pnpm db:generate` (new `watch_status` enum + table + cascade FK to `user`).
- **Queries** (`server/db/queries/title-status.ts`): `findTitleStatus`, `findTitleStatuses` (live-state rows only, newest `updatedAt` first), `upsertTitleStatus` — the single-row `onConflictDoUpdate` IS the state machine (WATCHED overwrites WATCHLISTED, re-watchlisting moves back) — and `clearTitleStatus` (sets NULL, returns the row).
- **Status routes** (`server/api/status/[kind]/[id].{get,put,delete}.ts` + `server/api/status/params.ts`, mirroring ticket 09's `/api/ratings` layout): every verb requires a session (401 anonymous), GET returns `{ status }` (null when none), PUT validates `UpdateTitleStatusSchema.pick({ status: true }).required()` through the shared `apiValidationError` 400 `{ issues }` contract before any business logic, DELETE clears to null.
- **My List route** (`server/api/my-list.get.ts`): `GET /api/my-list` returns `{ watchlist, watched, rated }`; each entry is `{ kind, tmdbId, title }` where `title` is the live TMDB summary — references fetched in one batched `Promise.all` pass (one client call per unique title across tabs, deduped), `null` when TMDB no longer has the title or the fetch fails (a transient upstream error degrades to a null entry instead of 500ing the whole list). Rated ordered newest-first.
- **Client**: `app/composables/use-title-status.ts` (optimistic `status`/`pending`/`set`/`clear`, GET only while signed in — mirrors the merged rating composable byte-for-byte, including its `watch(id)` refetch on client-side title navigation and keep-displayed-state-on-refresh-failure); `app/components/title-status-toggle.vue` (two 38px actions, Bookmark + CircleCheck, fill when active, data-driven from one `ACTIONS` config like the rating trio, `setStatus`/`clearStatus`/`signInRequested` emits); both wired into `title-detail-page.vue`/`title-identity-block.vue` exactly like the rating trio (same session fetch, same event names).
- **My List page** (`app/pages/my-list.vue`): three hand-rolled tabs (Watchlist / Watched / Rated); entries show current poster + name + year and link to their detail routes; the `MyList`/`MyListEntry` response types are shared from the route module via `#server` (no client-side re-declaration); removed references render as a muted "No longer in catalog" row without breaking the tab. Header gains a "My List" link visible only when signed in (`app/app.vue`).
- **Anonymous gating (revised per product feedback)**: `/my-list` is guarded by `app/middleware/my-list.ts` — signed-out visitors get a server-side 302 to `/` instead of an in-page sign-in prompt (the list endpoint is never called anonymously; detail-page toggles still prompt Google sign-in like Rating). Signing out from the header also lands home (`app/app.vue`).
- **Tests**: query integration tier (5 — in-place transitions, clear-keeps-row, cross-user, live-state-only listing); status route tier (7 — state machine through the API, 401 anonymous on all verbs, 400 `{ issues }` for bad status and bad shape, cross-user isolation); My List route tier (5 — grouping + one-call-per-title batching, degraded null title, failing-fetch degradation, cross-user invisibility, 401); composable tier (9 — incl. id-change refetch and keep-on-failure); toggle component tier (7); identity-block forwarding (3 new); page tier (4 — tabs, live details, degraded entry, tab switching; `mockNuxtImport('useFetch')` at the S3 seam since `registerEndpoint` + `useFetch`'s per-URL response cache fights multi-test files); middleware tier (2 — anonymous bounces home, signed-in passes through).

Verification evidence: `pnpm typecheck`, `pnpm lint`, `pnpm build` exit 0; full suite 35 files / 149 tests green (Docker Postgres up).
