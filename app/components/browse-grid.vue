<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBrowseGrid } from '../composables/use-browse-grid'
import { useInfiniteScroll } from '../composables/use-infinite-scroll'
import { useSearchState } from '../composables/use-search-state'
import TitleCard from './title-card.vue'

const { t } = useI18n()
const {
  items,
  loading,
  loadingMore,
  error,
  refresh,
  loadMore,
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
  <section class="flex flex-col gap-6" :aria-label="mode === 'search' ? t('search.sectionLabel') : t('browse.sectionLabel')">
    <p
      v-if="gridError && gridItems.length === 0"
      class="rounded-lg bg-card p-8 text-center text-sm text-muted-foreground shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
    >
      {{ mode === 'search' ? t('search.error') : t('browse.error') }}
    </p>

    <div
      v-else-if="gridLoading && gridItems.length === 0"
      class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 max-[880px]:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] max-[560px]:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]"
      aria-busy="true"
    >
      <div
        v-for="index in 12"
        :key="index"
        class="aspect-[16/9] animate-pulse rounded-lg bg-muted"
      />
    </div>

    <p
      v-else-if="gridItems.length === 0"
      class="rounded-lg bg-card p-8 text-center text-sm text-muted-foreground shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
    >
      {{ emptyMessage }}
    </p>

    <div
      v-if="gridItems.length > 0"
      class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 max-[880px]:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] max-[560px]:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]"
      :aria-busy="gridLoading || gridLoadingMore"
    >
      <TitleCard
        v-for="title in gridItems"
        :key="`${title.kind}-${title.tmdbId}`"
        :title="title"
        :show-kind="showKind"
      />
    </div>

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
