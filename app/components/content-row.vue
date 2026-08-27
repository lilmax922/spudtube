<script setup lang="ts">
import type { TitleSummary } from '#server/tmdb/types'
import { ChevronRight } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CarouselItem } from '@/components/ui/carousel'
import BrowseCarousel from './browse-carousel.vue'
import TitleCard from './title-card.vue'

interface Props {
  title: string
  items: TitleSummary[]
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  ariaLabel: undefined,
})

const emit = defineEmits<{ seeMore: [] }>()

const displayItems = computed(() => props.items)

const gutter = ref(24)

function updateGutter(): void {
  if (typeof window === 'undefined')
    return
  const vw = window.innerWidth
  gutter.value = Math.max(24, (vw - 1280) / 2 + 24)
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
  <section class="content-row relative z-[1] hover:z-[20]">
    <div class="mx-auto flex w-full max-w-[1280px] items-baseline gap-3.5 px-6 pb-3">
      <h3 class="text-[16.5px] font-bold tracking-tight text-foreground">
        {{ title }}
      </h3>
      <button
        v-if="displayItems.length > 0"
        type="button"
        class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        :aria-label="`查看更多 ${title}`"
        @click="emit('seeMore')"
      >
        See more
        <ChevronRight :size="14" :stroke-width="2.2" aria-hidden="true" class="opacity-90" />
      </button>
    </div>

    <BrowseCarousel :aria-label="ariaLabel ?? title" :breakout="true" :padding-left="gutter">
      <CarouselItem
        v-for="(item, idx) in displayItems"
        :key="`${item.kind}-${item.tmdbId}-${idx}`"
        class="pl-0 basis-auto w-[180px] shrink-0 snap-start max-[880px]:w-[168px] max-[560px]:w-[152px]"
      >
        <TitleCard :title="item" />
      </CarouselItem>
    </BrowseCarousel>
  </section>
</template>

<style scoped>
.content-row :deep(.browse-carousel-viewport) {
  z-index: 1;
}
.content-row:hover :deep(.browse-carousel-viewport) {
  z-index: 5;
}
</style>
