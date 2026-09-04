<script setup lang="ts">
import type { TitleSummary } from '#server/tmdb/types'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CarouselItem } from '@/components/ui/carousel'
import SectionHeader from './section-header.vue'
import TitleCard from './title-card.vue'
import TitleCarousel from './title-carousel.vue'

interface Props {
  title: string
  items: TitleSummary[]
  ariaLabel?: string
  showSeeMore?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  ariaLabel: undefined,
  showSeeMore: true,
})

const emit = defineEmits<{ seeMore: [] }>()

const displayItems = computed(() => props.items)

const gutter = ref(24)

function getCssVarNumber(name: string, fallback: number): number {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

function updateGutter(): void {
  if (typeof window === 'undefined')
    return
  const vw = window.innerWidth
  const max = getCssVarNumber('--max-content-width', 1680)
  const base = getCssVarNumber('--content-gutter', 24)
  gutter.value = Math.max(base, (vw - max) / 2 + base)
}

onMounted(() => {
  updateGutter()
  window.addEventListener('resize', updateGutter)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateGutter)
})
</script>

<template>
  <section class="title-carousel-section relative z-[1] hover:z-[20]">
    <SectionHeader
      :title="title"
      :show-see-more="props.showSeeMore && displayItems.length > 0"
      @see-more="emit('seeMore')"
    />

    <TitleCarousel :aria-label="ariaLabel ?? title" :breakout="true" :padding-left="gutter">
      <CarouselItem
        v-for="(item, idx) in displayItems"
        :key="`${item.kind}-${item.tmdbId}-${idx}`"
        class="pl-0 basis-auto w-[180px] shrink-0 snap-start max-[880px]:w-[168px] max-[560px]:w-[152px]"
      >
        <TitleCard :title="item" />
      </CarouselItem>
    </TitleCarousel>
  </section>
</template>

<style scoped>
.title-carousel-section :deep(.title-carousel-viewport) {
  z-index: 1;
}
.title-carousel-section:hover :deep(.title-carousel-viewport) {
  z-index: 5;
}
</style>
