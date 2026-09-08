# Plan 005: Split the shared pending flag in personal tracking

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 71d0974..HEAD -- app/composables/use-personal-tracking.ts app/composables/use-personal-tracking.test.ts`
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

`usePersonalTracking` guards BOTH `mutateRating` and `mutateStatus` with
one shared `pending` flag that silently `return`s when set. Clicking a
watch-status toggle while a rating save is in flight (or vice versa)
discards the second click with no error, retry, or queue — the click looks
ignored and user intent is silently lost. The code comment claims
serialization but the code drops. Splitting the flag per field keeps the
existing same-field version guards intact while letting the two
independent fields mutate concurrently.

## Current state

- `app/composables/use-personal-tracking.ts` — both mutators share `pending`:

```ts
// app/composables/use-personal-tracking.ts:148-169 (approx)
async function mutateRating(next: RatingLabel | null, persist: () => Promise<RatingLabel | null>): Promise<void> {
  if (!signedIn.value || pending.value)   // <-- cross-field block: a status save in flight drops this rating
    return
  const version = ++ratingVersion
  // ...
  pending.value = true
  try {
    const settled = (await persist()) ?? null
    if (version === ratingVersion)
      state.value = { ...state.value, rating: settled }
  }
  catch {
    if (version === ratingVersion)
      state.value = { ...state.value, rating: previous }
  }
  finally {
    pending.value = false
  }
}

async function mutateStatus(next: WatchStatus | null, persist: () => Promise<WatchStatus | null>): Promise<void> {
  if (!signedIn.value || pending.value)   // <-- mirror image: a rating save in flight drops this status
    return
  // ... same shape with statusVersion
}
```

- Same-field races are already handled correctly by `ratingVersion` /
  `statusVersion` guards — that logic stays.
- `app/composables/use-personal-tracking.test.ts:168` (`'serializes
  mutations through the single pending flag'`) ENSHRINES the drop:
  `expect(putStatus).not.toHaveBeenCalled()` after a status click during a
  rating flight. This test must be rewritten, not preserved.
- Vue convention per code-standard: `<script setup lang="ts">`,
  `shallowRef` preferred; explicit return types on exported functions.

## Commands you will need

| Purpose   | Command                                                        | Expected on success |
|-----------|----------------------------------------------------------------|---------------------|
| Tests     | `pnpm vitest run app/composables/use-personal-tracking.test.ts` | all pass (updated)  |
| Typecheck | `pnpm typecheck`                                               | exit 0, no errors   |
| Lint      | `pnpm lint`                                                    | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `app/composables/use-personal-tracking.ts`
- `app/composables/use-personal-tracking.test.ts`

**Out of scope** (do NOT touch, even though they look related):
- `shared/personal-tracking/personal-tracking.ts` — canonical vocabulary
  (Rating/WatchStatus); untouched.
- Server routes (`ratings/...`, `status/...`) — already correct per-row
  upserts; the bug is client-side only.
- A general mutation queue / offline retry — explicitly deferred; per-field
  flags fix the intent-loss with minimal surface. Do not build a queue.
- Components consuming the composable (`rating-trio.vue`,
  `title-status-toggle.vue`, etc.) — unless they read `pending` directly
  (see Step 1 check).

## Git workflow

- Branch: `advisor/005-personal-tracking-pending`
- Commit style: Conventional Commits, e.g. `fix: let rating and status mutate concurrently`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Map every consumer of `pending`

Run `grep -rn "pending" app/composables/use-personal-tracking.ts
app/components/rating-trio.vue app/components/title-status-toggle.vue
app/components/title-detail-page.vue` (plus any other file importing
`usePersonalTracking`) and list every read of the returned `pending`
ref. If templates bind a single `pending` for button-disabled state, keep
exporting a `pending` COMPUTED (`pendingRating || pendingStatus`) so those
consumers keep compiling untouched, while the two mutators check only
their own flag.

**Verify**: you have the full consumer list; no consumer writes `pending`
(external writes would change the design).

### Step 2: Split the flag

In `app/composables/use-personal-tracking.ts`:

1. Replace `const pending = ...` with `pendingRating` and `pendingStatus`
   (same ref kind as the original — check the declaration line first).
2. `mutateRating` checks/sets only `pendingRating`; `mutateStatus`
   checks/sets only `pendingStatus`. Keep the `version === ratingVersion`
   / `statusVersion` guards and the optimistic-apply + rollback bodies
   byte-identical otherwise.
3. If Step 1 found single-`pending` consumers, export `const pending =
   computed(() => pendingRating.value || pendingStatus.value)` under the
   original name.

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Rewrite the enshrined-drop test

In `app/composables/use-personal-tracking.test.ts`, rewrite `'serializes
mutations through the single pending flag'` into `'lets rating and status
mutate concurrently'`: start a rating flight (`putRating` deferred), issue
`setStatus('WATCHED')`, assert `putStatus` WAS called, resolve both, assert
final state `{ rating: 'GOOD', status: 'WATCHED' }`. Keep a same-field
serialization test (two rapid `rate()` calls → second wins via version
guard, first result discarded) to pin the guard that remains. Model both
on the file's existing `deferred` + `createFakeFetcher` helpers.

**Verify**: `pnpm vitest run
app/composables/use-personal-tracking.test.ts` → all pass.

## Test plan

- Rewritten test: cross-field concurrency persists both mutations (the
  regression this plan fixes — confirm it FAILS on the pre-fix code by
  temporarily stashing Step 2).
- Kept/added test: same-field rapid calls still serialize via version
  guard (no behavior change within one field).
- All other tests in the file (`clear() leaves the other field untouched`,
  etc.) stay green unchanged.
- Pattern: the file's own `deferred`/`createFakeFetcher` harness.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm vitest run app/composables/use-personal-tracking.test.ts` exits 0
- [ ] `grep -n "|| pending.value" app/composables/use-personal-tracking.ts` returns no matches (no shared-flag early return remains in either mutator)
- [ ] `grep -n "pendingRating\|pendingStatus" app/composables/use-personal-tracking.ts` returns matches
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The mutators don't match the "Current state" excerpt (drift).
- A consumer WRITES `pending.value` from outside the composable (the
  split needs a different design — report the file:line).
- The cross-field test fails even after the split (something else drops
  the second mutation — report which layer: fetcher mock, version guard,
  or component).
- The fix seems to require a queue, debounce, or server change (out of
  scope — the per-field split is the whole plan).

## Maintenance notes

- If offline retry or a mutation queue is ever added, it builds on these
  per-field flags (one queue per field, preserving the independence
  established here) — do not re-merge them.
- Reviewers: check that no NEW shared early-return was introduced (e.g. a
  combined `isBusy` gate in a component wrapping both buttons would
  reintroduce the drop at the UI layer).
