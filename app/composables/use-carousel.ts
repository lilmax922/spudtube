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

export function getVisibleCount(
  clientWidth: number,
  itemWidth: number,
  gap: number,
  peekWidth: number,
  state: CarouselState,
): number {
  if (clientWidth <= 0 || itemWidth <= 0)
    return 0
  const peekCount = state === 'atMid' ? 2 : state === 'single' ? 0 : 1
  const available = clientWidth - peekCount * peekWidth - (peekCount > 0 ? gap * peekCount : 0)
  const adjustedAvailable = state === 'single' ? clientWidth : available
  const count = Math.floor((adjustedAvailable + gap) / (itemWidth + gap))
  return Math.max(1, count)
}

export function getScrollAmount(
  clientWidth: number,
  itemWidth: number,
  gap: number,
  peekWidth: number,
  state: CarouselState,
): number {
  const visible = getVisibleCount(clientWidth, itemWidth, gap, peekWidth, state)
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
