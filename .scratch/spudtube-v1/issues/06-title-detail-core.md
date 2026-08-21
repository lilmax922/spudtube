# 06: Title detail core (identity, trailer, recommendations)

**What to build:** Detail routes for both Kinds showing the identity block — backdrop, poster, overview (zh-TW with English fallback), Genres, release year, runtime — plus an embedded trailer and a recommendations strip whose items link to their own detail pages. Reaching a Title that TMDB no longer has degrades gracefully instead of crashing.

**Blocked by:** 02, 03, 11.

**Status:** ready-for-agent

- [ ] Direct URL visits work for a known movie id and tv id
- [ ] Trailer embeds when available and disappears cleanly when not
- [ ] Recommendations strip navigates Title → Title
- [ ] Unknown/removed ids render a friendly not-found state
- [ ] Route-level tests run against the faked S1 client; component tests cover identity block rendering
