import type { MaybeComputedElementRef } from '@vueuse/core'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { useElementBounding, useWindowSize } from '@vueuse/core'
import { computed, toValue } from 'vue'

export const EXPANDABLE_REST_WIDTH = 180
export const EXPANDABLE_WIDTH = 540
export const EXPANDABLE_VIEWPORT_MARGIN = 24

export type ExpandDirection = 'left' | 'right'

export interface ExpandableGeometryInput {
  cardLeft: number
  cardWidth: number
  viewportWidth: number
  expandedWidth?: number
  margin?: number
}

export interface ExpandableGeometry {
  direction: ExpandDirection
  panelLeft: number
}

export function resolveExpandableGeometry(input: ExpandableGeometryInput): ExpandableGeometry {
  const expandedWidth = input.expandedWidth ?? EXPANDABLE_WIDTH
  const margin = input.margin ?? EXPANDABLE_VIEWPORT_MARGIN
  const cardWidth = input.cardWidth > 0 ? input.cardWidth : EXPANDABLE_REST_WIDTH
  const center = input.cardLeft + cardWidth / 2
  if (center < input.viewportWidth / 2) {
    const shift = Math.max(0, input.cardLeft + expandedWidth - (input.viewportWidth - margin))
    // Never -0: negating zero poisons style bindings and equality checks.
    return { direction: 'right', panelLeft: shift === 0 ? 0 : Math.round(-shift) }
  }
  const idealLeft = input.cardLeft + cardWidth - expandedWidth
  const shift = Math.max(0, margin - idealLeft)
  return { direction: 'left', panelLeft: Math.round(cardWidth - expandedWidth + shift) }
}

export interface UseExpandableGeometryReturn {
  direction: ComputedRef<ExpandDirection>
  panelLeft: ComputedRef<number>
  refreshGeometry: () => void
}

export function useExpandableGeometry(
  target: MaybeComputedElementRef,
  edgeMargin: MaybeRefOrGetter<number> = EXPANDABLE_VIEWPORT_MARGIN,
): UseExpandableGeometryReturn {
  // The rect only matters at interaction time: skip window-scroll tracking
  // (Embla drags never fire it; page scroll never moves cards horizontally)
  // and take a fresh read on hover/focus instead. Resize stays reactive.
  const { left, width, update } = useElementBounding(target, { windowScroll: false, windowResize: true })
  const { width: viewportWidth } = useWindowSize()

  const geometry = computed<ExpandableGeometry>(() => resolveExpandableGeometry({
    cardLeft: left.value,
    cardWidth: width.value,
    viewportWidth: viewportWidth.value,
    margin: toValue(edgeMargin),
  }))

  return {
    direction: computed(() => geometry.value.direction),
    panelLeft: computed(() => geometry.value.panelLeft),
    refreshGeometry: () => update(),
  }
}
