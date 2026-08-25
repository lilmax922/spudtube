<script setup lang="ts">
import type { TitleSummary } from '#server/tmdb/types'
import { useI18n } from 'vue-i18n'
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
      <TitleCard
        v-for="title in props.titles"
        :key="`${title.kind}-${title.tmdbId}`"
        :title="title"
        class="w-[240px] shrink-0 snap-start max-[880px]:w-[220px] max-[560px]:w-[168px]"
      />
    </BrowseCarousel>
  </section>
</template>
