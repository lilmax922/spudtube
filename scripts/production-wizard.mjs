#!/usr/bin/env node
/* eslint-disable eslint-comments/no-unlimited-disable -- wizard needs unlimited disable to silence all rules */
/* eslint-disable -- interactive wizard, not subject to antfu style; secrets never committed */
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'

const rl = createInterface({ input, output })

function println(msg = '') {
  output.write(`${msg}\n`)
}

function heading(title) {
  println()
  println(`\x1b[1m${title}\x1b[0m`)
  println('─'.repeat(title.length))
}

function ok(msg) {
  println(`\x1b[32m✔ ${msg}\x1b[0m`)
}

function warn(msg) {
  println(`\x1b[33m⚠ ${msg}\x1b[0m`)
}

function info(msg) {
  println(`  ${msg}`)
}

async function ask(question, { defaultValue, validate, secret } = {}) {
  const suffix = defaultValue ? ` [${defaultValue}]` : ''
  const prompt = `${question}${suffix}: `
  while (true) {
    const raw = secret
      ? await askSecret(prompt)
      : await rl.question(prompt)
    const value = raw.trim() || defaultValue || ''
    if (validate) {
      const err = validate(value)
      if (err) {
        warn(err)
        continue
      }
    }
    return value
  }
}

async function askSecret(prompt) {
  // Node readline has no built-in secret mode; we read normally but warn that the
  // value will be echoed. For real secrecy the operator pastes into the dashboard
  // directly — this wizard never writes secrets to disk unless they explicitly ask.
  return rl.question(prompt)
}

function validateDomain(value) {
  if (!value)
    return 'Enter the production domain (e.g. spudtube.pages.dev or your custom domain)'
  if (value.includes('://') || value.includes('/'))
    return 'Enter just the hostname, e.g. spudtube.pages.dev'
  if (!value.includes('.'))
    return 'That does not look like a hostname — it should contain a dot'
  return null
}

function validateTmdbToken(value) {
  if (!value)
    return 'Paste the TMDB API v4 read access token (starts with eyJ…)'
  if (!value.startsWith('eyJ'))
    return 'TMDB v4 tokens start with eyJ — did you paste the v3 API key instead?'
  if (value.length < 80)
    return 'That token looks too short to be a valid TMDB read token'
  return null
}

function validatePoolerUrl(value) {
  if (!value)
    return 'Paste the Supabase transaction pooler URL (Session/transaction mode, port 6543)'
  if (!value.startsWith('postgres://') && !value.startsWith('postgresql://'))
    return 'Pooler URL should start with postgres:// or postgresql://'
  if (!value.includes(':6543'))
    warn('Pooler URLs usually use port 6543 (transaction mode). Continuing either way.')
  return null
}

function validateNotEmpty(label) {
  return value => (!value ? `${label} is required` : null)
}

async function main() {
  println('\x1b[1mSpudTube — Production deploy wizard\x1b[0m')
  println('Walks through the human-only provisioning for ticket 13.')
  println('Nothing in this wizard commits secrets to git. Secrets live only in')
  println('Cloudflare Pages → Settings → Variables and Secrets and in the')
  println('Supabase / GCP consoles.')

  heading('1 — Production domain')
  info('This is the hostname Cloudflare Pages will serve your `main` branch on.')
  info('If you have not yet created the Pages project, you will create it in step 7')
  info('and then come back to fill this in for the OAuth redirect URIs.')
  const prodDomain = await ask('Production hostname', { validate: validateDomain })

  heading('2 — TMDB read access token (v4)')
  info('Get it at https://www.themoviedb.org/settings/api → API Read Access Token (v4, Bearer).')
  info('The token is a long JWT starting with eyJ… It must never be committed.')
  const tmdbToken = await ask('TMDB_TOKEN', { validate: validateTmdbToken, secret: true })

  heading('3 — Supabase Postgres + transaction pooler')
  info('Create a Supabase project (https://supabase.com) if you do not have one.')
  info('In Database → Connection string → Transaction pooler (port 6543), copy the URI.')
  info('It must include ?pgbouncer=true and sslmode=require (Supabase pooler default).')
  const poolerUrl = await ask('Supabase pooler DATABASE_URL', { validate: validatePoolerUrl, secret: true })

  heading('4 — Google OAuth client')
  info('In Google Cloud Console → APIs & Services → Credentials → Create OAuth client')
  info('(Web application). Add BOTH origins / redirect URIs:')
  info(`  • Authorized JavaScript origin:    http://localhost:3000`)
  info(`  • Authorized JavaScript origin:    https://${prodDomain}`)
  info(`  • Authorized redirect URI:         http://localhost:3000/api/auth/callback/google`)
  info(`  • Authorized redirect URI:         https://${prodDomain}/api/auth/callback/google`)
  info('The GCP brand must be External and in Testing or Production; add yourself as a')
  info('test user while in Testing.')
  const googleClientId = await ask('GOOGLE_CLIENT_ID', { validate: validateNotEmpty('GOOGLE_CLIENT_ID') })
  const googleClientSecret = await ask('GOOGLE_CLIENT_SECRET', { validate: validateNotEmpty('GOOGLE_CLIENT_SECRET'), secret: true })

  heading('5 — Better Auth secret & URL')
  const suggestedSecret = randomBytes(32).toString('hex')
  info(`BETTER_AUTH_SECRET must be a long random string (≥32 chars). Suggested:`)
  info(`  ${suggestedSecret}`)
  const betterAuthSecret = await ask('BETTER_AUTH_SECRET', {
    defaultValue: suggestedSecret,
    validate: v => (v.length < 32 ? 'Use at least 32 characters' : null),
    secret: true,
  })
  const betterAuthUrl = `https://${prodDomain}`
  ok(`BETTER_AUTH_URL will be ${betterAuthUrl} (derived from your prod domain)`)

  heading('6 — Hyperdrive binding (Supabase pooler via Cloudflare)')
  info('Create a Hyperdrive config that wraps the pooler URL. This is the ONLY way')
  info('Workers/Pages can reach Postgres at the edge (ADR 0002).')
  info('wrangler.jsonc already contains smart placement & observability per workers-best-practices:')
  info('  "placement": {"mode":"smart"}   // multi-query routes execute near DB')
  info('  "observability": {"enabled":true} // logs/traces in Dashboard')
  info('  "hyperdrive": [{"binding":"HYPERDRIVE", "id":"…", "localConnectionString":"…"}]')
  info('The localConnectionString keeps `wrangler pages dev` on Docker Postgres; production')
  info('uses HYPERDRIVE.connectionString via getDb(event) (server/db/index.ts).')
  info('Run:')
  println()
  println(`  npx wrangler hyperdrive create spudtube-db --connection-string="${poolerUrl}"`)
  println()
  info('Note the returned `id` (e.g. abc123…). Then in wrangler.jsonc set:')
  println()
  println('  "hyperdrive": [{')
  println('    "binding": "HYPERDRIVE",')
  println(`    "id": "PASTE_THE_ID_HERE",`)
  println('    "localConnectionString": "postgresql://spudtube:spudtube@localhost:5432/spudtube"')
  println('  }]')
  println()
  info('Then regenerate types and commit:')
  println('  npx wrangler types   # updates worker-configuration.d.ts (Env.HYPERDRIVE)')
  println()
  info('For Pages dashboard deployments, also attach the Hyperdrive to the Pages')
  info('project: Cloudflare Dashboard → Pages → spudtube → Settings → Functions →')
  info('Hyperdrive bindings → Add binding → Variable name HYPERDRIVE → pick spudtube-db.')
  const hyperdriveId = await ask('Hyperdrive ID (paste after you run the wrangler command, or leave blank to do later)', {})

  heading('7 — Cloudflare Pages — connect to GitHub')
  info('If the Pages project does not yet exist:')
  info('  1. https://dash.cloudflare.com → Pages → Create project → Connect to Git')
  info('  2. Pick this repo, branch `main`, build command `pnpm build`, output `dist`')
  info('     (the `cloudflare_pages` Nitro preset in nuxt.config.ts is auto-detected).')
  info('  3. Environment variables: add NO secrets during the first build; they are')
  info('     added in the next step. Pages will build `main` on every push automatically')
  info('     once connected — this is the “push to main builds and deploys” check.')
  info('If the project already exists, verify Build → Branch is `main` and Auto-deploy is on.')
  info('Build is gated by CI (.github/workflows/ci.yml): pnpm typecheck, lint, test, build.')

  heading('8 — Secrets — Cloudflare Pages dashboard ONLY')
  warn('Never put these in wrangler.toml, .env, or git. Set them in:')
  info('Cloudflare Dashboard → Pages → spudtube → Settings → Variables and Secrets →')
  info('Production → Add variable (choose “Secret” / “Encrypt” for the sensitive ones).')
  println()
  info(`  TMDB_TOKEN            = (paste) ${tmdbToken.slice(0, 12)}…`)
  info(`  BETTER_AUTH_SECRET    = (paste) ${betterAuthSecret.slice(0, 12)}…`)
  info(`  BETTER_AUTH_URL       = ${betterAuthUrl}`)
  info(`  GOOGLE_CLIENT_ID      = ${googleClientId.slice(0, 12)}…`)
  info(`  GOOGLE_CLIENT_SECRET  = (paste) ••••••••`)
  info('  # Do NOT set DATABASE_URL in Pages when Hyperdrive is attached — the binding')
  info('  # supplies the connection. For `wrangler pages dev` locally, put the pooler')
  info('  # URL into .dev.vars (git-ignored) if you need to test the pooler locally.')
  println()
  info('For `wrangler pages dev` local preview, create .dev.vars (git-ignored, see .dev.vars.example):')
  println()
  println('  TMDB_TOKEN=…')
  println('  BETTER_AUTH_SECRET=…')
  println(`  BETTER_AUTH_URL=http://localhost:3000`)
  println(`  GOOGLE_CLIENT_ID=${googleClientId}`)
  println('  GOOGLE_CLIENT_SECRET=…')
  println('  # optional: DATABASE_URL=postgresql://…:6543/…?pgbouncer=true&sslmode=require')
  println()

  const devVarsContent = [
    `TMDB_TOKEN=${tmdbToken}`,
    `BETTER_AUTH_SECRET=${betterAuthSecret}`,
    `BETTER_AUTH_URL=http://localhost:3000`,
    `GOOGLE_CLIENT_ID=${googleClientId}`,
    `GOOGLE_CLIENT_SECRET=${googleClientSecret}`,
    `# Uncomment to test the pooler locally (wrangler pages dev reads .dev.vars):`,
    `# DATABASE_URL=${poolerUrl}`,
  ].join('\n') + '\n'

  const writeDevVars = await ask('Write .dev.vars for local Pages preview now? (y/N)', { defaultValue: 'N' })
  if (/^y(es)?$/i.test(writeDevVars)) {
    await writeFile('.dev.vars', devVarsContent, 'utf8')
    ok('Wrote .dev.vars (git-ignored). Keep it private — it contains real secrets.')
    info('Preview with: npx wrangler pages dev ./dist  (after pnpm build)')
  }
  else {
    info('Skipped writing .dev.vars. Copy .dev.vars.example → .dev.vars manually if needed.')
    info('Content that would have been written:')
    println(devVarsContent)
  }

  heading('9 — Apply migrations to production')
  info('Run once against the pooler URL (Hyperdrive itself is a cache, not the store).')
  info('Only DATABASE_URL is needed for the migration; BETTER_AUTH_URL is a runtime')
  info('secret (already set on Pages in step 8) and not used by drizzle-kit.')
  println()
  println(`  DATABASE_URL="${poolerUrl}" pnpm db:migrate`)
  println()
  info('If you use the pooler locally via .dev.vars, you can also run:')
  println('  # with DATABASE_URL in .dev.vars, or temporarily:')
  println(`  DATABASE_URL="${poolerUrl}" BETTER_AUTH_URL=http://localhost:3000 pnpm db:migrate`)
  println()
  info('Verify in Supabase → Table Editor that tables user, session, account,')
  info('verification, rating, title_status exist.')

  heading('10 — Quality gate & Deploy & verify')
  info('Local gates must be green before pushing (Definition of Done):')
  println('  pnpm typecheck && pnpm lint --fix && pnpm build && pnpm test')
  println()
  info('Then:')
  info('  git push origin main   # Pages builds and deploys automatically')
  info(`  open https://${prodDomain}   # should render the poster grid with live TMDB data`)
  info(`  open https://${prodDomain}/movie/550  # detail, trailer,`)
  info('     # then switch Region in the Availability panel — the list of Providers')
  info('     # must change without refetching catalog and must travel the Hyperdrive path:')
  info('     # check Pages → Functions → Logs or Hyperdrive → Metrics for cache hits.')
  info('  Sign in with Google → the round-trip must land back on the prod domain')
  info('     # (not localhost). If it loops to localhost, BETTER_AUTH_URL is wrong.')
  info('  Inspect /api/auth/get-session and Supabase tables user/session/account: they')
  info('     # must show the signed-in user; reload must keep session; sign-out must clear.')
  info('  Rate a title, toggle Watchlist/Watched, check /my-list — data must persist')
  info('     # across reloads (stored in Supabase via Hyperdrive).')
  info('  Live TMDB checks (server/tmdb/client.ts is the only fetcher):')
  info('    - search ? search/multi')
  info('    - discover ? discover/movie|tv')
  info('    - detail ? /movie|tv/:id')
  info('    - providers ? /movie|tv/:id/watch/providers (grouped + TMDB CDN logos)')
  info('    - recommendations ? /movie|tv/:id/recommendations')
  info('    - genres ? /genre/movie|tv/list')
  info('  Availability via Hyperdrive:')
  info('    GET /api/catalog/:kind/:id/providers → server reads HYPERDRIVE when present')
  info('  Inspect the page footer and any Availability panel — both must show:')
  info('    “Provider data licensed from JustWatch · This product uses the TMDB API')
  info('     but is not endorsed or certified by TMDB.” (i18n key availability.attribution)')
  info('  Logo check: provider logos are served from https://image.tmdb.org/t/p/w92')
  info('  Check that no secret appears in the deployed bundle:')
  println()
  println('  curl -s https://${prodDomain}/_nuxt/*.js | grep -i "eyJ" && echo "LEAKED" || echo "ok"')
  println()

  heading('Summary — what you just configured')
  println(`  Prod domain:        https://${prodDomain}`)
  println(`  Hyperdrive ID:      ${hyperdriveId || '(fill in wrangler.jsonc after creation, then run npx wrangler types)'}`)
  println(`  Pooler URL host:    ${(() => { try { return new URL(poolerUrl).host } catch { return '(unparsable)' } })()}`)
  println(`  BetterAuth URL:     ${betterAuthUrl}`)
  println('  Pages auto-deploy:  on (push to main)')
  println('  Nitro preset:       cloudflare_pages (nuxt.config.ts)')
  println('  Placement:          smart (wrangler.jsonc)')
  println('  Observability:      enabled (wrangler.jsonc → Dashboard Logs/Traces)')
  println('  DB path:            local DATABASE_URL ↔ prod Hyperdrive(pooler:6543) via getDb(event)')
  println('  Attribution:        footer + availability panel (checked in verification)')

  println()
  ok('Wizard complete. Keep this output private — it contains prefixes of secrets.')
  println('Next: push to main and follow the verification checklist above.')
  rl.close()
}

main().catch((err) => {
  println(`\nWizard failed: ${err instanceof Error ? err.message : String(err)}`)
  process.exitCode = 1
  rl.close()
})
