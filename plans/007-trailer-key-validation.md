# Plan 007: Validate the upstream trailer key before iframe embed

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 71d0974..HEAD -- server/tmdb/mappers.ts server/tmdb/client.test.ts app/components/title-trailer.vue`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `71d0974`, 2026-09-08

## Why this matters

The trailer key travels unvalidated from TMDB into an embedded browsing
context: `rawVideoSchema.key` is an unconstrained `z.string()`,
`pickTrailerKey` returns it as-is, and `title-trailer.vue` interpolates it
into `https://www.youtube-nocookie.com/embed/${key}` bound to `iframe
src`. An unexpected upstream value flows straight into the embed URL.
Constraining the key to the YouTube-ID charset at the mapper boundary
turns anything else into no-trailer — the UI already handles `null`.

## Current state

- `server/tmdb/schemas.ts:64-70` — raw schema, key unconstrained:

```ts
const rawVideoSchema = z.object({
  key: z.string(),       // <-- no charset/length constraint
  site: z.string(),
  type: z.string(),
  official: z.boolean().optional(),
  iso_639_1: z.string().nullish(),
})
```

- `server/tmdb/mappers.ts:80-97` — selection filters site/type/locale but
  never the key itself:

```ts
export function pickTrailerKey(
  videos: z.infer<typeof rawMovieDetailSchema>['videos'],
  preferred: TmdbLanguage = 'zh-TW',
): string | null {
  const results = videos?.results ?? []
  const trailers = results.filter(
    video => video.site === 'YouTube' && video.type === 'Trailer',
  )
  // ... locale preference chain ...
  return preferredChoice?.key ?? null   // <-- returned unvalidated
}
```

- `app/components/title-trailer.vue:19-23` — the sink (read-only, do NOT
  modify this file):

```ts
const embedUrl = computed(() => {
  if (!props.trailerKey)
    return null
  return `https://www.youtube-nocookie.com/embed/${props.trailerKey}?autoplay=1`
})
```

- CRITICAL fixture constraint (verified 2026-09-08):
  `server/tmdb/client.test.ts:315-324` uses raw keys `'zhTrailerKey'` /
  `'enTrailerKey'` (12 chars, charset-clean) and asserts at lines 786/790
  that they survive as `trailerKey`. Therefore the validation MUST be
  charset-only — a strict 11-char YouTube-ID length check would break these
  legitimate tests. Component tests (`title-trailer.test.ts`) pass
  `trailerKey` as props (`'abc123'`, `'xyz'`), bypassing the mapper, so
  they are unaffected either way.

## Commands you will need

| Purpose   | Command                                                     | Expected on success        |
|-----------|-------------------------------------------------------------|----------------------------|
| Tests     | `pnpm vitest run server/tmdb/client.test.ts`                | all pass (incl. 1-2 new)   |
| Typecheck | `pnpm typecheck`                                            | exit 0, no errors          |
| Lint      | `pnpm lint`                                                 | exit 0                     |

## Scope

**In scope** (the only files you should modify):
- `server/tmdb/mappers.ts` — validate inside `pickTrailerKey` (single
  choke point; both movie and TV detail mapping call it)
- `server/tmdb/client.test.ts` — add invalid-key test(s)

**Out of scope** (do NOT touch, even though they look related):
- `server/tmdb/schemas.ts` — do NOT tighten `rawVideoSchema.key` itself:
  a parse-level rejection would fail the WHOLE detail response on one bad
  video; mapper-level degradation to `null` is the correct semantics.
- `app/components/title-trailer.vue` — already null-safe (`if
  (!props.trailerKey) return null`); no change needed.
- `server/tmdb/genres.ts`, other mappers — untouched.
- Exact-length (11-char) enforcement — explicitly rejected, see fixture
  constraint above.

## Git workflow

- Branch: `advisor/007-trailer-key-validation`
- Commit style: Conventional Commits, e.g. `fix: validate trailer key charset at mapper boundary`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Constrain the key to the YouTube-ID charset in `pickTrailerKey`

In `server/tmdb/mappers.ts`, add a module-level pattern next to
`pickTrailerKey`:

```ts
// YouTube video IDs use this charset. Anything else from upstream is
// treated as no-trailer rather than embedded. Length is intentionally NOT
// enforced: test fixtures and future ID formats vary; charset is what
// keeps the embed URL safe.
const TRAILER_KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
```

and change the return to:

```ts
const key = preferredChoice?.key ?? null
return key && TRAILER_KEY_PATTERN.test(key) ? key : null
```

Keep the locale-preference chain byte-identical. If the preferred choice
has a bad key, fall through to the next candidate (better: filter
`trailers` by the pattern up front so a bad preferred key degrades to the
next good trailer instead of no-trailer — implement the filter-up-front
variant).

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Add invalid-key tests

In `server/tmdb/client.test.ts` (which exercises the mapper through
`client.title` with `MOVIE_DETAIL` fixtures), model on the existing
`'extracts ... trailerKey'` assertions: add a test where the videos list
contains keys like `'evil/key?x=1'` and `'"><script'` asserting the mapped
`trailerKey` is `null` (or falls through to the next valid trailer, per
your Step-1 variant — pin whichever behavior you implemented). Also assert
the existing `'zhTrailerKey'` / `'enTrailerKey'` expectations still pass
unchanged (charset-valid, must survive).

**Verify**: `pnpm vitest run server/tmdb/client.test.ts` → all pass,
including the new test(s).

## Test plan

- New: hostile-key test(s) → `null` (or next-valid-trailer fallback).
- Existing `zhTrailerKey`/`enTrailerKey` assertions (lines ~786/790) must
  stay green unchanged — they pin the charset-only (no length) decision.
- Component tests need no changes (props bypass the mapper).
- Pattern: the file's own `createFakeTransport` + `MOVIE_DETAIL` harness.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm vitest run server/tmdb/client.test.ts` exits 0
- [ ] `grep -n "TRAILER_KEY_PATTERN\|A-Za-z0-9_-" server/tmdb/mappers.ts` returns a match
- [ ] A hostile key (`/` or `?` or whitespace) maps to `null`/fallback (covered by new test)
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `pickTrailerKey` doesn't match the excerpt (drift — e.g. validation
  already added).
- Any EXISTING test feeds a raw key outside `[A-Za-z0-9_-]` and expects it
  to survive (report the test:line — the charset assumption is wrong).
- The embed URL construction moved out of `title-trailer.vue` or now
  encodes the key itself (the sink may already be safe — report).
- Fixing this seems to require touching `schemas.ts` or the component
  (out of scope).

## Maintenance notes

- If YouTube ever changes ID formats, this regex is the single place to
  update; the `null` fallback keeps failures safe (no trailer shown).
- Reviewers: confirm the filter-up-front variant was used (bad preferred
  key → next good trailer), not return-position validation that would hide
  a valid fallback trailer.
