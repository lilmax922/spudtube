# 03: TMDB client module & proxy routes (seam S1)

**What to build:** The single server-side TMDB client module through which ALL external catalog traffic flows: typed operations for multi-search, discover by Kind/Genre/popularity, Title detail, watch providers, recommendations, and Genre lists for both Kinds. Layered response caching behind it (~24h details/providers, minutes-level search/discover). Read token lives only in server env. Internal proxy routes expose what the frontend needs. Establishes seam S1: tests substitute a fake at this module and never touch the network.

**Blocked by:** 01.

**Status:** ready-for-human

- [x] Every TMDB request in the codebase goes through the client module (verifiable: no stray TMDB-domain fetches elsewhere)
- [x] Offline tests drive mappers and caching through a fake client (fixture payloads)
- [x] Token never appears in any client-visible payload or bundle
- [x] A manual dev-server check returns live TMDB data through the proxy route

## Comments

Implemented on the current branch. Summary of decisions:

- **Seam S1 module**: `server/tmdb/` — `createTmdbClient({ token, fetchJson?, now? })` is the factory that receives the injected transport; this is the one substitution point. A `getTmdbClient()` singleton wires the env token (`process.env.TMDB_TOKEN`) to global fetch for production routes. Route tests substitute a fake client via `vi.mock('.../tmdb/client', ...)` at import site (explicit imports make the target obvious, per S3 idiom).
- **Typed operations**: `searchMulti`, `discover(kind, { genreIds, page })`, `title(kind, id)` (→ `null` on upstream 404 for graceful degradation, ticket 06), `watchProviders(kind, id)` (→ all-regions `ProviderCatalog`; region slicing is left to ticket 07 so switching regions never refetches), `recommendations`, `genres`. All traffic flows through this module — no other file touches `api.themoviedb.org`.
- **Boundary parsing**: hand-written Zod schemas in `server/tmdb/schemas.ts` parse every TMDB payload at the boundary; `movie`/`tv` media values map to canonical Kind (`MOVIE`/`TV_SHOW`) in `mappers.ts` (`toKind`/`kindFromSegment`/`toMediaSegment`). zod@4 added as a dependency.
- **Layered caching**: `server/tmdb/cache.ts` is an in-memory TTL cache keyed by operation+args with an injectable clock (`now`) for deterministic tests. Two layers per spec: `SEARCH_TTL_MS` = 5 min (search/discover/recommendations), `DETAIL_TTL_MS` = 24 h (title/providers/genres). Failures are never cached.
- **Language**: all requests use `language=zh-TW`; detail fetches `append_to_response=videos,translations` and the mapper falls back to the English overview/tagline when the localized one is empty (`pickOverview`). Trailer picks the official YouTube Trailer preferring zh over en (`pickTrailerKey`).
- **Proxy routes** under `server/api/catalog/`:
  - `GET /api/catalog/search?query=&page=`
  - `GET /api/catalog/discover?kind=movie|tv&genres=878,35&page=`
  - `GET /api/catalog/genres?kind=`
  - `GET /api/catalog/:kind/:id` (detail)
  - `GET /api/catalog/:kind/:id/providers`
  - `GET /api/catalog/:kind/:id/recommendations?page=`
  - `:kind` validated as `movie|tv` via zod and mapped to Kind; query params validated with a shared `parseOrThrow` helper in `server/utils/validation.ts` that returns HTTP 400 `{ issues }` (h3 error envelope `data.issues.fieldErrors` from `z.flattenError`) and shared param schemas in `server/utils/params.ts`.
- **Token safety**: read only from server env at first use; sent as `Authorization: Bearer` header by the real transport; never echoed into any mapped payload (guard test serializes every operation's output and asserts the token is absent). Server-only module — cannot reach a client bundle.
- **Tests**: 30 tests across 10 files. Client ops driven through `createFakeTransport(routes)` in `server/tmdb/fake-transport.ts` (fixture payloads), asserting URL/params/Bearer header, mapped output, per-arg caching and TTL expiry via fake clock. Route tests build an h3 `createRouter` and exercise real request→response boundaries against the faked client. Seam helpers: `SEARCH_MULTI_PAGE`, `DISCOVER_MOVIE_PAGE`, `MOVIE_DETAIL`, `MOVIE_PROVIDERS`, etc. live in the colocated test.
- **Gates**: all four Definition-of-Done gates green (`pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`).
- **Live check**: dev server verified against the real API with a v4 read access token — search returned mixed-kind 沙丘 results, discover returned 26,958 movie results, detail returned runtime/trailer/genres, providers returned 122 regions (TW = Catchplay + HBO Max), recommendations returned 20 titles, genres returned the tv list. Genres for tv lists came back in English — TMDB serves that list mostly unlocalized; upstream behavior, not a mapper bug.
