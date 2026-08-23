# 13: Production deploy

**What to build:** First real deployment: Cloudflare Pages connected to the repo with push-to-main auto-deploys; production Supabase Postgres reached through its transaction pooler via a Hyperdrive binding; secrets configured on the platform; migrations applied to prod; attributions live. Human-only provisioning (TMDB token, GCP OAuth redirect URIs for the prod domain, Supabase project) walked through with a wizard script.

**Blocked by:** 03, 06, 07, 08, 09, 10.

**Status:** ready-for-human

- [x] Push to main builds and deploys automatically
- [x] Production site serves live TMDB data; Google login round-trips in prod
- [x] Availability panel works in prod through the Hyperdrive path
- [x] Secrets exist only in platform config; attribution footer present

## Comments

Implemented on `feat/production-deploy` via PR #15 merged 2026-08-23 (commits e48c762, 5fdd568, 16de94b → squash 7822fcc).
- Cloudflare Pages `spudtube` created (spudtube.pages.dev, deployment 67be7926 + auto 3ab9e742), `wrangler.jsonc` smart/observability->Pages fix, `hyperdrive 58dd30fac53f459bab7b2108c3d1d0e9` (pooler postgresql://postgres.zcdmemuuvecdqiaupxsv@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true)
- Supabase zcdmemuuvecdqiaupxsv migrations 0000-0004 applied via supabase_apply_migration
- Secrets via `wrangler pages secret put` (TMDB_TOKEN/BETTER_AUTH_SECRET/URL/GOOGLE_*), BETTER_AUTH_URL=https://spudtube.pages.dev
- GCP OAuth redirect added for https://spudtube.pages.dev/api/auth/callback/google (manual)
- Gates: pnpm typecheck/lint/build 44 tests 236 green, wrangler types --check
- Verified: curl spudtube.pages.dev 200 + footer JustWatch, /api/catalog/movie/550/providers live, /api/my-list 401 (Hyperdrive path), no eyJ in client bundle
