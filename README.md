# SpudTube

Decide what to watch. SpudTube helps you discover movies and TV shows, shows you where each title streams in your region, and keeps your private ratings and lists — so a "what should I watch tonight" moment ends in front of something good, not another tab of tabs.

## Features

- **Zero-ceremony browsing** — land straight on a poster grid; toggle Movies / TV Shows, filter by multiple genres (OR semantics), sorted by popularity, infinite scroll
- **Keyword search** — one query across movies and TV shows at once when you already know roughly what you want
- **Title pages** — overview, genres, year, runtime, trailer, and a recommendations strip to queue up what's next
- **Streaming availability** — which providers carry a title in a given region, grouped subscription → free → rent → buy; defaults to the region detected from your IP, switchable across a curated list of 14 regions; regions never hide titles from you
- **Private tracking** (Google sign-in) — rate any title awesome / good / sucks, one verdict per title, editable forever; maintain a Watchlist and a watched history that never contradict each other
- **Traditional Chinese first** — UI and catalog data in zh-TW for visitors from Taiwan (English otherwise), with English fallback for untranslated overviews

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Nuxt (SSR) on Cloudflare Pages/Workers |
| Auth | Better Auth, Google OAuth only |
| Database | PostgreSQL — Docker locally, Supabase in production (via transaction pooler + Cloudflare Hyperdrive) |
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

Environment variables (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (local Docker or Supabase pooler) |
| `TMDB_TOKEN` | TMDB API v4 read access token |
| `BETTER_AUTH_SECRET` | Better Auth signing secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client credentials |

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
| [`docs/design/spudtube-v1-prototype.html`](./docs/design/spudtube-v1-prototype.html) | Interactive v1 design prototype (open in a browser) |
| [`.scratch/spudtube-v1/spec.md`](./.scratch/spudtube-v1/spec.md) | v1 specification |
| [`.scratch/spudtube-v1/issues/`](./.scratch/spudtube-v1/issues/) | Implementation tickets with blocking edges |

## Status

Scaffold landed (ticket 01): Nuxt + toolchain green on all four gates. Next unblocked: tickets 02 (i18n), 03 (TMDB client), 08 (auth), 11 (design system baseline) — see the issues directory for the current frontier.
