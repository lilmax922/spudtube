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
    <h2 class="text-[16.5px] font-bold tracking-tight text-foreground">
      {{ t('detail.recommendations') }}
    </h2>
    <div class="mt-4 flex gap-4 overflow-x-auto pb-6">
      <NuxtLink
        v-for="title in props.titles"
        :key="`${title.kind}-${title.tmdbId}`"
        :to="titleDetailPath(title.kind, title.tmdbId)"
        class="group w-[168px] shrink-0"
      >
        <div class="aspect-[2/3] w-full overflow-hidden rounded-md bg-muted">
          <img
            v-if="posterUrl(title.posterPath)"
            :src="posterUrl(title.posterPath)!"
            :alt="title.name"
            class="h-full w-full object-cover"
          >
        </div>
        <p class="mt-2 truncate text-sm text-muted-foreground group-hover:text-foreground">
          {{ title.name }}
        </p>
      </NuxtLink>
    </div>
  </section>
</template>
