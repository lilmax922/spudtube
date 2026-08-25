<script setup lang="ts">
import type { TitleSummary } from '#server/tmdb/types'
import { Clapperboard } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { kindLabelKey, titleDetailPath } from '../lib/kind'
import { posterUrl } from '../lib/tmdb-image'

const props = withDefaults(defineProps<{ title: TitleSummary, showKind?: boolean }>(), {
  showKind: false,
})

const { t } = useI18n()

const imageFailed = ref(false)

const posterSrc = computed(() =>
  props.title.posterPath ? posterUrl(props.title.posterPath) : null,
)

const year = computed(() => props.title.releaseDate?.slice(0, 4) ?? null)
</script>

<template>
  <NuxtLink
    :to="titleDetailPath(title.kind, title.tmdbId)"
    class="group flex flex-col rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/20"
  >
    <div class="relative aspect-[16/9] overflow-hidden rounded-lg bg-muted shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
      <span
        v-if="showKind"
        data-testid="kind-badge"
        class="absolute left-2 top-2 rounded-md bg-background/70 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground backdrop-blur"
      >
        {{ t(kindLabelKey(title.kind)) }}
      </span>
      <img
        v-if="posterSrc && !imageFailed"
        :src="posterSrc"
        :alt="title.name"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        @error="imageFailed = true"
      >
      <div
        v-else
        class="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-muted-foreground"
      >
        <Clapperboard :size="24" :stroke-width="1.75" aria-hidden="true" />
        <span class="line-clamp-3 text-xs leading-snug">{{ title.name }}</span>
      </div>
    </div>
    <h3 class="mt-2 line-clamp-2 text-sm font-medium text-foreground">
      {{ title.name }}
    </h3>
    <p v-if="year" class="mt-0.5 text-xs tabular-nums text-muted-foreground">
      {{ year }}
    </p>
  </NuxtLink>
</template>
