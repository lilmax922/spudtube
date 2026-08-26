# Browse carousel uses section-level container with full-bleed viewport and table-driven paging

Browse rows must read as a full-width viewport (ContentRow title + BrowseCarousel of TitleCards) while headers, filters, and empty states stay inside the `max-w-[1280] px-6` grid. We grilles the Web `standard-carousel` of a reference video service (`navigation-carousel-wrapper` with row padding, `276/24/72` metrics) against SpudTube's `max-w-[1280]` system and decided on section-level padding: `app/pages/index.vue` loses its page-level `mx-auto max-w-[1280] px-6`, each section (`browse-grid.vue` filter bar, `content-row.vue` rowhead) owns `mx-auto max-w-[1280] px-6` individually, and `BrowseCarousel` renders full-bleed (`width:100vw; margin-left:calc(50% - 50vw)`) with a dynamic gutter, a phantom snap node, a viewport-width table for paging, and a full-height arrow overlay — all under neutral `browse-*` naming.

## Considered Options

- **Container (Q5):**
  - *Page-level `mx-auto max-w-[1280] px-6`* in `app/pages/index.vue:6` + half-bleed `calc(100% + (100vw-100%)/2)` (rejected): locked `clientWidth 1576 @1920`, truncated peek, `phantom 60` clipped by parent padding — see `handoff-2026-08-25-netflix-carousel.md` and `handoff-2026-08-26-prime-carousel-waitwhat.md`.
  - *Dual-side breakout* keeping page container (rejected): requires compensating `px-6` and scrollbar-gutter jitter, two mental models.
  - *Section-level container* (chosen): true full-bleed carousel, rowhead left edge and first `TitleCard` edge share `gutter = max(24, (100vw-1280)/2+24)`.

- **Gutter (Q9):**
  - Fixed `60` (current `browse-carousel.vue:23`) or fixed `72` (reference service) (rejected): misaligns title text and card edge on wide screens (`~344px @1920`).
  - Dynamic `max(24, (100vw-1280)/2+24)` (chosen): tracks `design-system.md:94-96` grid.

- **Snap alignment (Q10):**
  - CSS `padding-left` on `CarouselContent` (rejected): shifts Embla `scrollSnapList()` and breaks `containScroll:'trimSnaps'` (`browse-carousel.vue:119`).
  - `carousel-phantom` empty node `width:paddingLeft / marginRight:-gap` + `contentStyle paddingRight:paddingLeft` (`browse-carousel.vue:125-132`, `157`) (chosen): snap 0 = gutter.

- **Visible count / paging (Q11):**
  - Formula `floor((CW - peekCount*peek - gap*peekCount + gap)/(item+gap))` from `use-carousel.ts:39-53` (rejected): yields `2 @700` vs reference `3 @680-879`.
  - Viewport-width table `<=447:1 / 448-679:2 / 680-879:3 / 880-1399:4 / 1400-1799:5 / >1800:6` for `scrollBy` step, `peek 0.25` visual-only (chosen): `getBrowseVisibleCount(viewportWidth)` / `BROWSE_CAROUSEL_BREAKPOINTS` in `use-carousel.ts`.

- **Arrows (Q7/Q12):**
  - `h-11 w-11 rounded-full bg-black/70 top-[68px]` (`browse-carousel.vue:162-182`) (rejected): floats in `100vw`.
  - `w-12 inset-y-0` full-height gradient overlay, `48px` hit-area, `group-hover` only, `max-[560px]:hidden` (chosen): matches `docs/design/prototype.html:238-244`.

- **Sparse rows (Q8):**
  - Duplicate `items` to 8-10 (`content-row.vue:21-31`) (rejected): fabricates Titles.
  - `displayItems = props.items`, `state:'single'` `peek 0` hide arrows (chosen).

- **Implementation seam (Q2/Q6):**
  - Vega TV carousel (`dataAdapter`, `selectionStrategy`) (rejected): Fire TV / D-pad, not Web — see Vega docs reference-only decision `Q1=A` in `/var/folders/jx/cxrwdcl17hdbq7mbhn6czbsc0000gn/T/handoff-2026-08-26-prime-carousel-grilling.md`.
  - `shadcn-vue` + `Embla v8` first, fallback to native `scroll-snap` or other lib if pixel-perfect fails (chosen): `Q6=C` behavior-perfect `95%`.

## Consequences

- `ContentRow`, `BrowseCarousel`, `TitleCard` are now ubiquitous language (`CONTEXT.md:60-72`); `gutter`, `phantom`, `peek` stay implementation detail, not glossary.
- Code, comments, and tests must use neutral `browse-*` naming only (`BROWSE_CAROUSEL_BREAKPOINTS`, `getBrowseVisibleCount`) — hard constraint from grilling session — no reference-service naming.
- `use-carousel.test.ts:56-79` expectations shift from formula to table; `browse-carousel.vue:105` `scrollBy` computes `step` from table.
- Full-bleed requires `overflow-y:visible` coexistence with `overflow-x:hidden` (`CarouselContent.vue:19`, `browse-carousel.vue:205-206`) re-verified with `chrome-devtools-axi` screenshots at `1920/1280/880/560` (OS temp dir only).
- If catalog grows to need virtualization or true infinite loop, revisit `renderedItemsCount` and duplication strategy.

## Amendment (2026-08-26): snap alignment drift

Bug-fix session against `ae80434` replaced two Q10 mechanics; gutter formula (Q9), breakpoint table (Q11), arrows (Q7/Q12), and section container (Q5) stand unchanged.

- *Leading phantom slide + container `padding-right`* (rejected now): Embla v8 computes `contentSize` from slide rects plus the **last slide's `margin-right`** (`SlideSizes.measureEndGap`) — container padding is invisible to it, so the atEnd snap parked the last TitleCard flush against the right edge (no trailing gutter) with a ~54% left peek. Replaced by container `padding-left` (gutter) + last CarouselItem `margin-right: var(--browse-gutter)`, which Embla measures natively.
- *Item-aligned snaps (`align: 'start'`, `slidesToScroll: 1` + index math)* (rejected now): mid positions landed flush on an item boundary on the left and arbitrarily deep on the right, so atMid never showed the symmetric ~25% edge peeks the reference service shows. Replaced by `slidesToScroll: getBrowseVisibleCount(W)` (page = one group, arrows/keyboard/drag all group-aware via Embla `scrollNext/scrollPrev`) plus a custom `align` function returning `getMidSnapShift(W, itemWidth, gap, peekRatio)` (`use-carousel.ts`), a constant px shift solved from `itemWidth − x ≡ (x + W) (mod itemWidth + gap)` so mid positions clip both edge items equally (~`peekRatio`); start/end snaps are re-clamped by `containScroll: 'trimSnaps'`, keeping atStart/atEnd exact mirrors (left gutter ↔ right gutter).
- *Viewport `overflow-x: hidden`* (rejected now): per CSS Overflow 3, `hidden` forces the sibling `overflow-y: visible` to compute to `auto` — the viewport became a vertical scroll container that clipped hover cards (bug: TitleCard hover panel cut at top) and grew `scrollHeight` on hover (bug: page gained vertical scroll). `CarouselContent.vue` now uses `overflow-x: clip`, which coexists with `overflow-y: visible`; the `padding-bottom: 300px / margin-bottom: -280px` hover hack is deleted.
- Verified at 1920/1280/880/560: atStart = left gutter + right peek, atMid = symmetric peeks (56/56 px @1920), atEnd = left peek + right gutter, atStart/atEnd peeks exactly mirrored; one click pages `visibleCount` items (transform deltas 1808/912/984/444).
