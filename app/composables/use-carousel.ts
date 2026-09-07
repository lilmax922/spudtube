import type { Ref } from 'vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'

export type CarouselVariant = 'standard' | 'expandable'

export const CAROUSEL_DEFAULTS = {
  itemWidth: 240,
  gap: 16,
  peekRatio: 0.25,
} as const

// Rest item width per variant. The section template carries the matching
// literal width classes (Tailwind needs literals), so keep both in sync.
export const CAROUSEL_VARIANT_WIDTHS: Record<CarouselVariant, number> = {
  standard: 180,
  expandable: 240,
}

export function calculatePeekWidth(itemWidth: number, peekRatio: number): number {
  return Math.round(itemWidth * peekRatio)
}

export const BROWSE_CAROUSEL_BREAKPOINTS: Array<{ maxWidth: number, count: number }> = [
  { maxWidth: 447, count: 1 },
  { maxWidth: 679, count: 2 },
  { maxWidth: 879, count: 3 },
  { maxWidth: 1399, count: 3 },
  { maxWidth: 1799, count: 4 },
]

export function getBrowseVisibleCount(viewportWidth: number): number {
  if (viewportWidth <= 0)
    return 1
  for (const bp of BROWSE_CAROUSEL_BREAKPOINTS) {
    if (viewportWidth <= bp.maxWidth)
      return bp.count
  }
  return 5
}

/**
 * Pixel offset added to Embla's aligned group snaps so that mid-scroll positions
 * clip both edge items by the same amount (~peekRatio of item width).
 *
 * Why: with container padding G and group snaps at G + k*S (item-aligned), a mid
 * position lands flush on an item boundary on the left ((s-G) mod step === 0) and
 * arbitrarily deep on the right. Shifting every group snap by a constant moves the
 * mid positions to `(G + x) mod step`, where x = hidden part of the left edge item.
 * x is solved from `itemWidth - x === (x + viewportWidth) mod step` so both edges
 * peek equally; the two algebraic branches are both tried and the one closer to
 * `itemWidth * peekRatio` wins. Start/end snaps are unaffected because
 * `containScroll: 'trimSnaps'` re-clamps them to the scroll bounds.
 *
 * The shift is gutter-independent (G cancels out of the congruence).
 */
export function getMidSnapShift(
  viewportWidth: number,
  itemWidth: number,
  gap: number,
  peekRatio: number,
): number {
  const step = itemWidth + gap
  if (viewportWidth <= 0 || itemWidth <= 0 || step <= 0)
    return 0
  const r = ((viewportWidth % step) + step) % step
  const target = itemWidth * peekRatio
  const candidates: number[] = []
  // branch 1: x + r < step → visibleRight = x + r
  const x1 = (itemWidth - r) / 2
  if (x1 > 0 && x1 < itemWidth && x1 + r < step)
    candidates.push(x1)
  // branch 2: x + r >= step → visibleRight = x + r - step
  const x2 = (itemWidth - r + step) / 2
  if (x2 > 0 && x2 < itemWidth && x2 + r >= step)
    candidates.push(x2)
  if (candidates.length === 0)
    return 0
  const best = candidates.reduce((a, b) =>
    Math.abs(itemWidth - a - target) <= Math.abs(itemWidth - b - target) ? a : b)
  const hidden = Math.min(itemWidth - 1, Math.max(1, Math.round(best)))
  return (((step - hidden) % step) + step) % step
}

// Embla reInit gate: slide growth (expandable 240->540px) must not re-measure
// Embla mid-transition. Repeated re-measured re-seeks kill in-flight scroll
// animations, so an arrow click during expansion lands instantly instead of
// gliding. Only the viewport container may trigger a re-measure.
export function shouldReinitCarousel(entries: ResizeObserverEntry[]): boolean {
  return entries.some(entry => entry.target instanceof Element && entry.target.matches('[data-slot="carousel-content"]'))
}

// Single home for the content gutter: the centered page caps inline size at
// --max-content-width, so wider viewports split the surplus as side gutters.
// The carousel viewport padding and the expandable card edge margin both read
// this, which keeps the row and its glide math on the same gutter.
export function resolveContentGutter(viewportWidth: number, maxContentWidth: number, contentGutter: number): number {
  return Math.max(contentGutter, (viewportWidth - maxContentWidth) / 2 + contentGutter)
}

function readCssVarNumber(name: string, fallback: number): number {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

export function useContentGutter(): Ref<number> {
  const gutter = ref(24)
  function updateGutter(): void {
    if (typeof window === 'undefined')
      return
    const max = readCssVarNumber('--max-content-width', 1680)
    const base = readCssVarNumber('--content-gutter', 24)
    gutter.value = resolveContentGutter(window.innerWidth, max, base)
  }
  onMounted(() => {
    updateGutter()
    window.addEventListener('resize', updateGutter)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateGutter)
  })
  return gutter
}
