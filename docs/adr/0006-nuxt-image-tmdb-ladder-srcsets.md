# Nuxt Image adoption with TMDB-ladder srcsets

All app imagery renders through `@nuxt/image`'s `<NuxtImg>` (never a bare `<img>`), with `image.tmdb.org` whitelisted via `image.domains` (unlisted remote hosts — e.g. auth avatars — pass through untouched by design). Responsive sizing is built from TMDB's own URL size ladder (`w92…w780` posters, `w780/w1280` backdrops, `w45…w300` logos) in `app/lib/images.ts`: each asset type exposes a `*Url` (single best bucket as `src`) plus a `*SrcSet` (full ladder as a manual `srcset` attribute, which overrides whatever the module generates), and each call site passes a `sizes` hint keyed to the design-system breakpoints via `image.screens` (`sm: 560`, `md: 880`, `lg: 1280`; Nuxt Image's `sizes` syntax is mobile-first — bare value first, keyed entries step up). The module's default provider stays auto-resolved: IPX (sharp) optimizes in dev and any Node host, while on the production `cloudflare_pages` worker runtime sharp cannot run, so the module falls back to the `none` provider and the hand-built ladder srcset is what actually ships — browsers pick the right TMDB bucket per viewport × DPR with no transformation hop. Swapping to a processing provider later (e.g. Cloudflare Images) is a config-only change.

## Considered Options

- **Rely on the built-in IPX provider everywhere** (rejected): sharp needs Node threads; on `cloudflare_pages` workers it cannot run, so production would serve unprocessed originals — a regression versus today's fixed buckets.
- **Let Nuxt Image generate srcsets from a single `original` source** (rejected): same production hole (pass-through serves multi-hundred-KB originals), plus IPX upscaling in dev.
- **Keep plain `<img>` tags with hand-picked buckets** (rejected): no responsive selection (one size for every DPR/viewport), no module-level future swap path, and the two overlapping URL helpers (`lib/tmdb-image.ts`, `lib/images.ts`) drift apart — consolidated into the latter.
- **Cloudflare Images provider** (deferred): paid product + account setup; revisit only if TMDB's ladder proves insufficient.

## Consequences

- Retina devices fetch sharp buckets (card art picks `w780` at 2× instead of today's always-`w500`); 1× and small viewports fetch smaller files than before.
- `src` remains a sane single bucket, so pre-`srcset` browsers and the `none` provider degrade to today's behavior.
- `sizes` hints are layout truth: card/grid width changes must update the matching hint (they live next to the markup that owns the layout).
- In dev the module's generated fallback `src` may point at `/_ipx/...`; modern browsers use `srcset`, so this is invisible except to pre-`srcset` UAs.
- TMDB serves AVIF/WebP via content negotiation on its own CDN, so format optimization does not depend on the provider.
