<script setup lang="ts">
import type { CarouselApi } from '@/components/ui/carousel'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { Carousel, CarouselContent } from '@/components/ui/carousel'
import { calculatePeekWidth, getBrowseVisibleCount, getMidSnapShift } from '../composables/use-carousel'

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
  itemWidth: 180,
  gap: 16,
  peekRatio: 0.25,
  breakout: true,
  paddingLeft: 60,
})

const peekWidth = computed(() => calculatePeekWidth(props.itemWidth, props.peekRatio))

const outerRef = shallowRef<HTMLElement | null>(null)
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

const viewportWidth = ref(typeof window === 'undefined' ? 1920 : window.innerWidth)
const visibleCount = computed(() => getBrowseVisibleCount(viewportWidth.value))

function measureItemWidth(): number {
  const el = outerRef.value?.querySelector('[data-slot="carousel-item"]')
  const w = el?.getBoundingClientRect().width ?? 0
  return w > 0 ? w : props.itemWidth
}

// Group snaps are item-offset aligned; getMidSnapShift shifts them by a constant
// so mid-scroll positions clip both edge items symmetrically (~peekRatio).
// Start/end snaps are re-clamped to the scroll bounds by containScroll:'trimSnaps'.
const carouselOpts = {
  align: (viewSize: number) => getMidSnapShift(viewSize, measureItemWidth(), props.gap, props.peekRatio),
  containScroll: 'trimSnaps' as const,
  slidesToScroll: visibleCount.value,
  dragFree: false,
  skipSnaps: false,
}

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
    scrollPrev: () => void
    scrollNext: () => void
  } | undefined
  if (!api)
    return
  if (direction === 'next')
    api.scrollNext()
  else
    api.scrollPrev()
}

function onWindowResize(): void {
  viewportWidth.value = window.innerWidth
}

// slidesToScroll / gutter feed Embla measurements; re-init after Vue patches styles.
watch([visibleCount, () => props.paddingLeft], async () => {
  await nextTick()
  const api = carouselApi.value as unknown as { reInit: (opts: Record<string, unknown>) => void } | undefined
  api?.reInit({ slidesToScroll: visibleCount.value })
})

onMounted(() => {
  window.addEventListener('resize', onWindowResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
})

const contentStyle = computed(() => ({
  paddingLeft: `${props.paddingLeft}px`,
}))

const outerStyle = computed(() => ({
  '--browse-gutter': `${props.paddingLeft}px`,
}))
</script>

<template>
  <div
    ref="outerRef"
    class="group/carousel browse-carousel-outer relative"
    :class="breakout ? 'browse-carousel-outer--breakout' : ''"
    :style="outerStyle"
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

/* Trailing gutter: Embla reads the last slide's margin-right as endGap,
   so the atEnd snap parks the last item one gutter short of the right edge. */
.browse-carousel-outer :deep([data-slot="carousel-content"] > div > [data-slot="carousel-item"]:last-child) {
  margin-right: var(--browse-gutter);
}

:deep([data-slot="carousel-content"])::-webkit-scrollbar {
  display: none;
}

:deep([data-slot="carousel-content"]) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
</style>
