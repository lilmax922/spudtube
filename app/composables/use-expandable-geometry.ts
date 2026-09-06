import type { MaybeComputedElementRef } from '@vueuse/core'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { useElementBounding, useWindowSize } from '@vueuse/core'
import { computed, toValue } from 'vue'

export const EXPANDABLE_WIDTH = 540
export const EXPANDABLE_VIEWPORT_MARGIN = 24

// Hover waits for intent before expanding; keyboard focus expands immediately.
export const EXPANDABLE_HOVER_DELAY_MS = 500

// Desktop fine pointers only: mirrors the CSS gates that grow the hovered
// card, so narrower viewports and touch never compute a row glide.
export const EXPANDABLE_MEDIA_QUERY = '(min-width: 881px) and (hover: hover) and (pointer: fine)'

export function matchesExpandableMedia(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
    return false
  return window.matchMedia(EXPANDABLE_MEDIA_QUERY).matches
}

export interface ExpandableShiftInput {
  cardLeft: number
  viewportWidth: number
  expandedWidth?: number
  margin?: number
}

// Push rows grow rightward in flex order, so the expanded right edge lands at
// cardLeft + expandedWidth. The row glides left by exactly the overflow past
// the viewport gutter; zero when the card already fits.
export function resolveExpandableShift(input: ExpandableShiftInput): number {
  const expandedWidth = input.expandedWidth ?? EXPANDABLE_WIDTH
  const margin = input.margin ?? EXPANDABLE_VIEWPORT_MARGIN
  return Math.max(0, Math.round(input.cardLeft + expandedWidth - (input.viewportWidth - margin)))
}

export interface UseExpandableShiftReturn {
  shift: ComputedRef<number>
  refreshShift: () => void
}

export function useExpandableShift(
  target: MaybeComputedElementRef,
  edgeMargin: MaybeRefOrGetter<number> = EXPANDABLE_VIEWPORT_MARGIN,
): UseExpandableShiftReturn {
  // The rect only matters at interaction time: skip window-scroll tracking
  // (Embla drags never fire it; page scroll never moves cards horizontally)
  // and take a fresh read on hover/focus instead. Resize stays reactive.
  const { left, update } = useElementBounding(target, { windowScroll: false, windowResize: true })
  const { width: viewportWidth } = useWindowSize()

  const shift = computed(() => resolveExpandableShift({
    cardLeft: left.value,
    viewportWidth: viewportWidth.value,
    margin: toValue(edgeMargin),
  }))

  return {
    shift,
    refreshShift: () => update(),
  }
}
