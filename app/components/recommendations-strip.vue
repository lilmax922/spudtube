<script setup lang="ts">
import type { TitleSummary } from '#server/tmdb/types'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CarouselItem } from '@/components/ui/carousel'
import TitleCard from './title-card.vue'
import TitleCarousel from './title-carousel.vue'

interface Props {
  titles: TitleSummary[]
}
const props = defineProps<Props>()

const { t } = useI18n()

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
  <section v-if="props.titles.length > 0" class="recommendations-strip relative z-[1] mt-8 border-t border-border pt-8 hover:z-[20]">
    <div class="mx-auto flex w-full max-w-[var(--max-content-width)] items-baseline gap-3.5 px-[var(--content-gutter)] pb-3">
      <h2 class="text-heading-lg text-foreground">
        {{ t('detail.recommendations') }}
      </h2>
    </div>

    <TitleCarousel :aria-label="t('detail.recommendations')" :breakout="true" :padding-left="gutter">
      <CarouselItem
        v-for="title in props.titles"
        :key="`${title.kind}-${title.tmdbId}`"
        class="pl-0 basis-auto w-[180px] shrink-0 snap-start max-[880px]:w-[168px] max-[560px]:w-[152px]"
      >
        <TitleCard :title="title" />
      </CarouselItem>
    </TitleCarousel>
  </section>
</template>

<style scoped>
.recommendations-strip :deep(.title-carousel-viewport) {
  z-index: 1;
}
.recommendations-strip:hover :deep(.title-carousel-viewport) {
  z-index: 5;
}
</style>
