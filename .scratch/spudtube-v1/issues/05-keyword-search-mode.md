# 05: Keyword search mode

**What to build:** A search mode separate from genre browsing: one keyword query searches Movies AND TV Shows simultaneously (multi-search), results are labeled by Kind, infinite scroll continues inside results, and the two modes never stack — entering search clears genre filters, leaving search restores the browse state.

**Blocked by:** 04.

**Status:** ready-for-agent

- [ ] A query returns mixed-Kind results, each visibly labeled MOVIE or TV_SHOW
- [ ] Mode switch is exclusive: no combined filter+search states
- [ ] Empty query and no-results states render intentionally
- [ ] Search pagination continues via infinite scroll
