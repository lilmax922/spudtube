<script setup lang="ts">
import type { CarouselApi } from '@/components/ui/carousel'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed, ref } from 'vue'
import { Carousel, CarouselContent } from '@/components/ui/carousel'
import { calculatePeekWidth, getBrowseVisibleCount } from '../composables/use-carousel'

interface Props {
  ariaLabel?: string
  itemWidth?: number
  gap?: number
  peekRatio?: number
  breakout?: boolean
  paddingLeft?: number
}

const props = withDefaults(defineProps<Props>(), {
  ariaLabel: undefined,
  itemWidth: 240,
  gap: 16,
  peekRatio: 0.25,
  breakout: true,
  paddingLeft: 60,
})

const peekWidth = computed(() => calculatePeekWidth(props.itemWidth, props.peekRatio))

const carouselApi = ref<CarouselApi | undefined>(undefined)
const canScrollPrev = ref(false)
const canScrollNext = ref(false)

type CarouselState = 'atStart' | 'atMid' | 'atEnd' | 'single'

const state = computed<CarouselState>(() => {
  const prev = canScrollPrev.value
  const next = canScrollNext.value
  if (!prev && !next)
    return 'single'
  if (!prev)
    return 'atStart'
  if (!next)
    return 'atEnd'
  return 'atMid'
})

const isAtStart = computed(() => state.value === 'atStart' || state.value === 'single')
const isAtEnd = computed(() => state.value === 'atEnd' || state.value === 'single')

function onInitApi(api: CarouselApi | undefined): void {
  if (!api)
    return
  carouselApi.value = api as unknown as CarouselApi
  const update = (): void => {
    canScrollPrev.value = (api as unknown as { canScrollPrev: () => boolean }).canScrollPrev?.() ?? false
    canScrollNext.value = (api as unknown as { canScrollNext: () => boolean }).canScrollNext?.() ?? false
  }
  update()
  const anyApi = api as unknown as { on: (evt: string, cb: () => void) => void }
  anyApi.on('select', update)
  anyApi.on('reInit', update)
}

function scrollBy(direction: 'prev' | 'next'): void {
  const api = carouselApi.value as unknown as {
    canScrollPrev: () => boolean
    canScrollNext: () => boolean
    selectedScrollSnap: () => number
    scrollSnapList: () => number[]
    scrollTo: (idx: number) => void
    rootNode: () => HTMLElement
    containerNode: () => HTMLElement
  } | undefined
  if (!api)
    return

  let viewportWidth = 0
  try {
    viewportWidth = api.rootNode()?.clientWidth ?? 0
  }
  catch {
    viewportWidth = 0
  }
  if (viewportWidth === 0 && typeof document !== 'undefined') {
    const el = document.querySelector('[data-slot="carousel-content"]') as HTMLElement | null
    viewportWidth = el?.clientWidth ?? 0
  }

  const visible = getBrowseVisibleCount(viewportWidth)
  const step = Math.max(1, visible)

  const snaps = api.scrollSnapList()
  const currentIdx = api.selectedScrollSnap()
  const target = direction === 'next'
    ? Math.min(currentIdx + step, snaps.length - 1)
    : Math.max(currentIdx - step, 0)

  api.scrollTo(target)
}

const carouselOpts = computed(() => ({
  align: 'start' as const,
  containScroll: 'trimSnaps' as const,
  slidesToScroll: 1 as const,
  dragFree: false,
  skipSnaps: false,
}))

const phantomStyle = computed(() => ({
  width: `${props.paddingLeft}px`,
  marginRight: `-${props.gap}px`,
}))

const contentStyle = computed(() => ({
  paddingRight: `${props.paddingLeft}px`,
}))
</script>

<template>
  <div
    class="group/carousel browse-carousel-outer relative"
    :class="breakout ? 'browse-carousel-outer--breakout' : ''"
    :data-carousel-state="state"
    :data-peek-width="peekWidth"
    :data-carousel-padding="paddingLeft"
  >
    <Carousel
      :opts="carouselOpts"
      class="browse-carousel-root"
      :data-carousel-state="state"
      @init-api="onInitApi"
    >
      <CarouselContent
        class="browse-carousel-viewport"
        :style="contentStyle"
        :data-testid="`browse-carousel-viewport-${state}`"
        :aria-label="ariaLabel"
        role="region"
        tabindex="0"
      >
        <div class="carousel-phantom shrink-0" :style="phantomStyle" aria-hidden="true" />
        <slot />
      </CarouselContent>
    </Carousel>

    <button
      v-if="!isAtStart"
      type="button"
      class="absolute inset-y-0 left-0 z-[12] hidden w-12 items-center justify-center bg-gradient-to-r from-black/60 to-transparent text-white opacity-0 transition-opacity duration-200 group-hover/carousel:flex group-hover/carousel:opacity-100 focus-visible:flex focus-visible:opacity-100 focus-visible:outline-none max-[560px]:!hidden"
      :aria-label="ariaLabel ? `${ariaLabel} previous` : 'Previous'"
      data-testid="carousel-prev"
      @click="scrollBy('prev')"
    >
      <ChevronLeft :size="22" :stroke-width="2" aria-hidden="true" class="drop-shadow" />
    </button>

    <button
      v-if="!isAtEnd"
      type="button"
      class="absolute inset-y-0 right-0 z-[12] hidden w-12 items-center justify-center bg-gradient-to-l from-black/60 to-transparent text-white opacity-0 transition-opacity duration-200 group-hover/carousel:flex group-hover/carousel:opacity-100 focus-visible:flex focus-visible:opacity-100 focus-visible:outline-none max-[560px]:!hidden"
      :aria-label="ariaLabel ? `${ariaLabel} next` : 'Next'"
      data-testid="carousel-next"
      @click="scrollBy('next')"
    >
      <ChevronRight :size="22" :stroke-width="2" aria-hidden="true" class="drop-shadow" />
    </button>
  </div>
</template>

<style scoped>
.browse-carousel-outer {
  /* allow hover-card to overflow vertically */
  overflow: visible;
}

.browse-carousel-outer--breakout {
  width: 100vw;
  margin-left: calc(50% - 50vw);
}

.browse-carousel-root {
  overflow: visible;
}

.browse-carousel-viewport {
  /* embla viewport already has overflow-x-hidden overflow-y-visible via CarouselContent */
  /* keep hover trick for legacy browsers but with visible y it's less needed */
  padding-bottom: 300px;
  margin-bottom: -280px;
  -webkit-overflow-scrolling: touch;
}

:deep([data-slot="carousel-content"])::-webkit-scrollbar {
  display: none;
}

:deep([data-slot="carousel-content"]) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
</style>
