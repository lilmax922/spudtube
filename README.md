# SpudTube

Discover movies and TV shows, check streaming availability, and manage your watchlists and ratings. No more "what to watch tonight" fatigue.

## Features

- **Zero-ceremony browsing** — land straight on a poster grid; toggle Movies / TV Shows, filter by multiple genres (OR semantics), sorted by popularity, infinite scroll
- **Keyword search** — one query across movies and TV shows at once when you already know roughly what you want
- **Title pages** — overview, genres, year, runtime, trailer, and a recommendations strip to queue up what's next
- **Streaming availability** — which providers carry a title in a given region, grouped subscription → free → rent → buy; defaults to the region detected from your IP, switchable across a curated list of 14 regions; regions never hide titles from you
- **Private tracking** (Google sign-in) — rate any title awesome / good / sucks, one verdict per title, editable forever; maintain a Watchlist and watched titles that never contradict each other
- **i18n** — zh-TW / English interface via @nuxtjs/i18n; defaults from the visitor's country signal (TW/CN → zh-TW, else English), overridable per browser, and never affects catalog content or streaming availability, which follow Region

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

## Project docs

| Document | Contents |
| --- | --- |
| [`GLOSSARY.md`](./GLOSSARY.md) | Domain glossary — Title, Kind, Region, Availability, Rating, WatchStatus… |
| [`docs/adr/`](./docs/adr/) | Architecture decision records (data source, stack lock-in, storage strategy) |
| [`docs/agents/code-standard.md`](./docs/agents/code-standard.md) | Implementation rules and conventions |
| [`docs/agents/design-system.md`](./docs/agents/design-system.md) | Approved UI baseline — tokens, type scale, binding rules |
