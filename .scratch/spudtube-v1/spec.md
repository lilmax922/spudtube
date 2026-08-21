# SpudTube v1

Status: ready-for-agent

## Problem Statement

I finish a show and don't know what to watch next. Searching the web tells me a title exists but not whether I can actually stream it where I live; checking each streaming service one by one is tedious; and nothing remembers what I've already watched or what I decided was awesome.

## Solution

SpudTube is a web app for deciding what to watch. Visitors can immediately browse movies and TV shows as a poster grid, filter by kind and genre, or keyword-search when they know roughly what they want. Every title has a detail page showing what it is, its trailer, similar titles to queue up next, and — crucially — which streaming Providers carry it in a chosen Region, defaulting to the visitor's own. Signing in with Google unlocks a private layer: rate any Title (awesome / good / sucks) and keep a Watchlist plus a watched history. Browsing works without an account; the account exists only to remember your verdicts and lists.

## User Stories

### Browsing & discovery (no sign-in)

1. As a Visitor, I want to land directly on a browsable grid of titles, so that I can start hunting for something to watch with zero ceremony.
2. As a Visitor, I want to toggle between Movies and TV Shows while browsing by genre, so that I only see the kind of thing I'm in the mood for.
3. As a Visitor, I want to select multiple genres and see titles matching ANY of them, so that broad moods like "thriller or comedy" are one click away.
4. As a Visitor, I want results ordered by popularity by default, so that the first screen shows things people actually watch.
5. As a Visitor, I want to keyword-search across movies AND TV shows at once, so that I can find a title even when I'm not sure which kind it is.
6. As a Visitor, I want search results to keep loading as I scroll, so that I can keep browsing without clicking page numbers.
7. As a Visitor, I want genre-browse and keyword-search to be two separate modes, so that combining them never produces confusing half-filtered results.

### Title detail

8. As a Visitor, I want a detail page for each title showing poster, backdrop, overview, genres, release year and runtime, so that I can judge whether it's for me.
9. As a Visitor, I want to watch the title's trailer on the detail page, so that I can sample it before committing.
10. As a Visitor, I want a strip of recommended titles on the detail page, so that finishing one show leads straight into the next candidate.
11. As a Visitor, I want to see which streaming Providers carry a title in a Region, so that I know where it's actually watchable.
12. As a Visitor, I want Availability grouped as subscription → free → rent → buy, so that I see the cheapest ways first.
13. As a Visitor, I want the Region for Availability to default to the country inferred from my IP address, so that the answer is relevant before I touch anything.
14. As a Visitor, I want to switch the Region from a curated list of common countries, so that I can check where else a title streams (e.g. before travelling).
15. As a Visitor, I want titles that have NO Providers in my Region to still appear everywhere, so that the catalog never silently hides things from me.
16. As a Visitor, I want the interface in Traditional Chinese if I'm visiting from Taiwan (English otherwise), so that it reads natively.
17. As a Visitor, I want overviews shown in Traditional Chinese with automatic English fallback, so that untranslated titles remain readable.

### Accounts

18. As a Visitor, I want to sign in with my Google account in one step, so that I don't create yet another password.
19. As a Visitor, I want browsing to work fully without signing in, so that an account is only needed when I want my own tracking features.

### Rating

20. As a User, I want to rate a Title as awesome, good, or sucks, so that I record my verdict in three seconds.
21. As a User, I want exactly one rating of mine per Title, so that my history stays unambiguous.
22. As a User, I want to change or delete my rating later, so that second thoughts are free.
23. As a User, I want to rate a Title regardless of whether I've watched-marked it, so that rating isn't gated by bookkeeping.
24. As a User, I want my ratings visible only to me, so that my opinions stay private.

### Personal lists

25. As a User, I want to put a Title on my Watchlist, so that I remember what looked promising.
26. As a User, I want to mark a Title as watched, so that it moves out of my to-watch pile.
27. As a User, I want marking a Title watched to automatically remove it from my Watchlist, so that the two states never contradict each other.
28. As a User, I want one page with three tabs — Watchlist, Watched, Rated — so that all my tracking lives in one place.
29. As a User, I want my list pages to show current poster and name for each Title, so that I recognize entries at a glance.

### Region & language persistence

30. As a Visitor, I want my chosen Region remembered by this browser, so that I stop re-selecting it every visit.
31. As a Visitor, I want my language choice remembered by this browser once I switch it, so that manual overrides beat IP guessing forever.
32. As a Visitor, I want Region and language NOT tied to my account, so that switching devices doesn't drag my travel experiments along.

## Implementation Decisions

**External data (ADR 0001)**: TMDB is the single external source, including streaming-provider data (licensed from JustWatch). There is no direct JustWatch call anywhere. Provider logos come from the TMDB image CDN; required TMDB and JustWatch attributions render wherever provider data appears.

**TMDB access**: All TMDB traffic goes through one server-side client module exposing typed operations (multi-search, discover by kind/genre/popularity, title detail, providers, recommendations, genre lists). The TMDB read access token (Bearer) lives only in server env. Responses cache server-side behind the client: ~24h TTL for details/providers, minutes-level for search/discover pages.

**Storage (ADR 0003)**: The database stores references only — no catalog mirror of TMDB data. Tables: Better Auth's standard four (`user`, `session`, `account`, `verification`) plus:

- `rating`: `user_id`, `kind`, `tmdb_id`, label (`AWESOME | GOOD | SUCKS`), timestamps. Primary key (`user_id`, `kind`, `tmdb_id`) — one Rating per User per Title. Labels are canonical; numbers are presentation order only.
- `title_status`: `user_id`, `kind`, `tmdb_id`, status (`WATCHLISTED | WATCHED`), timestamps. Same primary key shape.

State machine (exactly one state per User×Title): `none → WATCHLISTED → WATCHED → none`; setting `WATCHED` deletes any `WATCHLISTED` row; re-watchlisting a watched Title moves it back. Table/column naming follows code-standard: singular snake_case.

**Auth**: Better Auth configured with Google OAuth as the only provider. Mutating endpoints (rating/status CRUD) require a valid session; everything else is public. No email/password, no other providers.

**Database environments**: Local development runs Dockerized Postgres (compose file, named volume, healthcheck); production uses Supabase Postgres reached through its transaction pooler via a Cloudflare Hyperdrive binding. The two differ only by connection configuration.

**Region**: `DetectedRegion` comes from the platform-injected country header on each request and seeds the initial selected Region. The selected Region persists in the browser only (never the database, never cross-device) and never filters catalog content — it changes Availability display exclusively. Region picker offers a fixed curated list: TW, HK, JP, KR, SG, US, GB, CA, AU, DE, FR, IN, BR, MX (order = display order; structure leaves room to grow).

**Language**: `@nuxtjs/i18n` with lazy-loaded locales `zh-TW` and `en`. Default derives from the same country signal: `TW` → zh-TW, everything else → en. Manual switching persists in the browser and permanently overrides the geo default. TMDB requests use `zh-TW` with English fallback handled upstream.

**Routes & UX**: Separate route trees `/movie/[id]` and `/tv/[id]`. Home lands straight on the results grid: Kind toggle applies only in genre-browse mode; keyword mode uses TMDB multi-search across both kinds; genres combine with OR; sort defaults to popularity; infinite scroll drives pagination. My-list is a single page with three tabs (Watchlist / Watched / Rated); Rated joins stored references with live TMDB details fetched in batch.

**Detail page composition**: identity block (backdrop/poster/overview/genres/year/runtime), trailer embed, Availability panel with Region switcher, User actions (rating trio + status toggle), and a recommendations strip driven by TMDB recommendations. Cast lists are excluded.

**UI stack**: shadcn-vue over Tailwind CSS (Tailwind is a hard dependency of shadcn-vue; UnoCSS is not used). pnpm manages packages. All conventions — kebab-case filenames including the shadcn-vue rename pass, disabled auto-imports, antfu ESLint as sole formatter — follow `docs/agents/code-standard.md`, which also defines the Definition of Done (typecheck + lint + build green at every task end).

**Hosting**: Nuxt SSR on Cloudflare Pages/Workers; pushes to `main` deploy automatically.

## Testing Decisions

A good test verifies external behavior through stable boundaries — what a route returns, what a component renders or emits — never internal call graphs. If refactoring forces test rewrites, the test was aimed wrong.

Seams (agreed with the product owner):

- **S1 — TMDB client module (the only new seam)**: every TMDB interaction passes through the client module; server-side tests substitute a fake there. Mappers, caching behavior, availability grouping, and route logic are all exercised against the fake — the external world has exactly one substitution point.
- **S2 — Better Auth's own model (existing)**: authenticated-path tests create Users and sessions through Drizzle fixtures / Better Auth's programmatic API and present real session cookies. No hand-rolled tokens, no auth-layer mocks.
- **S3 — Vue component boundary (existing idiom)**: components receive props and emit events; data composables are mocked as modules at their import sites (explicit imports make targets obvious). Assertions stay on rendered output and emitted events.

Tiers: pure logic (status transitions, availability grouping/sorting, country→locale mapping) unit-tested directly against exported interfaces; Nitro routes tested as an integration tier with real local Docker Postgres and the faked S1 client; components tested under happy-dom.

Prior art: none — greenfield. These tiers become the repo's testing patterns; the first tickets should establish fixture helpers (fake TMDB payloads, session fixtures) so later tests stay cheap.

Operational expectation: running the full suite requires the local Docker Postgres up (`DATABASE_URL` pointed at the container).

Test style per code-standard: Vitest everywhere, colocated `foo.test.ts`, `describe`/`it`, network mocked only at S1/S3.

## Out of Scope

- Direct JustWatch integration of any kind
- Cast/crew listings; person pages
- Season/episode granularity — Titles are whole works
- Public or community-facing ratings, aggregates, or profiles
- Cross-device sync of Region or language preferences
- Year/release-date filtering; advanced sorting options beyond popularity default
- Storybook; browser-level E2E (revisit after first production deploy)
- Additional OAuth providers; email/password auth
- Languages beyond zh-TW/en
- Personalized recommendation algorithms (recommendations are TMDB's, verbatim)
- Admin tooling, analytics, notifications

## Further Notes

Human-only setup steps (candidates for a `/wizard` walkthrough at implementation kickoff): obtain a TMDB API read token; create the GCP OAuth client with redirect URIs for localhost and the production domain; provision the Supabase project and copy its pooled connection string; install/run Docker locally.

Catalog drift: a referenced Title TMDB later removes must degrade gracefully (e.g. "no longer in catalog" treatment on list pages) rather than error — a consequence of reference-only storage (ADR 0003).

The glossary in `CONTEXT.md` is authoritative for vocabulary (Title, Kind, Region, DetectedRegion, Provider, Availability, User, Rating, WatchStatus, Watchlist); ADRs 0001–0003 record the why behind data source, stack, and storage decisions.
