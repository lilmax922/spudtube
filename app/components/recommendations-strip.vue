<script setup lang="ts">
import type { TitleSummary } from '#server/tmdb/types'
import { useI18n } from 'vue-i18n'
import { CarouselItem } from '@/components/ui/carousel'
import BrowseCarousel from './browse-carousel.vue'
import TitleCard from './title-card.vue'

interface Props {
  titles: TitleSummary[]
}
const props = defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <section v-if="props.titles.length > 0">
    <h2 class="text-[16.5px] font-bold tracking-tight text-foreground">
      {{ t('detail.recommendations') }}
    </h2>
    <BrowseCarousel class="mt-4" :aria-label="t('detail.recommendations')" :breakout="false">
      <CarouselItem
        v-for="title in props.titles"
        :key="`${title.kind}-${title.tmdbId}`"
        class="pl-0 basis-auto w-[240px] shrink-0 snap-start max-[880px]:w-[220px] max-[560px]:w-[168px]"
      >
        <TitleCard :title="title" />
      </CarouselItem>
    </BrowseCarousel>
  </section>
</template>
