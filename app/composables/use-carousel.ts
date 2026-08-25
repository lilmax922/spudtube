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
  itemWidth: 240,
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
