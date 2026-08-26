import type { Ref } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export type CarouselState = 'atStart' | 'atMid' | 'atEnd' | 'single'

export interface CarouselOptions {
  itemWidth?: number
  gap?: number
  peekRatio?: number
  threshold?: number
}

export const CAROUSEL_DEFAULTS: Required<CarouselOptions> = {
  itemWidth: 180,
  gap: 16,
  peekRatio: 0.25,
  threshold: 2,
}

export function calculatePeekWidth(itemWidth: number, peekRatio: number): number {
  return Math.round(itemWidth * peekRatio)
}

export function getCarouselState(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
  threshold: number = CAROUSEL_DEFAULTS.threshold,
): CarouselState {
  if (scrollWidth <= clientWidth + threshold)
    return 'single'
  if (scrollLeft <= threshold)
    return 'atStart'
  if (scrollLeft + clientWidth >= scrollWidth - threshold)
    return 'atEnd'
  return 'atMid'
}

export const BROWSE_CAROUSEL_BREAKPOINTS: Array<{ maxWidth: number, count: number }> = [
  { maxWidth: 447, count: 1 },
  { maxWidth: 679, count: 2 },
  { maxWidth: 879, count: 3 },
  { maxWidth: 1399, count: 4 },
  { maxWidth: 1799, count: 5 },
]

export function getBrowseVisibleCount(viewportWidth: number): number {
  if (viewportWidth <= 0)
    return 1
  for (const bp of BROWSE_CAROUSEL_BREAKPOINTS) {
    if (viewportWidth <= bp.maxWidth)
      return bp.count
  }
  return 6
}

export function getVisibleCount(
  clientWidth: number,
  itemWidth: number,
  gap: number,
  peekWidth: number,
  state: CarouselState,
): number {
  void itemWidth
  void gap
  void peekWidth
  void state
  return getBrowseVisibleCount(clientWidth)
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

export function getScrollAmount(
  clientWidth: number,
  itemWidth: number,
  gap: number,
  peekWidth: number,
  state: CarouselState,
): number {
  void gap
  void peekWidth
  void state
  const visible = getBrowseVisibleCount(clientWidth)
  return visible * (itemWidth + gap)
}

export interface UseCarouselReturn {
  viewportRef: Ref<HTMLElement | null>
  state: Ref<CarouselState>
  peekWidth: Ref<number>
  isAtStart: Readonly<Ref<boolean>>
  isAtEnd: Readonly<Ref<boolean>>
  isAtMid: Readonly<Ref<boolean>>
  scrollBy: (direction: 'prev' | 'next') => void
  refresh: () => void
}

export function useCarousel(options: CarouselOptions = {}): UseCarouselReturn {
  const {
    itemWidth = CAROUSEL_DEFAULTS.itemWidth,
    gap = CAROUSEL_DEFAULTS.gap,
    peekRatio = CAROUSEL_DEFAULTS.peekRatio,
    threshold = CAROUSEL_DEFAULTS.threshold,
  } = options

  const viewportRef = ref<HTMLElement | null>(null)
  const state = ref<CarouselState>('atStart')
  const peekWidth = ref(calculatePeekWidth(itemWidth, peekRatio))

  const isAtStart = computed(() => state.value === 'atStart' || state.value === 'single')
  const isAtEnd = computed(() => state.value === 'atEnd' || state.value === 'single')
  const isAtMid = computed(() => state.value === 'atMid')

  function updateState(): void {
    const el = viewportRef.value
    if (!el) {
      state.value = 'atStart'
      return
    }
    state.value = getCarouselState(el.scrollLeft, el.clientWidth, el.scrollWidth, threshold)
  }

  function scrollBy(direction: 'prev' | 'next'): void {
    const el = viewportRef.value
    if (!el)
      return
    const amount = getScrollAmount(el.clientWidth, itemWidth, gap, peekWidth.value, state.value)
    const delta = direction === 'next' ? amount : -amount
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  function refresh(): void {
    peekWidth.value = calculatePeekWidth(itemWidth, peekRatio)
    updateState()
  }

  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    updateState()
    const el = viewportRef.value
    if (!el)
      return
    el.addEventListener('scroll', updateState, { passive: true })
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateState())
      resizeObserver.observe(el)
    }
    else {
      window.addEventListener('resize', updateState)
    }
  })

  onBeforeUnmount(() => {
    const el = viewportRef.value
    if (el)
      el.removeEventListener('scroll', updateState)
    resizeObserver?.disconnect()
    if (typeof ResizeObserver === 'undefined')
      window.removeEventListener('resize', updateState)
  })

  watch(viewportRef, (next, prev) => {
    if (prev)
      prev.removeEventListener('scroll', updateState)
    if (next)
      next.addEventListener('scroll', updateState, { passive: true })
    updateState()
  })

  return {
    viewportRef,
    state,
    peekWidth,
    isAtStart,
    isAtEnd,
    isAtMid,
    scrollBy,
    refresh,
  }
}
