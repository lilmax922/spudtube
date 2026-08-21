# 03: TMDB client module & proxy routes (seam S1)

**What to build:** The single server-side TMDB client module through which ALL external catalog traffic flows: typed operations for multi-search, discover by Kind/Genre/popularity, Title detail, watch providers, recommendations, and Genre lists for both Kinds. Layered response caching behind it (~24h details/providers, minutes-level search/discover). Read token lives only in server env. Internal proxy routes expose what the frontend needs. Establishes seam S1: tests substitute a fake at this module and never touch the network.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] Every TMDB request in the codebase goes through the client module (verifiable: no stray TMDB-domain fetches elsewhere)
- [ ] Offline tests drive mappers and caching through a fake client (fixture payloads)
- [ ] Token never appears in any client-visible payload or bundle
- [ ] A manual dev-server check returns live TMDB data through the proxy route
