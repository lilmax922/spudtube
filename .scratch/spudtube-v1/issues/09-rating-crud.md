# 09: Rating CRUD

**What to build:** On every detail page a signed-in User can rate the Title AWESOME / GOOD / SUCKS. Exactly one Rating per User per Title — re-rating updates, never duplicates — changeable and removable. Anonymous attempts prompt sign-in. Ratings are private: nothing exposes one User's verdicts to another.

**Blocked by:** 06, 08, 14.

**Status:** ready-for-human

- [x] Create / update / delete reflected immediately in UI and persisted
- [x] Primary key enforces single-Rating-per-Title per User (integration-tested)
- [x] Invalid payloads rejected with 400 `{ issues }` before any business logic runs (integration-tested)
- [x] Cross-user isolation integration-tested: one User's Ratings are invisible and unwritable by another
- [x] Anonymous click gates with login redirect/prompt
- [x] Component tests cover idle/rated/changing states of the rating trio (S3)

## Comments

Implemented on the current branch. Summary of decisions:

- **Routes (seam S2)**: `server/api/ratings/[kind]/[id].{get,put,delete}.ts` — one resource per `(kind, tmdbId)` keyed to the authenticated session. Every verb calls `requireAuthSession` first (401 anonymous); PUT body is `{ label }` derived from the ticket-14 schema constant (`UpdateRatingSchema.pick({ label: true }).required()`) and rejected with 400 `{ issues }` via `apiValidationError` before any write runs; GET returns the caller's own `{ label }` or `null`, so no other User's verdict is ever readable or writable — the `userId` always comes from the session, never the payload.
- **Composable** `app/composables/use-title-rating.ts`: optimistic label state — the trio flips immediately, settles to the server response, reverts on failure; `pending` guards concurrent changes; a refresh-version guard discards stale GET results racing a user action. The GET only fires while signed in; sign-out resets the label synchronously (`flush: 'sync'`). Fetcher is injected (`RatingFetcher` — `getRating`/`putRating`/`deleteRating`, SDK-style per the browse-grid pattern) with `createApiRatingFetcher` as the `$fetch`-backed default.
- **Component (S3)** `app/components/rating-trio.vue`: Netflix-style trio per the design-system rule — 38px round trigger (thumb-up idle, selected icon filled when rated), hover- or click-revealed flyout of three 36px options (star / thumbs-up / thumbs-down, active one `aria-pressed`), click-again-to-clear, pending disables everything, anonymous clicks emit `signInRequested` (page calls `signIn.social({ provider: 'google' })`). Includes the approved hero's average-rating readout (`★ 7.8` + label) via `voteAverage`.
- **Wiring**: `TitleIdentityBlock` gained optional `rating`/`signedIn`/`ratingPending` props and `selectRating`/`clearRating`/`signInRequested` emits, rendering the trio in the hero below the meta chips; `title-detail-page.vue` owns the session (`authClient.useSession(useFetch)`) and the composable. i18n keys under `rating.*` in both locales.
- **Tests**: route-tier integration suite covers create/re-rate-in-place (single row), delete, 401 on all three verbs, 400 `{ issues }` with nothing written, and cross-user isolation (B never sees/writes/deletes A's rating); composable tests cover load-on-sign-in, sign-out reset, optimistic apply/revert, pending guard, signed-out no-ops; S3 tests cover idle (signed-in reveal + select emit, anonymous sign-in gate), rated (persisted icon, active option, clear), and changing (pending disabled) states; identity-block pass-through tests added.

Verification evidence: `pnpm typecheck`, `pnpm lint`, `pnpm build` exit 0; full suite 31 files / 131 tests green, stable across repeated runs.

### Post-review fixes (2026-08-23)

Findings from the two-axis code review, all resolved:

- **SVG-only rule**: the average-rating readout's `★` text glyph replaced with the Lucide `Star` icon (filled) — no emoji/dingbat in UI.
- **Touch floor**: flyout options bumped 36px → 40px per the design system's ≥ 40px touch-target rule.
- **"On hover with animation"**: flyout reveal now animates (`<Transition>` fade + 4px slide, 0.16s).
- **Touch-accessible re-rate**: in rated state the trigger click now toggles the flyout instead of instantly clearing, so re-rating (story 22) works without hover; clearing happens by clicking the active option (Netflix-style). `rating.rated` label simplified to `Rated {label}`.
- **Stale label across titles**: `useTitleRating` now watches the title id — navigating detail A → B resets the label synchronously and refetches; a transient GET failure no longer wipes a displayed verdict (catch keeps the current label).
- **Route dedup**: `ratingParamsSchema` + segment mapping consolidated into `server/api/ratings/params.ts` (`parseRatingParams`), collapsing the three copies.

Full suite now 32 files / 133 tests green; typecheck, lint, build exit 0.
