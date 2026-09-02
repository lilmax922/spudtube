# SpudTube

Discover movies and TV shows, check streaming availability, and manage your watchlists and ratings. No more "what to watch tonight" fatigue.

## Features

- **Zero-ceremony browsing** — land straight on a poster grid; toggle Movies / TV Shows, filter by multiple genres (OR semantics), sorted by popularity, infinite scroll
- **Keyword search** — one query across movies and TV shows at once when you already know roughly what you want
- **Title pages** — overview, genres, year, runtime, trailer, and a recommendations strip to queue up what's next
- **Streaming availability** — which providers carry a title in a given region, grouped subscription → free → rent → buy; defaults to the region detected from your IP, switchable across a curated list of 14 regions; regions never hide titles from you
- **Private tracking** (Google sign-in) — rate any title awesome / good / sucks, one verdict per title, editable forever; maintain a Watchlist and a watched history that never contradict each other
- **i18n** — zh-TW / English interface via @nuxtjs/i18n; defaults from the visitor's country signal (TW → zh-TW, else English), overridable per browser, and never affects catalog content or streaming availability, which follow Region

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Nuxt (SSR) on Cloudflare Pages/Workers |
| Auth | Better Auth, Google OAuth only |
| Database | PostgreSQL — Docker locally, Supabase in production (via session pooler + Cloudflare Hyperdrive) |
| ORM | Drizzle |
| Catalog data | [TMDB](https://www.themoviedb.org) — including streaming-provider data licensed from JustWatch |
| UI | shadcn-vue + Tailwind CSS |
| i18n | @nuxtjs/i18n (zh-TW / en) |
| Testing | Vitest across server routes and components |
| Package manager | pnpm |

## Getting started

Prerequisites: Node.js, pnpm, Docker.

```sh
pnpm install
docker compose up -d        # local Postgres
cp .env.example .env        # then fill in the values below
pnpm db:migrate             # apply Drizzle schema
pnpm dev
```

Environment variables (see `.env.example`); in production all secrets live only
in Cloudflare Pages → Settings → Variables and Secrets — never committed:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Local Docker Postgres URL; for prod migrations use the Supabase **session pooler** URL temporarily (`DATABASE_URL="…" pnpm db:migrate`, port 5432 — not the 6543 transaction pooler, which hangs pg writes); Pages runtime uses a **Hyperdrive** binding `HYPERDRIVE` instead |
| `TMDB_TOKEN` | TMDB API v4 read access token (Bearer, starts with `eyJ…`) |
| `BETTER_AUTH_SECRET` | Better Auth signing secret (`openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | Public base URL (`http://localhost:3000` locally, `https://YOUR_DOMAIN` in prod) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth web client — add both localhost and prod origins/redirects |

Production deploy (ticket 13): Cloudflare Pages builds `main` automatically
(`nuxt.config.ts` → `nitro.preset: "cloudflare_pages"`). The wizard script walks
through the human-only steps — TMDB token, Supabase pooler + Hyperdrive binding,
GCP OAuth prod redirect URIs, secrets on the platform, and migrations:

```sh
pnpm production:wizard   # interactive checklist — prints wrangler + dashboard steps
# or: node scripts/production-wizard.mjs
```

See [`docs/agents/production-deploy.md`](./docs/agents/production-deploy.md) for the
full checklist (Pages project, `wrangler.jsonc` / `HYPERDRIVE` + `smart` placement &
`observability`, `npx wrangler types`, `wrangler hyperdrive create`,
`.dev.vars` for local Pages preview, and post-deploy verification: live TMDB,
Google round-trip, Hyperdrive Availability, footer attribution).

Quality gates — every change must leave all four green before it counts as done:

```sh
pnpm typecheck
pnpm lint      # ESLint is also the formatter; Prettier is not used
pnpm test
pnpm build
```

## Project docs

| Document | Contents |
| --- | --- |
| [`CONTEXT.md`](./CONTEXT.md) | Domain glossary — Title, Kind, Region, Availability, Rating, WatchStatus… |
| [`docs/adr/`](./docs/adr/) | Architecture decision records (data source, stack lock-in, storage strategy) |
| [`docs/agents/code-standard.md`](./docs/agents/code-standard.md) | Implementation rules and conventions |
| [`docs/agents/design-system.md`](./docs/agents/design-system.md) | Approved UI baseline — tokens, type scale, binding rules |
| [`docs/design/prototype.html`](./docs/design/prototype.html) | Interactive design prototype (open in a browser) |
