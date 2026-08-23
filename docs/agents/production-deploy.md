# Production deploy (ticket 13)

First real deployment wiring for SpudTube. Human-only provisioning is walked through
by `pnpm production:wizard` (`scripts/production-wizard.mjs`); this document is the
repeatable checklist the wizard prints and the code expects.

## Hosting

- **Platform:** Cloudflare Pages (Nuxt SSR, `nitro.preset: "cloudflare_pages"` in `nuxt.config.ts`).
- **Auto-deploy:** Pages project connected to the GitHub repo, branch `main`, build command
  `pnpm build`. Every push to `main` builds and deploys automatically — verify in the
  Pages dashboard that Branch = `main` and Auto-deploy is on.
- **Local preview of the Pages runtime:** `npx wrangler pages dev ./dist` (or `dist` after
  `pnpm build` with `cloudflare_pages` preset). For secrets during local Pages preview use
  `.dev.vars` (git-ignored, see `.dev.vars.example`); the file is never committed.
- **Config:** `wrangler.jsonc` is the source of truth (JSONC preferred per Wrangler docs).
  `compatibility_date` is kept current (`2026-08-23`), `compatibility_flags: ["nodejs_compat"]`
  is required for `pg`/`drizzle-orm`, `placement: {mode:"smart"}` optimizes multi-query
  routes near the DB, and `observability` enables logs/traces. Run `npx wrangler types`
  after any binding change — `worker-configuration.d.ts` is committed and provides the typed
  `Env` (`HYPERDRIVE: Hyperdrive` plus secrets).

## Database: Supabase Postgres via Hyperdrive

ADR 0002/0003: production Postgres is **Supabase**, reached through its **transaction pooler**
(port 6543, `?pgbouncer=true`) wrapped by a **Cloudflare Hyperdrive** binding. Local dev
still talks straight to Docker Postgres via `DATABASE_URL`.

```
Browser → Pages Worker → event.context.cloudflare.env.HYPERDRIVE.connectionString
                         → Hyperdrive cache/pool → Supabase pooler (6543) → Postgres
```

- `server/db/index.ts` — `getHyperdriveConnectionString(event)` reads the single canonical
  `event.context.cloudflare.env.HYPERDRIVE.connectionString` (typed via generated `Env`);
  mis-placed bindings return `undefined` and cause an explicit `DATABASE_URL is required`
  error instead of silently falling back. `resolveDatabaseUrl(event)` prefers Hyperdrive over
  `process.env.DATABASE_URL`. `getDb(event)` creates a **per-request `Pool` (max 5)** when
  Hyperdrive is present (respects Workers 6-connection limit, lets Hyperdrive pool) and reuses
  a singleton `localDb` otherwise. Tests call `getDb()` without an event and use the singleton.
- `server/auth.ts` — `getAuth(event)` builds a typed `AuthInstance` per hyperdrive request;
  `server/utils/auth.ts` and `server/api/auth/[...all].ts` thread `event` through.
  The bare `auth` export remains as a lazy singleton for fixtures/tests (deferred creation so
  importing the module never requires `DATABASE_URL` when prod only has Hyperdrive).
- `wrangler.jsonc` documents the binding (`hyperdrive: [{binding:"HYPERDRIVE",id:"…",localConnectionString}]`).
  The `id` is replaced after `wrangler hyperdrive create`. `localConnectionString` lets
  `wrangler pages dev` fall back to the Docker DB. `smart` placement and `observability`
  are enabled per `workers-best-practices`.

Steps (also printed by the wizard):

1. `npx wrangler hyperdrive create spudtube-db --connection-string="postgresql://…:6543/…?pgbouncer=true&sslmode=require"`
   → note the returned `id`.
2. Put that `id` into `wrangler.jsonc` (`hyperdrive[0].id = "…"`) and regenerate types:
   `npx wrangler types` → commit `worker-configuration.d.ts`. For a Pages dashboard
   project, Dashboard → Pages → spudtube → Settings → Functions → Hyperdrive bindings →
   Add binding → variable `HYPERDRIVE` → pick `spudtube-db`.
3. Do **not** set `DATABASE_URL` as a Pages secret when Hyperdrive is attached — the binding
   supplies it. For one-off production migrations use a shell env var:
   `DATABASE_URL="postgresql://…:6543/…" pnpm db:migrate`.

Migrations live in `server/db/migrations/` and apply via `drizzle-kit migrate` (see
`drizzle.config.ts` which reads `process.env.DATABASE_URL`). Verify in Supabase → Table
Editor that `user`, `session`, `account`, `verification`, `rating`, `title_status` exist.

## Secrets — platform only

All secrets exist only in Cloudflare Pages → Settings → Variables and Secrets (production)
and in `.dev.vars` (git-ignored, local Pages preview). No secret is committed, none is
baked into the bundle.

- `TMDB_TOKEN` — TMDB API v4 read access token (Bearer, starts with `eyJ…`). Sent only
  server-side in `server/tmdb/client.ts` (`Authorization: Bearer …`).
- `BETTER_AUTH_SECRET` — `openssl rand -hex 32`
- `BETTER_AUTH_URL` — `https://YOUR_PROD_DOMAIN` in prod, `http://localhost:3000` locally
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google Cloud Console → Credentials → Web client.

Google OAuth must list both:
- Authorized JavaScript origins: `http://localhost:3000`, `https://YOUR_PROD_DOMAIN`
- Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`,
  `https://YOUR_PROD_DOMAIN/api/auth/callback/google`

If the prod sign-in loops back to `localhost`, `BETTER_AUTH_URL` is wrong; fix it in the
Pages secrets and redeploy.

## TMDB & provider data

All TMDB traffic goes through `server/tmdb/client.ts` (seam S1) — no other file fetches
`api.themoviedb.org`. The token is read only from server env and never appears in a
client payload (guard test asserts this). The Availability panel (`availability-panel.vue`)
fetches `GET /api/catalog/:kind/:id/providers` (full catalog, region slicing is client-side)
and groups providers subscription → free → rent → buy with TMDB CDN logos.

## Attribution — always visible

Spec ADR 0001: provider data is licensed from JustWatch. The string
“Provider data licensed from JustWatch · This product uses the TMDB API but is not
endorsed or certified by TMDB.” (`availability.attribution`) renders in two places:

- The Availability panel itself (ticket 07), alongside any provider data.
- The site-wide footer `app/components/attribution-footer.vue`, mounted in `app/app.vue`
  so the attribution is present even on pages without provider data. The footer is the
  “attribution footer present” check for ticket 13.

## Verification checklist (post-deploy)

Push to `main` and confirm:

- [ ] Pages builds `main` automatically; the preview/prod URL serves the poster grid.
- [ ] The grid and detail pages show **live TMDB data** (not fixtures).
- [ ] Detail → Availability panel switches Region across the 14 curated Regions
      (TW, HK, JP, KR, SG, US, GB, CA, AU, DE, FR, IN, BR, MX) and the provider list
      updates without filtering catalog — it travels the Hyperdrive path (check
      Pages → Functions → Logs or Hyperdrive → Metrics for cache activity).
- [ ] Google sign-in on the prod domain round-trips back to prod (not localhost) and the
      session survives reload; sign-out clears everywhere.
- [ ] Rating (awesome/good/sucks) and WatchStatus (watchlisted/watched) persist across
      reloads; `/my-list` three tabs render with live posters.
- [ ] Footer attribution is visible on every page; the Availability panel attribution is
      visible whenever provider data appears.
- [ ] No secret appears in client bundles:
      `curl -s https://YOUR_DOMAIN/_nuxt/*.js | grep -i "eyJ" && echo "LEAKED" || echo ok`
- [ ] `pnpm typecheck && pnpm lint && pnpm build` still green.
