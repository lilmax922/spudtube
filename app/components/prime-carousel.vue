<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { usePrimeCarousel } from '../composables/use-prime-carousel'

interface Props {
  ariaLabel?: string
  itemWidth?: number
  gap?: number
  peekRatio?: number
}

const props = withDefaults(defineProps<Props>(), {
  ariaLabel: undefined,
  itemWidth: 240,
  gap: 16,
  peekRatio: 0.25,
})

const {
  viewportRef,
  state,
  peekWidth,
  isAtStart,
  isAtEnd,
  scrollBy,
} = usePrimeCarousel({
  itemWidth: props.itemWidth,
  gap: props.gap,
  peekRatio: props.peekRatio,
})
</script>

<template>
  <div
    class="group/carousel relative"
    :data-carousel-state="state"
    :data-peek-width="peekWidth"
  >
    <div
      ref="viewportRef"
      class="prime-carousel-viewport flex gap-4 overflow-x-auto overflow-y-hidden scroll-smooth pb-4 max-md:pb-2"
      style="scrollbar-width: none; -ms-overflow-style: none; scroll-snap-type: x mandatory;"
      :aria-label="ariaLabel"
      role="region"
      tabindex="0"
      :data-testid="`prime-carousel-viewport-${state}`"
    >
      <slot />
    </div>

    <button
      v-if="!isAtStart"
      type="button"
      class="absolute left-2 top-[68px] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur-md transition-all hover:bg-black/90 hover:scale-[1.04] active:scale-[0.97] group-hover/carousel:flex md:flex shadow-[0_8px_24px_rgba(0,0,0,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 max-md:hidden"
      :aria-label="ariaLabel ? `${ariaLabel} previous` : 'Previous'"
      data-testid="carousel-prev"
      @click="scrollBy('prev')"
    >
      <ChevronLeft :size="20" :stroke-width="1.75" aria-hidden="true" />
    </button>

    <button
      v-if="!isAtEnd"
      type="button"
      class="absolute right-2 top-[68px] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur-md transition-all hover:bg-black/90 hover:scale-[1.04] active:scale-[0.97] group-hover/carousel:flex md:flex shadow-[0_8px_24px_rgba(0,0,0,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 max-md:hidden"
      :aria-label="ariaLabel ? `${ariaLabel} next` : 'Next'"
      data-testid="carousel-next"
      @click="scrollBy('next')"
    >
      <ChevronRight :size="20" :stroke-width="1.75" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.prime-carousel-viewport::-webkit-scrollbar {
  display: none;
}
</style>
