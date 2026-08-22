<script setup lang="ts">
import type { TitleSummary } from '#server/tmdb/types'
import { Clapperboard } from '@lucide/vue'
import { computed, ref } from 'vue'
import { posterUrl } from '../lib/tmdb-image'

const props = defineProps<{ title: TitleSummary }>()

const imageFailed = ref(false)

const posterSrc = computed(() =>
  props.title.posterPath ? posterUrl(props.title.posterPath) : null,
)

const year = computed(() => props.title.releaseDate?.slice(0, 4) ?? null)
</script>

<template>
  <article class="group flex flex-col">
    <div class="aspect-[2/3] overflow-hidden rounded-lg bg-muted">
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
    <p v-if="year" class="mt-0.5 text-xs text-muted-foreground">
      {{ year }}
    </p>
  </article>
</template>
