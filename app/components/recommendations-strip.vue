<script setup lang="ts">
import type { TitleSummary } from '#server/tmdb/types'
import { useI18n } from 'vue-i18n'
import { posterUrl } from '../lib/images'
import { titleDetailPath } from '../lib/kind'

interface Props {
  titles: TitleSummary[]
}
const props = defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <section v-if="props.titles.length > 0">
    <h2 class="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">
      {{ t('detail.recommendations') }}
      <span class="text-[11px] font-medium normal-case tracking-normal text-muted-foreground">You May Also Like</span>
    </h2>
    <div class="flex gap-4 overflow-x-auto pb-6">
      <NuxtLink
        v-for="title in props.titles"
        :key="`${title.kind}-${title.tmdbId}`"
        :to="titleDetailPath(title.kind, title.tmdbId)"
        class="group w-[168px] shrink-0 rounded-[var(--radius)] outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
      >
        <div class="aspect-[2/3] w-full overflow-hidden rounded-[var(--radius)] bg-muted shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
          <img
            v-if="posterUrl(title.posterPath)"
            :src="posterUrl(title.posterPath)!"
            :alt="title.name"
            class="h-full w-full object-cover"
          >
        </div>
        <p class="mt-2 truncate text-sm font-normal leading-[1.7] text-muted-foreground group-hover:text-foreground">
          {{ title.name }}
        </p>
      </NuxtLink>
    </div>
  </section>
</template>
