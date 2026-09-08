# Plan 004: Bound the TMDB TTL cache (LRU cap, key hygiene, in-flight dedup)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 71d0974..HEAD -- server/tmdb/cache.ts server/tmdb/client.ts server/tmdb/constants.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (pairs with plan 003, which caps the same inputs at
  the route layer; either may land first — this plan is defense in depth
  and must assume raw keys can still arrive)
- **Category**: bug
- **Planned at**: commit `71d0974`, 2026-09-08

## Why this matters

Every catalog path depends on `createTtlCache`, and it grows forever: no
`delete`, no eviction, no size cap, and entries are keyed by raw user input
(`search-multi:${language}:${query}:${page}`). The client (and its cache)
is memoized across requests in the isolate
(`server/tmdb/client.ts: getTmdbClient` singleton), so each distinct
search/discover query leaks one Map entry for the life of the worker.
Compounding it, concurrent same-key misses each fire their own TMDB loader
(stampede). Bounding the cache fixes a user-pumpable memory-growth path
and removes the stampede, with success-path behavior unchanged.

## Current state

- `server/tmdb/cache.ts` — the whole primitive (31 lines, no test file —
  verified: no `server/tmdb/cache.test.ts` exists; client tests mock at the
  fetch boundary):

```ts
// server/tmdb/cache.ts (full file)
export interface TtlCache {
  wrap: <T>(
    key: string,
    ttl: number | ((value: T) => number),
    loader: () => Promise<T>,
  ) => Promise<T>
}

export function createTtlCache({ now }: { now: () => number }): TtlCache {
  const entries = new Map<string, { expiresAt: number, value: unknown }>()

  return {
    async wrap<T>(
      key: string,
      ttl: number | ((value: T) => number),
      loader: () => Promise<T>,
    ): Promise<T> {
      const hit = entries.get(key)
      if (hit && hit.expiresAt > now())
        return hit.value as T
      const value = await loader()       // concurrent same-key misses each run this (stampede)
      const ttlMs = typeof ttl === 'function' ? ttl(value) : ttl
      entries.set(key, { expiresAt: now() + ttlMs, value })  // never deleted, never capped
      return value
    },
  }
}
```

- Raw user input in keys (`server/tmdb/client.ts:185`):

```ts
return cache.wrap(`search-multi:${language}:${query}:${page}`, SEARCH_TTL_MS, async () => {
```

- Singleton memoized across requests (`server/tmdb/client.ts:370-374`):

```ts
let configuredClient: TmdbClient | undefined
export function getTmdbClient(): TmdbClient {
  configuredClient ??= createTmdbClient({ token: readTokenFromEnv() })
  return configuredClient
}
```

- TTLs (`server/tmdb/constants.ts`): `SEARCH_TTL_MS` 5min, `DETAIL_TTL_MS`
  24h, `NOT_FOUND_TTL_MS` 1h. Do NOT change TTL durations in this plan.
- Failed loaders currently throw before `set`, so failures are NOT cached —
  preserve that property (Step 2 asserts it).

## Commands you will need

| Purpose   | Command                                                     | Expected on success          |
|-----------|-------------------------------------------------------------|------------------------------|
| Tests     | `pnpm vitest run server/tmdb/cache.test.ts server/tmdb/client.test.ts` | all pass               |
| Typecheck | `pnpm typecheck`                                            | exit 0, no errors            |
| Lint      | `pnpm lint`                                                 | exit 0                       |

## Scope

**In scope** (the only files you should modify):
- `server/tmdb/cache.ts`
- `server/tmdb/cache.test.ts` (create)
- `server/tmdb/client.ts` — ONLY the `searchMulti` key construction line
  (normalize/trim/cap-length the raw query in the key)

**Out of scope** (do NOT touch, even though they look related):
- TTL durations in `server/tmdb/constants.ts` — frozen; changing them
  alters staleness behavior product-wide.
- `getTmdbClient` singleton shape — the memoization stays; the bounded
  cache makes it safe.
- Browse-sections / hero / trending read-path consolidation (future perf
  plans build on this cache; they are separate).
- `server/tmdb/genres.ts`, `mappers.ts`, `schemas.ts` — untouched.

## Git workflow

- Branch: `advisor/004-tmdb-cache-bounds`
- Commit style: Conventional Commits, e.g. `fix: bound TMDB TTL cache with LRU cap and in-flight dedup`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write characterization tests for the current cache FIRST

Create `server/tmdb/cache.test.ts` (Vitest `describe`/`it`, co-located per
repo convention; model on `server/tmdb/client.test.ts` setup with a fake
`now` clock). Pin current correct behavior before changing anything:

1. cache hit within TTL returns the stored value without re-running loader;
2. expired entry re-runs the loader;
3. function-TTL selects per value (e.g. value→1h vs value→24h);
4. failed loader does NOT cache (second `wrap` re-runs loader).

Run and confirm green against the UNCHANGED `cache.ts`.

**Verify**: `pnpm vitest run server/tmdb/cache.test.ts` → 4 tests pass.

### Step 2: Add size cap + expiry sweep + in-flight dedup to `wrap`

Extend `createTtlCache` (keep the `TtlCache` interface and `wrap`
signature identical — all callers keep compiling untouched):

1. `MAX_ENTRIES = 1000` module constant. On `set` past the cap, evict the
   oldest-inserted key(s) (Map preserves insertion order — `entries.keys().next()`).
2. Opportunistically sweep expired entries on `set` (iterate and delete
   `expiresAt <= now()`; bounded work since the map is now capped).
3. In-flight dedup: keep `pending = new Map<string, Promise<unknown>>()`;
   on miss, if `pending` has the key, `return await` it; else store the
   loader promise, `await` it, cache on success, ALWAYS delete from
   `pending` in `finally`, and never cache rejections (preserves the
   Step-1 property).

**Verify**: Step-1 tests still green, plus add: (5) concurrent same-key
`wrap` calls run the loader once; (6) inserting past `MAX_ENTRIES` evicts
the oldest key (loader re-runs for it). `pnpm vitest run
server/tmdb/cache.test.ts` → 6 tests pass.

### Step 3: Normalize the raw-query cache key in `searchMulti`

In `server/tmdb/client.ts`, normalize the query ONLY for key construction
(the upstream `query` param sent to TMDB stays exactly as received):
`keyQuery = query.trim().replace(/\s+/g, ' ').slice(0, 64)` (64 matches
the route-level `.max(64)` from plan 003 — overlong keys collapse to one
bounded bucket). Key becomes
`` `search-multi:${language}:${keyQuery}:${page}` ``.

**Verify**: `pnpm vitest run server/tmdb/cache.test.ts
server/tmdb/client.test.ts` → all pass; `pnpm typecheck` → exit 0; `pnpm
lint` → exit 0.

## Test plan

- New `server/tmdb/cache.test.ts` with 6 tests: hit-in-TTL, expiry reload,
  function-TTL selection, failed-loader non-caching, same-key dedup,
  oldest-eviction past cap. Fake `now` clock — no real timers, no network.
- All existing `server/tmdb/client.*.test.ts` suites must stay green
  (key normalization must not break keyed test doubles — if a test asserts
  the exact raw key string, update it to the normalized form and note why).
- Pattern: `server/tmdb/client.test.ts` for transport mocking; co-located
  `foo.test.ts` naming per code-standard.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `server/tmdb/cache.test.ts` exists with ≥6 passing tests
- [ ] `grep -n "MAX_ENTRIES\|pending" server/tmdb/cache.ts` returns matches (cap + dedup present)
- [ ] `pnpm vitest run server/tmdb/` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `cache.ts` doesn't match the "Current state" excerpt (drift — e.g.
  someone already added eviction).
- Any existing caller depends on the unbounded growth (e.g. a test fills
  >1000 keys and asserts hits — report; the cap constant is negotiable but
  the unboundedness is not).
- The `TtlCache` interface must change to implement this (it shouldn't —
  report before widening).
- Normalizing the key breaks a client test that pins raw-key behavior in a
  way normalization can't preserve (report the test name).

## Maintenance notes

- `MAX_ENTRIES = 1000` is a starting point, not physics: each entry is a
  small JSON page; revisit if worker memory telemetry says otherwise.
  Future perf plans (sections payload cache, list-loader consolidation)
  add MORE entries to this same cache — they inherit the bound for free,
  which is why this plan precedes them.
- Reviewers: scrutinize the `finally` that clears `pending` — a leaked
  pending entry would hang all future same-key loads until TTL... actually
  forever, since pending has no TTL. The `finally` is load-bearing.
