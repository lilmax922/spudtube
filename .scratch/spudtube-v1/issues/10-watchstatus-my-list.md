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

Implemented on the current branch, aligned with the parallel ticket 09 work (same route/composable/component shapes; no overlap on files or i18n keys it owns).

- **Data layer**: `server/db/schema/title-status.ts` colocates `watchStatusEnum`, the `title_status` table (composite PK `(user_id, kind, tmdb_id)`, **nullable** `status` per ADR 0003 — clearing sets NULL in place, the row stays), relations, `WatchStatus`/`TitleStatus`/`InsertTitleStatus` types and the three drizzle-zod variants (`InsertTitleStatusSchema` / `SelectTitleStatusSchema` / `UpdateTitleStatusSchema`, refined where defined). Migration `0004_far_tony_stark` created via `pnpm db:generate` (new `watch_status` enum + table + cascade FK to `user`).
- **Queries** (`server/db/queries/title-status.ts`): `findTitleStatus`, `findTitleStatuses` (live-state rows only, newest `updatedAt` first), `upsertTitleStatus` — the single-row `onConflictDoUpdate` IS the state machine (WATCHED overwrites WATCHLISTED, re-watchlisting moves back) — and `clearTitleStatus` (sets NULL, returns the row).
- **Status routes** (`server/api/status/[kind]/[id].{get,put,delete}.ts` + `server/api/status/params.ts`, mirroring ticket 09's `/api/ratings` layout): every verb requires a session (401 anonymous), GET returns `{ status }` (null when none), PUT validates `UpdateTitleStatusSchema.pick({ status: true }).required()` through the shared `apiValidationError` 400 `{ issues }` contract before any business logic, DELETE clears to null.
- **My List route** (`server/api/my-list.get.ts`): `GET /api/my-list` returns `{ watchlist, watched, rated }`; each entry is `{ kind, tmdbId, title }` where `title` is the live TMDB summary — references fetched in one batched `Promise.all` pass (one client call per unique title across tabs, deduped), `null` when TMDB no longer has the title or the fetch fails (a transient upstream error degrades to a null entry instead of 500ing the whole list). Rated ordered newest-first.
- **Client**: `app/composables/use-title-status.ts` (optimistic `status`/`pending`/`set`/`clear`, GET only while signed in — a byte-for-byte mirror of the rating composable's state handling); `app/components/title-status-toggle.vue` (two 38px actions, Bookmark + CircleCheck, fill when active, `setStatus`/`clearStatus`/`signInRequested` emits); both wired into `title-detail-page.vue`/`title-identity-block.vue` exactly like the rating trio (same session fetch, same event names) so the two tickets' merges stay mechanical.
- **My List page** (`app/pages/my-list.vue`): three hand-rolled tabs (Watchlist / Watched / Rated); signed-out visitors see a sign-in prompt with the Google button (same gating as Rating) and the list endpoint is never called anonymously (`immediate: signedIn.value` + `watch`); entries show current poster + name + year and link to their detail routes; removed references render as a muted "No longer in catalog" row without breaking the tab. Header gains a "My List" link visible only when signed in (`app/app.vue`).
- **Tests**: query integration tier (5 — in-place transitions, clear-keeps-row, cross-user, live-state-only listing); status route tier (7 — state machine through the API, 401 anonymous on all verbs, 400 `{ issues }` for bad status and bad shape, cross-user isolation); My List route tier (5 — grouping + one-call-per-title batching, degraded null title, failing-fetch degradation, cross-user invisibility, 401); composable tier (7); toggle component tier (7); identity-block forwarding (3 new); page tier (5 — prompt, tabs, live details, degraded entry, tab switching; `mockNuxtImport('useFetch')` at the S3 seam since `registerEndpoint` + `useFetch`'s per-URL response cache fights multi-test files).

Verification evidence: `pnpm typecheck`, `pnpm lint`, `pnpm build` exit 0; full suite 34 files / 146 tests green (Docker Postgres up).
