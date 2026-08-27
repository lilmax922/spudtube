# 0007 MaxContentWidth 1680 with responsive gutter variables

SpudTube's centered surfaces were hard-coded to `max-w-[1280px]` / `px-6` / `max-width:1280px` across 14 sites and `gutter = max(24,(vw-1280)/2+24)` in `content-row.vue:29`. Apple TV (`tv.apple.com`) reuses a single pair `--maxContentWidth:1680px` + `--bodyGutter:25→40px@740px` with a derived `--maxShelfContentWidth:calc(1680-2*gutter)` and `padding-inline:var(--bodyGutter)`, while Prime Video uses six-step `--dv-carousel-column-margin` (`24→32→44→72→104` with master jump at `880px`) and also consumes gutter via `padding`. We decided to mirror Apple TV's reuse shape with SpudTube's numbers: `app/assets/css/tailwind.css` `:root { --max-content-width:1680px; --content-gutter:24px; --max-shelf-content-width:calc(var(--max-content-width) - var(--content-gutter)*2) }` plus `@media(min-width:880px){ --content-gutter:40px }`, all containers consume `max-w-[var(--max-content-width)]` / `px-[var(--content-gutter)]` (model A, `mx-auto` kept for centering, `padding` carries gutter), JS gutter reads the CSS variables, and `nuxt.config.ts` `screens` becomes `xs320/sm560/md880/lg1280/xl1680/xxl1920` (`xl:1536→1680`, no new `1024` breakpoint until QA proves crowding at `880-1280`).

## Considered Options
- Bump `screens.lg:1280→1680` vs keep `lg:1280` + add `xl:1680` — picked the latter; bumping `lg` would break every `lg:` utility and `image.screens` `sizes` hint in the `1280-1679` range (most common `1920x1080` screens).
- Tailwind `@theme inline` mapping vs arbitrary `max-w-[var(...)]` — picked arbitrary to keep `tailwind.css` as single truth without extra theme indirection.
- Gutter `24→40 @740px` (Apple) vs `@880px` (Prime) — picked `880px` to align with existing `md:880` system and Prime's master jump, validated at `1024/1280/1680/1920` with `chrome-devtools-axi` peek symmetry.
- Six-step Prime gutter vs two-step Apple — picked two-step for simplicity; third step (`48px≥1400px`) deferred.
- Full Apple grid `1fr min(1680,100%) 1fr` (remove `mx-auto`) vs retain `mx-auto` — kept `mx-auto` to avoid rewriting `ADR-0005` full-bleed `100vw` breakout this batch.

## Consequences
- `design-system.md:94/96/191` max 1280→1680, container padding becomes `var(--content-gutter)` responsive.
- `content-row.vue:29` gutter becomes `max(gutterVar,(vw-maxVar)/2+gutterVar)` reading CSS vars, `BROWSE_CAROUSEL_BREAKPOINTS` re-anchored to 1680.
- Regression matrix: screenshots at `560/880/1280/1680/1920` × `atStart/atMid/atEnd` plus `overflow-y:visible / overflow-x:hidden` coexistence must stay green; `pnpm typecheck && lint && build && vitest` is DoD.
