<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBrowseGrid } from '../composables/use-browse-grid'
import { useInfiniteScroll } from '../composables/use-infinite-scroll'
import GenreChips from './genre-chips.vue'
import KindToggle from './kind-toggle.vue'
import TitleCard from './title-card.vue'

const { t } = useI18n()
const {
  kind,
  selectedGenreIds,
  genres,
  items,
  loading,
  loadingMore,
  error,
  refresh,
  loadMore,
  setKind,
  toggleGenre,
  clearGenres,
} = useBrowseGrid()

const sentinel = ref<HTMLElement | null>(null)

useInfiniteScroll(sentinel, () => {
  void loadMore()
})

void refresh()
</script>

<template>
  <section class="flex flex-col gap-8" :aria-label="t('browse.sectionLabel')">
    <div class="flex flex-wrap items-center gap-x-8 gap-y-4">
      <KindToggle :model-value="kind" @update:model-value="setKind" />
      <div v-if="genres.length > 0" class="flex flex-wrap items-center gap-2">
        <GenreChips
          :genres="genres"
          :model-value="selectedGenreIds"
          @toggle="toggleGenre"
        />
      </div>
      <button
        v-if="selectedGenreIds.length > 0"
        type="button"
        class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        @click="clearGenres"
      >
        {{ t('browse.clearAll') }}
      </button>
    </div>

    <p
      v-if="error && items.length === 0"
      class="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground"
    >
      {{ t('browse.error') }}
    </p>

    <div
      v-else-if="loading && items.length === 0"
      class="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-4"
      aria-busy="true"
    >
      <div
        v-for="index in 12"
        :key="index"
        class="aspect-[2/3] animate-pulse rounded-lg bg-muted"
      />
    </div>

    <p
      v-else-if="items.length === 0"
      class="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground"
    >
      {{ t('browse.empty') }}
    </p>

    <div
      v-else
      class="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-4"
      :aria-busy="loadingMore"
    >
      <TitleCard
        v-for="title in items"
        :key="`${title.kind}-${title.tmdbId}`"
        :title="title"
      />
    </div>

    <div ref="sentinel" aria-hidden="true" />

    <p
      v-if="loadingMore"
      class="flex items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <LoaderCircle :size="16" :stroke-width="1.75" class="animate-spin" aria-hidden="true" />
      {{ t('browse.loading') }}
    </p>
  </section>
</template>
