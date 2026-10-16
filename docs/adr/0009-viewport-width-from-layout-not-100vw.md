# 0009 Viewport width comes from layout, not 100vw

On Windows, classic scrollbars (~17px) are counted by `100vw` and `window.innerWidth` but not by the layout width that `mx-auto` containers and `documentElement.clientWidth` resolve against. The `ADR-0005` breakout (`width:100vw; margin-left:calc(50% - 50vw)`) and the JS gutter/visible-count math (`use-carousel.ts`, `title-carousel.vue`) therefore overshot by half the scrollbar: at 1920 the first card sat at 160px against a row title at 151.5px, and pages gained horizontal scroll.

We decided that full-bleed surfaces rely on their already full-width parents (`width:100%`) with no `100vw` breakout, and that JS reads the viewport through `readViewportWidth()` (`documentElement.clientWidth`) in `use-carousel.ts`. `app/layout-width.guard.test.ts` statically fails on `width: 100vw`, `calc(50% - 50vw)`, `w-screen`, and `innerWidth` in non-test sources under `app/`. `sizes="100vw"` image hints and `calc(100vw - Npx)` caps stay legal because they do not position a surface.

Supersedes the `100vw` breakout in `ADR-0005` and the reason `ADR-0007` kept `mx-auto` (avoiding a rewrite of that breakout).

## Considered Options

- `overflow-x: clip/hidden` safety net on the page (rejected): hides overshoot bugs instead of removing them, and `hidden` forces `overflow-y: visible` to compute to `auto`, breaking the hover-card coexistence required by `ADR-0005`.
- `scrollbar-gutter: stable` (deferred): would make `100vw` and layout width agree on some platforms, but does not remove the dependency on `100vw`; revisit only if a layout needs it.
- Playwright E2E with a forced 17px scrollbar (deferred): heavier than the risk warrants; the static guard catches the regression class at lint-test speed.

## Consequences

- New full-bleed surfaces must inherit width from a full-width parent; reach for `width:100%`, not viewport units.
- Verified with an injected `::-webkit-scrollbar{width:17px;height:17px}` at 1280/1512/1920: no horizontal overflow, first card left equals row title left.
