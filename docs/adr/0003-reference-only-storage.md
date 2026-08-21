# No catalog mirroring: store TMDB references only

Our Postgres holds no `titles` table. We persist only references — composite key `(kind, tmdb_id)` — on Rating and WatchStatus rows, and fetch catalog data live from TMDB through Nitro server routes with short-TTL response caching (`cachedEventHandler`: ~24h for details, minutes for search). Chosen because v1 ratings are private (no cross-member aggregation to serve) and mirroring would add a sync/freshness problem for no read-path benefit.

## Consequences

- Member list pages (rated / watchlist / watched) batch-fetch title details from TMDB at read time.
- Referencing a Title that TMDB later removes yields a "no longer in catalog" state that the UI must handle.
- If ratings ever become public/aggregated, this decision should be revisited.
