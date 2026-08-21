# 04: Home browse grid

**What to build:** The zero-ceremony landing: Visitors arrive directly on a poster grid. A Kind toggle (Movies / TV Shows) applies in genre-browse mode; Genre chips come from the catalog and combine with OR semantics; results sort by popularity; scrolling seamlessly loads the next pages.

**Blocked by:** 02, 03, 11.

**Status:** ready-for-agent

- [ ] Landing shows the grid immediately — no hero, no gate
- [ ] Kind toggle refetches the grid for the other catalog
- [ ] Multi-genre selection unions results (OR)
- [ ] Infinite scroll appends pages without clicks
- [ ] Poster cards show localized titles; missing artwork degrades gracefully
- [ ] Component tests cover card rendering and mode switching (S3)
