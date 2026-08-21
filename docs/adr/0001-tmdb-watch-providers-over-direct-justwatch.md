# Availability data comes from TMDB watch providers, not direct JustWatch calls

The product brief mentions JustWatch as the streaming-provider source, but JustWatch has no official public API; direct access means an undocumented internal GraphQL endpoint with ToS risk and breakage potential. We decided to source availability from TMDB's watch-provider endpoints (`/movie/{id}/watch/providers`, `/tv/{id}/watch/providers`, `discover` with `watch_region`), whose underlying data is licensed from JustWatch and carries the required attribution. All provider logos are served from the TMDB image CDN.

## Considered Options

- **Direct JustWatch access** (rejected): unofficial API, no stability guarantee, legal/ToS exposure.
- **TMDB watch providers** (chosen): same upstream data, official documented API, single vendor relationship, built-in region parameter.
