# 13: Production deploy

**What to build:** First real deployment: Cloudflare Pages connected to the repo with push-to-main auto-deploys; production Supabase Postgres reached through its transaction pooler via a Hyperdrive binding; secrets configured on the platform; migrations applied to prod; attributions live. Human-only provisioning (TMDB token, GCP OAuth redirect URIs for the prod domain, Supabase project) walked through with a wizard script.

**Blocked by:** 03, 06, 07, 08, 09, 10.

**Status:** ready-for-agent

- [ ] Push to main builds and deploys automatically
- [ ] Production site serves live TMDB data; Google login round-trips in prod
- [ ] Availability panel works in prod through the Hyperdrive path
- [ ] Secrets exist only in platform config; attribution footer present
