# Plan 006: Escape JSON-LD before innerHTML injection

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 71d0974..HEAD -- app/components/title-detail-page.vue app/components/title-detail-page.seo.test.ts`
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

`title-detail-page.vue` builds its schema.org block from TMDB-controlled
strings (`name`, genre names) via plain `JSON.stringify` and injects it as
`script.innerHTML` through `useHead`. `JSON.stringify` does NOT escape `<`,
so one upstream string containing a script-closing sequence breaks out of
the JSON-LD block into a stored-XSS-grade script execution context. The fix
is a one-line escape that keeps the JSON parseable (verified compatible
with the existing test harness below).

## Current state

- `app/components/title-detail-page.vue:69-117` — the sink:

```ts
// app/components/title-detail-page.vue:69-91 (approx)
const ldJsonContent = computed(() => {
  const d = detailData.value
  if (d == null)
    return null
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': props.kind === 'MOVIE' ? 'Movie' : 'TVSeries',
    name: d.name,                          // <-- TMDB-controlled
    genre: d.genres.map(g => g.name),      // <-- TMDB-controlled
  }
  // ...
  return JSON.stringify(base)              // <-- no escaping of `<`
})
// ...
useHead(() => {
  // ...
  if (ldJsonContent.value) {
    ;(head as { script?: unknown[] }).script = [
      { key: 'schema-org', type: 'application/ld+json', innerHTML: ldJsonContent.value },
    ]
  }
  return head
})
```

- `app/components/title-detail-page.seo.test.ts` — the compatibility proof:
  its `ldJson()` helper (line ~77) reads
  `script[type="application/ld+json"]` elements and `JSON.parse`s their
  `textContent`. The `\u003c` escape is valid JSON string syntax, so
  `JSON.parse` returns the ORIGINAL `<` character — existing assertions
  (`includes('沙丘')`, Movie/TVSeries checks) keep passing unchanged.

## Commands you will need

| Purpose   | Command                                                              | Expected on success        |
|-----------|----------------------------------------------------------------------|----------------------------|
| Tests     | `pnpm vitest run app/components/title-detail-page.seo.test.ts`       | all pass (incl. 1 new)     |
| Typecheck | `pnpm typecheck`                                                     | exit 0, no errors          |
| Lint      | `pnpm lint`                                                          | exit 0                     |

## Scope

**In scope** (the only files you should modify):
- `app/components/title-detail-page.vue` — the `return JSON.stringify(base)` line only
- `app/components/title-detail-page.seo.test.ts` — add the breakout test

**Out of scope** (do NOT touch, even though they look related):
- Any other `useHead` metadata (title, canonical, og:*) — untouched.
- `app/components/OgImage/*`, `server/seo.test.ts` — different surfaces.
- A CSP header rollout — that's a separate (larger) hardening item in the
  backlog; this plan is the targeted sink fix.
- Changing the JSON-LD SHAPE (keys, @type selection) — clients/SEO depend on it.

## Git workflow

- Branch: `advisor/006-jsonld-escape`
- Commit style: Conventional Commits, e.g. `fix: escape JSON-LD before script injection`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Escape `<` in the serialized JSON-LD

In `app/components/title-detail-page.vue`, change:

```ts
return JSON.stringify(base)
```

to:

```ts
// Escape `<` so a TMDB-controlled string can never break out of the
// application/ld+json script block. `\u003c` is valid JSON and parses
// back to `<`, so consumers are unaffected.
return JSON.stringify(base).replace(/</g, '\\u003c')
```

Keep the why-comment (code-standard: comments explain why). Nothing else
in the file changes.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Add the breakout regression test

In `app/components/title-detail-page.seo.test.ts`, model on the existing
`'injects schema.org ...'` tests (they set `detailRef.value` with a
`MOVIE_DETAIL` spread, `mountSuspended`, then `vi.waitFor` on `ldJson()`):
add a test with `name: 'X</script><script>alert(1)</script>'` asserting:

1. the raw `script[type="application/ld+json"]` element's `textContent`
   contains NO literal `</script` substring (query the element directly via
   `document.head.querySelector`, not via the `ldJson()` JSON.parse helper);
2. `JSON.parse` of that textContent still yields the original name
   (round-trip intact).

Confirm the new test FAILS on the pre-fix line (literal `</script`
present), then passes with Step 1 applied.

**Verify**: `pnpm vitest run app/components/title-detail-page.seo.test.ts`
→ all pass, including the new test.

## Test plan

- New: breakout-name test (no literal script-close in the tag + lossless
  round-trip).
- All existing SEO tests (Movie/TVSeries injection, og:locale, canonical)
  stay green unchanged — the escape is transparent to `JSON.parse`.
- Pattern: the file's own `detailRef` + `mountSuspended` + `ldJson()` harness.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm vitest run app/components/title-detail-page.seo.test.ts` exits 0
- [ ] `grep -n 'u003c' app/components/title-detail-page.vue` returns a match
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The `ldJsonContent` computed doesn't match the excerpt (drift — e.g. the
  sink moved to a library or `textContent`-based injection, which changes
  the fix).
- The new test fails even with the escape applied (something else injects
  unescaped content into the same tag — report which line).
- Any existing SEO test breaks because it asserts the RAW serialized
  string with a literal `<` (report the test name; do not weaken it
  silently).

## Maintenance notes

- If new TMDB-controlled fields are ever added to the JSON-LD `base`
  object, they inherit this protection automatically (escape is on the
  serialized output, not per field) — a reviewer only needs to check the
  escape line still exists.
- This fixes the sink; it does not add CSP. If a CSP plan lands later, the
  `application/ld+json` inline script needs to stay allowed.
