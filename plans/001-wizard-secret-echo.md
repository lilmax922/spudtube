# Plan 001: Stop printing full secrets from the production wizard

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 71d0974..HEAD -- scripts/production-wizard.mjs`
> If this file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `71d0974`, 2026-09-08

## Why this matters

When the operator declines the "Write .dev.vars?" prompt, the wizard prints
the full `.dev.vars` content — including the real `TMDB_TOKEN`,
`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` — to
stdout (`scripts/production-wizard.mjs:229`). Full secrets then sit in
terminal scrollback, session logs, or pasted transcripts, far beyond the
Cloudflare dashboard and gitignored files where they belong. The fix is
output-text only and removes a HIGH-confidence secret-exposure path.

## Current state

- `scripts/production-wizard.mjs` — interactive production-deploy checklist
  (run via `pnpm production:wizard`). Builds `devVarsContent` with real
  secret values, then prints it verbatim on the decline path:

```js
// scripts/production-wizard.mjs:210-229
const devVarsContent = [
  `TMDB_TOKEN=${tmdbToken}`,
  `BETTER_AUTH_SECRET=${betterAuthSecret}`,
  `BETTER_AUTH_URL=http://localhost:3000`,
  `GOOGLE_CLIENT_ID=${googleClientId}`,
  `GOOGLE_CLIENT_SECRET=${googleClientSecret}`,
  `# Uncomment to test the pooler locally (wrangler pages dev reads .dev.vars):`,
  `# DATABASE_URL=${poolerUrl}`,
].join('\n') + '\n'
// ...
  else {
    info('Skipped writing .dev.vars. Copy .dev.vars.example → .dev.vars manually if needed.')
    info('Content that would have been written:')
    println(devVarsContent)   // <-- prints FULL secret values to stdout
  }
```

- Repo convention to match (masked output is already the norm one screen
  earlier in the same file, step 8):

```js
// scripts/production-wizard.mjs: ~step 8 (exemplar — keep this style)
info(`  TMDB_TOKEN            = (paste) ${tmdbToken.slice(0, 12)}…`)
info(`  GOOGLE_CLIENT_SECRET  = (paste) ••••••••`)
```

- `.dev.vars.example` already documents the variable names, so the decline
  path can point at it instead of echoing values.

## Commands you will need

| Purpose  | Command                                  | Expected on success              |
|----------|------------------------------------------|----------------------------------|
| Syntax   | `node --check scripts/production-wizard.mjs` | exit 0                        |
| Lint     | `pnpm lint`                              | exit 0                           |
| No-echo  | `grep -n "println(devVarsContent)" scripts/production-wizard.mjs` | no matches |

## Scope

**In scope** (the only files you should modify):
- `scripts/production-wizard.mjs`

**Out of scope** (do NOT touch, even though they look related):
- `.dev.vars.example` / `.env.example` — already correct; no change needed.
- `wrangler.jsonc`, dashboard secret placement — runtime behavior, untouched.
- Any redaction of the step-8 masked previews (`slice(0, 12)` shows 12
  chars of the token prefix by design; leave as-is).

## Git workflow

- Branch: `advisor/001-wizard-secret-echo`
- Commit style: Conventional Commits, e.g. `fix: stop echoing secrets from production wizard` (matches `git log` style like `fix: gate title-card hover visuals to fine-pointer mice`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Replace the verbatim echo with a pointer to the example file

In `scripts/production-wizard.mjs`, in the `else` branch of the
`writeDevVars` prompt, delete the `println(devVarsContent)` call and the
`info('Content that would have been written:')` line. Replace with a
pointer that names only variable names (never values), e.g. an `info`
line telling the operator to copy `.dev.vars.example` → `.dev.vars` and
fill in `TMDB_TOKEN`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET` from their password manager / the values entered
earlier in this session. Keep the preceding `info('Skipped writing
.dev.vars. ...')` line.

**Verify**: `node --check scripts/production-wizard.mjs` → exit 0; `grep -n
"println(devVarsContent)" scripts/production-wizard.mjs` → no matches.

### Step 2: Audit the rest of the script for other full-value prints

Search the same file for every other place a full secret value could reach
stdout: `grep -n "tmdbToken\|betterAuthSecret\|googleClientSecret\|poolerUrl\|println("
scripts/production-wizard.mjs`. Every match must either print a masked
prefix (`slice(0, 12)` + `…`, or `•••`), print the value only into the
in-memory `devVarsContent` string destined for the gitignored file write,
or be a non-secret command template. If you find another full-value print
to stdout, fix it the same way as Step 1 (mask or remove).

**Verify**: the grep above shows no unmasked secret reaching `println` /
`info` / `warn` / `console.*`. `pnpm lint` → exit 0.

## Test plan

No automated test covers this interactive script (consistent with the repo:
no `*.test.*` exists for `scripts/`). Verification is:

- `node --check scripts/production-wizard.mjs` → exit 0.
- `grep -n "println(devVarsContent)" scripts/production-wizard.mjs` → no matches.
- `pnpm lint` → exit 0.
- Optional manual check (do NOT run the full wizard against production):
  answer `N` at the `.dev.vars` prompt in a scratch directory copy and
  confirm no secret-length strings appear in the output.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `node --check scripts/production-wizard.mjs` exits 0
- [ ] `grep -n "println(devVarsContent)" scripts/production-wizard.mjs` returns no matches
- [ ] `grep -nE "println\(.*(tmdbToken|betterAuthSecret|googleClientSecret)\b" scripts/production-wizard.mjs` returns no matches (no other full-value echo)
- [ ] `pnpm lint` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at `scripts/production-wizard.mjs:210-229` doesn't match the "Current state" excerpt (codebase drifted).
- The wizard reads secrets from a different source than the in-memory
  variables (e.g. it now shells out or reads files) — the masking strategy
  may need rethinking.
- `pnpm lint` fails on lines you did not touch.

## Maintenance notes

- If new secrets are added to the wizard later, they must follow the same
  rule: masked prefix in stdout, full value only in the in-memory string
  for the optional gitignored file write. A reviewer should grep for the
  new variable name + `println`/`info` in the PR.
- Rotation note: this fix stops future exposure; it cannot recall secrets
  already pasted into transcripts. If any operator pasted wizard output
  containing full values, rotate `TMDB_TOKEN`, `BETTER_AUTH_SECRET`, and
  `GOOGLE_CLIENT_SECRET` in the Cloudflare dashboard.
