<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { AnimatePresence, motion } from 'motion-v'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBrowseGrid } from '../composables/use-browse-grid'
import { useInfiniteScroll } from '../composables/use-infinite-scroll'
import { useSearchState } from '../composables/use-search-state'
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
const {
  mode,
  searchedQuery,
  items: searchItems,
  loading: searchLoading,
  loadingMore: searchLoadingMore,
  error: searchError,
  loadMore: searchLoadMore,
} = useSearchState()

const gridItems = computed(() => (mode.value === 'search' ? searchItems.value : items.value))
const gridLoading = computed(() => (mode.value === 'search' ? searchLoading.value : loading.value))
const gridLoadingMore = computed(() =>
  mode.value === 'search' ? searchLoadingMore.value : loadingMore.value,
)
const gridError = computed(() => (mode.value === 'search' ? searchError.value : error.value))
const showKind = computed(() => mode.value === 'search')
const emptyMessage = computed(() =>
  mode.value === 'search'
    ? t('search.noResults', { query: searchedQuery.value })
    : t('browse.empty'),
)
const loadingMessage = computed(() =>
  mode.value === 'search' ? t('search.loading') : t('browse.loading'),
)

const sentinel = ref<HTMLElement | null>(null)

useInfiniteScroll(sentinel, () => {
  if (mode.value === 'search')
    void searchLoadMore()
  else
    void loadMore()
})

watch(() => searchedQuery.value, (value) => {
  if (value !== '')
    clearGenres()
})

void refresh()
</script>

<template>
  <section class="flex flex-col gap-8" :aria-label="mode === 'search' ? t('search.sectionLabel') : t('browse.sectionLabel')">
    <div v-if="mode === 'browse'" class="flex flex-wrap items-center gap-x-8 gap-y-4">
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
      v-if="gridError && gridItems.length === 0"
      class="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground"
    >
      {{ mode === 'search' ? t('search.error') : t('browse.error') }}
    </p>

    <div
      v-else-if="gridLoading && gridItems.length === 0"
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
      v-else-if="gridItems.length === 0"
      class="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground"
    >
      {{ emptyMessage }}
    </p>

    <AnimatePresence mode="popLayout">
      <motion.div
        v-if="gridItems.length > 0"
        key="results-grid"
        layout
        class="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-4"
        :style="{ position: 'relative' }"
        :aria-busy="gridLoading || gridLoadingMore"
      >
        <motion.div
          v-for="title in gridItems"
          :key="`${title.kind}-${title.tmdbId}`"
          layout
          :initial="{ opacity: 0, scale: 0.92 }"
          :animate="{ opacity: 1, scale: 1 }"
          :exit="{ opacity: 0, scale: 0.92 }"
          :transition="{ duration: 0.18 }"
        >
          <TitleCard :title="title" :show-kind="showKind" />
        </motion.div>
      </motion.div>
    </AnimatePresence>

    <div ref="sentinel" aria-hidden="true" />

    <p
      v-if="gridError && gridItems.length > 0"
      class="text-center text-sm text-muted-foreground"
    >
      {{ mode === 'search' ? t('search.error') : t('browse.error') }}
    </p>

    <p
      v-if="gridLoadingMore || (gridLoading && gridItems.length > 0)"
      class="flex items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <LoaderCircle :size="16" :stroke-width="1.75" class="animate-spin" aria-hidden="true" />
      {{ loadingMessage }}
    </p>
  </section>
</template>
