<script setup lang="ts">
import type { TitleSummary } from '#server/tmdb/types'
import { Clapperboard } from '@lucide/vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { posterUrl } from '../lib/images'
import { titleDetailPath } from '../lib/kind'
import PrimeCarousel from './prime-carousel.vue'

interface Props {
  titles: TitleSummary[]
}
const props = defineProps<Props>()

const { t } = useI18n()

const failedIds = ref<Set<number>>(new Set())

function handleError(tmdbId: number): void {
  failedIds.value = new Set([...failedIds.value, tmdbId])
}

function hasPoster(title: TitleSummary): boolean {
  return !!posterUrl(title.posterPath) && !failedIds.value.has(title.tmdbId)
}
</script>

<template>
  <section v-if="props.titles.length > 0">
    <h2 class="text-[16.5px] font-bold tracking-tight text-foreground">
      {{ t('detail.recommendations') }}
    </h2>
    <PrimeCarousel class="mt-4" :aria-label="t('detail.recommendations')">
      <NuxtLink
        v-for="title in props.titles"
        :key="`${title.kind}-${title.tmdbId}`"
        :to="titleDetailPath(title.kind, title.tmdbId)"
        class="group w-[240px] shrink-0 snap-start rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/20 max-[880px]:w-[220px] max-[560px]:w-[168px]"
      >
        <div class="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
          <img
            v-if="hasPoster(title)"
            :src="posterUrl(title.posterPath)!"
            :alt="title.name"
            loading="lazy"
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            @error="handleError(title.tmdbId)"
          >
          <div
            v-else
            class="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-muted-foreground"
          >
            <Clapperboard :size="24" :stroke-width="1.75" aria-hidden="true" />
            <span class="line-clamp-2 text-xs leading-snug">{{ title.name }}</span>
          </div>
        </div>
        <p class="mt-2 truncate text-sm font-medium text-foreground">
          {{ title.name }}
        </p>
      </NuxtLink>
    </PrimeCarousel>
  </section>
</template>
