# Plan 003: Cap unauthenticated fan-out inputs (provider ids, search query)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 71d0974..HEAD -- server/api/catalog/providers.get.ts server/api/catalog/search.get.ts server/api/catalog/providers.get.test.ts server/api/catalog/search.get.test.ts`
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

Two unauthenticated endpoints accept unbounded input that fans out to TMDB:
`GET /api/catalog/:kind/providers?ids=1,2,3,...` validates only
digit/comma shape, so one request can trigger hundreds of parallel upstream
watch-provider fetches (TMDB quota + worker subrequest pressure); and `GET
/api/catalog/search.get?query=` requires only non-empty text, so oversized
queries become TMDB cache keys (see plan 004) and upstream query strings.
Both fixes are schema-one-liners with 400-on-violation semantics the repo
already uses everywhere via `parseOrThrow`.

## Current state

- `server/api/catalog/providers.get.ts` — batched provider lookup, NO auth
  guard (no `requireAuthSession`; contrast ratings/status/my-list which all
  call it first). Per-id failures already degrade to `[]`:

```ts
// server/api/catalog/providers.get.ts:17-21
const providersQuerySchema = z.object({
  kind: mediaSegmentParam,
  ids: z
    .string()
    .regex(/^\d+(,\d+)*$/, 'must be a comma-separated list of TMDB ids'),  // shape only — NO count cap
  language: languageParam,
})
// ...
const ids = parsed.ids.split(',').map(Number)
// ...
const entries = await Promise.all(ids.map(async (tmdbId) => { ... }))  // one upstream fetch per id
```

- `server/api/catalog/search.get.ts` — search, no max length:

```ts
// server/api/catalog/search.get.ts:10-14
const searchQuerySchema = z.object({
  query: z.string().trim().min(1),   // no .max(...)
  page: z.coerce.number().int().min(1).default(1),
  language: languageParam,
})
```

- Exemplar convention (the cap to copy): `server/api/catalog/provider-list.get.ts:17`
  already caps its free-text param — `q: z.string().trim().min(1).max(64).optional()`.
  Use `.max(64)` for the search query to match it.
- Error contract: invalid params throw 400 via `parseOrThrow`
  (`server/utils/validation.ts`); tests assert this shape — follow it.

## Commands you will need

| Purpose   | Command                                                              | Expected on success |
|-----------|----------------------------------------------------------------------|---------------------|
| Tests     | `pnpm vitest run server/api/catalog/providers.get.test.ts server/api/catalog/search.get.test.ts` | all pass (incl. 2 new) |
| Typecheck | `pnpm typecheck`                                                     | exit 0, no errors   |
| Lint      | `pnpm lint`                                                          | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `server/api/catalog/providers.get.ts`
- `server/api/catalog/search.get.ts`
- `server/api/catalog/providers.get.test.ts` (add cap test)
- `server/api/catalog/search.get.test.ts` (add max-length test)

**Out of scope** (do NOT touch, even though they look related):
- Authentication on these endpoints — reads are intentionally public
  (regions/providers must work signed-out); do not add `requireAuthSession`.
- `server/tmdb/client.ts` cache-key normalization — plan 004's defense in
  depth; route-level caps here are independent and land first.
- Per-id numeric bounds — ids are already positive ints in practice via the
  regex; do not gold-plate.
- Any future batch-providers endpoint for hover prefetch (a planned perf
  follow-up): it must be born capped — note this plan as its precedent.

## Git workflow

- Branch: `advisor/003-input-fanout-caps`
- Commit style: Conventional Commits, e.g. `fix: cap provider batch ids and search query length`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Find legitimate caller batch sizes for the providers endpoint

Run `grep -rn "catalog/.*providers?ids=\|/providers?.*ids" app server --include="*.ts" --include="*.vue" | grep -v ".test."`
to find every production caller and its largest real batch size. Choose
`MAX_IDS` as the smallest round number comfortably above the largest
legitimate batch (default `20` if callers use ≤12; the hero pool is 12 and
browse rows are ~12, so 20 has headroom). If any legitimate caller needs
more than 50, STOP and report (the cap strategy needs rethinking).

**Verify**: you can name every caller and its batch size; chosen cap covers all of them.

### Step 2: Cap the ids list

In `server/api/catalog/providers.get.ts`, enforce the cap at the schema
level so violations get the standard 400, e.g.:

```ts
ids: z
  .string()
  .regex(/^\d+(,\d+)*$/, 'must be a comma-separated list of TMDB ids')
  .refine(value => value.split(',').length <= MAX_IDS, { message: `at most ${MAX_IDS} ids per request` }),
```

with `const MAX_IDS = <chosen cap>;` next to the schema. Keep the per-id
try/catch degrade exactly as-is.

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Cap the search query length

In `server/api/catalog/search.get.ts`, change `query:
z.string().trim().min(1)` to `query: z.string().trim().min(1).max(64)` —
matching the existing `provider-list` `q` cap. Reject (400) above it; do
not silently trim (callers must know their input was too long).

**Verify**: `pnpm typecheck` → exit 0.

### Step 4: Add the two boundary tests

- `server/api/catalog/providers.get.test.ts`: request with `MAX_IDS + 1`
  ids → assert 400 (model on the file's existing invalid-params test).
- `server/api/catalog/search.get.test.ts`: request with a 65+ char query →
  assert 400; keep a normal-query happy-path test green.

**Verify**: `pnpm vitest run server/api/catalog/providers.get.test.ts
server/api/catalog/search.get.test.ts` → all pass, including the 2 new tests.

## Test plan

- New: over-cap ids → 400; overlong search query → 400.
- Existing suites for both endpoints must stay green unchanged (they pin
  the happy path and the per-id degrade-to-`[]` behavior).
- Pattern: each file's own invalid-params test.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm vitest run server/api/catalog/providers.get.test.ts server/api/catalog/search.get.test.ts` exits 0
- [ ] Over-cap ids request returns 400 (covered by new test)
- [ ] 65-char search query returns 400 (covered by new test)
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The schemas don't match the "Current state" excerpts (drift).
- A legitimate production caller batches more than 50 ids (cap strategy wrong).
- Either endpoint has gained `requireAuthSession` since planning (assumption broken — re-evaluate).
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- If the future hover-prefetch batch endpoint is built, copy this cap
  pattern from day one (it fans out the same way).
- If TMDB's own query limits change, the `.max(64)` alignment with
  provider-list `q` is the single convention to update in both places —
  a reviewer should check they stay in sync.
