# 10: WatchStatus & My List

**What to build:** A status toggle on detail pages (WATCHLISTED / WATCHED) plus a single My List page with three tabs — Watchlist, Watched, Rated. State machine: exactly one state per User×Title; marking WATCHED removes WATCHLISTED; re-watchlisting moves it back. Tabs join stored references with batched live TMDB details (current poster/name). A reference TMDB has removed renders as a degraded entry without breaking the list.

**Blocked by:** 06, 08.

**Status:** ready-for-agent

- [ ] Transition rules hold, including WATCHED-clears-WATCHLIST (integration-tested)
- [ ] Three tabs show the correct sets with live details
- [ ] Removed-from-catalog references degrade gracefully; the rest of the list still loads
- [ ] Anonymous gating matches Rating behavior
