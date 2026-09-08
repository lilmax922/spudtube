# Plan 008: Reject null status on the status PUT route

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 71d0974..HEAD -- server/db/schema/title-status.ts "server/api/status/[kind]/[id].test.ts" "server/api/status/[kind]/[id].put.ts"`
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

The `title_status.status` column is nullable BY DESIGN (clearing sets NULL
in place per ADR 0003), but that nullability leaked into the PUT body
schema: `UpdateTitleStatusBodySchema` requires the key but keeps the
nullable value, so `PUT { status: null }` plausibly validates and upserts a
NULL row — creating rows from nothing and bypassing the DELETE/clear path
that is the only intended way to reach NULL. The fix narrows the PUT body
to the two real statuses; NULL remains reachable only via DELETE.

## Current state

- `server/db/schema/title-status.ts:17-44` — nullable column flows into the body schema:

```ts
export const titleStatus = pgTable('title_status', {
  // ...
  // NULL means no state; clearing sets NULL in place rather than deleting the row (ADR 0003).
  status: watchStatusEnum(),
  // ...
})

export const UpdateTitleStatusSchema = createUpdateSchema(titleStatus)
  .omit({ createdAt: true, updatedAt: true, userId: true, kind: true, tmdbId: true })

export const UpdateTitleStatusBodySchema = UpdateTitleStatusSchema.pick({ status: true }).required()
```

`createUpdateSchema` on a nullable column yields an optional+nullable
field; `.required()` removes the optionality but (per the audit's
code-reading) keeps nullability — so `{ status: null }` validates. This is
MED-confidence from reading and MUST be pinned by test first (Step 1).

- `server/api/status/[kind]/[id].put.ts` — passes `parsed.data.status`
  straight into `upsertTitleStatus` (no independent null check; read-only,
  do NOT modify this file unless Step 1 proves the route needs it — it
  shouldn't if the schema is fixed).
- The sibling is CLEAN (verified 2026-09-08, do not touch):
  `server/db/schema/rating.ts:20` declares `label:
  ratingLabelEnum().notNull()`, so `UpdateRatingBodySchema` is already
  non-nullable. Only status has the hole.
- Existing test pins the error message
  (`server/api/status/[kind]/[id].test.ts:96-109`): `PUT { status: 'MAYBE'
  }` → 400 with `fieldErrors: { status: ['Invalid option: expected one of
  "WATCHLISTED"|"WATCHED"'] }` and writes nothing. The fix must preserve
  this EXACT message for invalid strings (use the same enum values).
- `WATCH_STATUSES = ['WATCHLISTED', 'WATCHED'] as const`
  (`shared/personal-tracking/personal-tracking.ts:12`) — usable directly in
  `z.enum(...)`, producing the identical error text.

## Commands you will need

| Purpose   | Command                                                              | Expected on success        |
|-----------|----------------------------------------------------------------------|----------------------------|
| Tests     | `pnpm vitest run "server/api/status/[kind]/[id].test.ts"`            | all pass (incl. 1 new)     |
| Typecheck | `pnpm typecheck`                                                     | exit 0, no errors          |
| Lint      | `pnpm lint`                                                          | exit 0                     |

## Scope

**In scope** (the only files you should modify):
- `server/db/schema/title-status.ts` — narrow `UpdateTitleStatusBodySchema` to non-null
- `server/api/status/[kind]/[id].test.ts` — add the null-PUT test

**Out of scope** (do NOT touch, even though they look related):
- `server/db/schema/rating.ts` — already `.notNull()`; verified clean.
- `server/api/status/[kind]/[id].put.ts` — no route change needed if the
  schema rejects null (verify via test; touch only if the test proves the
  schema fix insufficient — and report that surprise first).
- `server/api/status/[kind]/[id].get.ts` / `.delete.ts`, query helpers
  (`upsertTitleStatus`, `clearTitleStatus`) — the NULL-in-place design
  stays exactly as documented.
- Migrations — no column change; validation-only fix.

## Git workflow

- Branch: `advisor/008-status-put-null`
- Commit style: Conventional Commits, e.g. `fix: reject null status on status PUT`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the null-PUT probe test FIRST (pin current behavior)

In `server/api/status/[kind]/[id].test.ts`, model on the existing
`'rejects an invalid status with 400 { issues } and writes nothing'` test
(line ~96): add `'rejects PUT { status: null } with 400 and writes
nothing'` asserting response 400, `{ issues }` shape, and
`findTitleStatus(...)` still `undefined`. Run it against the UNCHANGED
schema:

- If it FAILS (null currently validates and writes) → the hole is
  confirmed; proceed to Step 2.
- If it PASSES (null already rejected) → the audit's MED-confidence
  reading was wrong: do NOT change the schema; keep the test as a
  characterization test, skip to Step 3, and note the outcome in the
  commit message.

**Verify**: probe test result recorded (fail = hole confirmed, pass =
already safe).

### Step 2: Narrow the body schema to non-null (only if Step 1 confirmed the hole)

In `server/db/schema/title-status.ts`, replace:

```ts
export const UpdateTitleStatusBodySchema = UpdateTitleStatusSchema.pick({ status: true }).required()
```

with an explicitly non-null body (same enum values, same error text):

```ts
import { z } from 'zod'
// ...
export const UpdateTitleStatusBodySchema = z.object({
  status: z.enum(WATCH_STATUSES),
})
```

(`WATCH_STATUSES` is already imported in this file; add the `zod` import.)
`z.enum(WATCH_STATUSES)` reproduces the exact pinned message `Invalid
option: expected one of "WATCHLISTED"|"WATCHED"`. Leave
`UpdateTitleStatusSchema` itself untouched (other consumers may rely on
its update semantics).

**Verify**: probe test now passes; `pnpm typecheck` → exit 0. Also confirm
the `'MAYBE'` test still asserts the identical message (it must — same enum).

### Step 3: Run the gates

**Verify**: `pnpm vitest run "server/api/status/[kind]/[id].test.ts"` →
all pass; `pnpm typecheck` → exit 0; `pnpm lint` → exit 0.

## Test plan

- New probe/characterization test: `PUT { status: null }` → 400 + writes
  nothing (fails pre-fix if the hole is real, passes post-fix; kept either way).
- Existing `'MAYBE'` + `{ nope: true }` tests unchanged (pin the 400
  contract and exact enum message).
- DELETE-clears-to-null test (line ~74) must stay green — the legitimate
  NULL path is untouched.
- Pattern: the file's own `statusCall` + `createSessionFixture` harness.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] New null-PUT test exists and passes
- [ ] `PUT { status: null }` writes no row (asserted in-test via `findTitleStatus` → `undefined`)
- [ ] The `'MAYBE'` 400 message test still passes unchanged
- [ ] `pnpm vitest run "server/api/status/[kind]/[id].test.ts"` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The schema lines don't match the excerpt (drift).
- `z.enum(WATCH_STATUSES)` does not typecheck (tuple inference issue —
  report the error; do NOT widen to `z.string()`).
- Step 1 passes AND the schema is already non-null (then the plan is
  test-only; say so in the commit and README row).
- The PUT route validates the body a second time independently of the
  schema (then the route file needs the fix, not the schema — report).

## Maintenance notes

- If new statuses are added to `WATCH_STATUSES`, the PUT body inherits
  them automatically (it references the shared constant, not a copy) —
  reviewers should check DB enum migration exists, not this file.
- The asymmetry to remember: column NULL (via DELETE) is valid state;
  body NULL (via PUT) is invalid input. Any future PATCH/bulk endpoint
  must reuse `UpdateTitleStatusBodySchema`, not the raw column type —
  this is also the precedent DIR-02's bulk design should follow.
