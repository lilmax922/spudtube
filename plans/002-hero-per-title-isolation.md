# Plan 002: Isolate per-title failures in hero enrichment

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 71d0974..HEAD -- "server/api/catalog/[kind]/hero.get.ts" "server/api/catalog/[kind]/hero.get.test.ts"`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `71d0974`, 2026-09-08

## Why this matters

The landing-page hero (`GET /api/catalog/:kind/hero`) 500s entirely when a
single TMDB detail fetch throws (5xx, network error, Zod parse throw),
because `client.title(...)` is awaited unguarded inside `Promise.all`
while every sibling endpoint (my-list, providers, browse-sections) degrades
per item. One bad title out of twelve blanks the whole hero. The fix makes
the failing row fall back to the existing null-detail shape — success-path
behavior is untouched.

## Current state

- `server/api/catalog/[kind]/hero.get.ts` — hero endpoint. The enrichment
  fan-out guards only the providers fetch:

```ts
// server/api/catalog/[kind]/hero.get.ts:61-64 (approx)
const enrichedPool = await Promise.all(pool.map(async (title): Promise<HeroTitle> => {
  const [detail, catalog] = await Promise.all([
    client.title(title.kind, title.tmdbId, locale),            // <-- UNGUARDED: a throw rejects the whole Promise.all
    client.watchProviders(title.kind, title.tmdbId, locale).catch(() => null),
  ])
  if (!detail)
    return { ...title, runtimeMinutes: null, contentRating: null, genres: [], providers: [] }
```

- The `if (!detail)` branch right below is the established degrade shape —
  reuse it, do not invent a new fallback.
- `server/api/catalog/[kind]/hero.get.test.ts` — 7 tests covering
  `title → null`, cap-to-5, backdrop fallback, and region providers, but NO
  case makes `title` reject (verified: tests use
  `fakeClient.title.mockResolvedValue(...)` at lines 90/106/125; no
  `mockRejectedValue` for `title`).
- Repo conventions: server tests use Vitest `describe`/`it` with a fake
  TMDB transport (`server/tmdb/fake-transport.ts`); error contract for
  invalid params is 400 via `parseOrThrow` — this fix must NOT change any
  status code, only the throw-vs-degrade path.

## Commands you will need

| Purpose   | Command                                              | Expected on success        |
|-----------|------------------------------------------------------|----------------------------|
| Tests     | `pnpm vitest run server/api/catalog/\[kind\]/hero.get.test.ts` | all pass (incl. 1 new) |
| Typecheck | `pnpm typecheck`                                     | exit 0, no errors          |
| Lint      | `pnpm lint`                                          | exit 0                     |

## Scope

**In scope** (the only files you should modify):
- `server/api/catalog/[kind]/hero.get.ts`
- `server/api/catalog/[kind]/hero.get.test.ts`

**Out of scope** (do NOT touch, even though they look related):
- `server/api/browse/sections.get.ts` — already degrades per row; leave it.
- `server/api/my-list.get.ts` — already degrades per item; leave it.
- `server/tmdb/client.ts` / `server/tmdb/cache.ts` — client-level caching is
  plan 004's territory; do not change loader, key, or TTL behavior here.
- Response shape (`HeroPayload` / `HeroTitle`) — clients depend on it.

## Git workflow

- Branch: `advisor/002-hero-per-title-isolation`
- Commit style: Conventional Commits, e.g. `fix: degrade hero row when a title fetch throws` (matches `git log` style like `fix: resync hero titles when kind drifts while landing unmounted (#51)`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Guard the per-title detail fetch

In `server/api/catalog/[kind]/hero.get.ts`, add `.catch(() => null)` to
the `client.title(...)` call so it matches the providers line directly
below it:

```ts
const [detail, catalog] = await Promise.all([
  client.title(title.kind, title.tmdbId, locale).catch(() => null),
  client.watchProviders(title.kind, title.tmdbId, locale).catch(() => null),
])
```

Nothing else in the handler changes: a throwing title now flows into the
existing `if (!detail)` degrade branch. Do NOT add logging (the repo keeps
this path quiet; browse-sections is the only endpoint that logs row
failures, and hero has no such convention).

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Add the rejection regression test

In `server/api/catalog/[kind]/hero.get.test.ts`, model on the existing
`'keeps the title in the payload even if its detail lookup returns null'`
test (line ~99): add a test where `fakeClient.title.mockRejectedValueOnce(new
Error('tmdb 500'))` (with `watchProviders` resolving normally) and assert
the endpoint still returns 200 with the title present in degraded form
(`runtimeMinutes: null`, `genres: []`, `providers: []` — same shape as the
null-detail case). Confirm the new test FAILS if you temporarily revert
Step 1 (rejection propagates → 500), then re-apply Step 1.

**Verify**: `pnpm vitest run "server/api/catalog/[kind]/hero.get.test.ts"`
→ all pass, including the new test.

### Step 3: Run the gates

**Verify**: `pnpm typecheck` → exit 0; `pnpm lint` → exit 0; full hero test
file green.

## Test plan

- New test in `server/api/catalog/[kind]/hero.get.test.ts`: title-rejects
  case asserting degraded row + 200 (the regression this plan fixes).
- Existing 7 hero tests must stay green unchanged (they pin the null path,
  cap-to-5, backdrop fallback, region providers).
- Structural pattern: the neighboring null-detail test in the same file.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm vitest run "server/api/catalog/[kind]/hero.get.test.ts"` exits 0 with 8+ tests passing
- [ ] `grep -n "client.title(title.kind, title.tmdbId, locale).catch" "server/api/catalog/[kind]/hero.get.ts"` returns a match
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The enrichment block doesn't match the "Current state" excerpt (drift).
- The `HeroTitle` type has no null-detail degrade branch anymore (the fix
  strategy assumed it exists).
- The new test fails even with Step 1 applied (something else in the
  handler throws first — report which line).
- Fixing this requires touching `server/tmdb/client.ts` (out of scope).

## Maintenance notes

- If a row-level `console.error` convention is ever adopted for hero
  (browse-sections logs per-row failures), add it here too — but that is
  explicitly out of this plan.
- Future caching work (plan 004) changes loader behavior, not this
  per-title guard; the two compose (cache never throws on hits, guard
  covers loader throws).
