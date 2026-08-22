<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBrowseGrid } from '../composables/use-browse-grid'
import { useInfiniteScroll } from '../composables/use-infinite-scroll'
import { useKeywordSearch } from '../composables/use-keyword-search'
import GenreChips from './genre-chips.vue'
import KindToggle from './kind-toggle.vue'
import SearchField from './search-field.vue'
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
  query: searchQuery,
  searchedQuery,
  items: searchItems,
  loading: searchLoading,
  loadingMore: searchLoadingMore,
  error: searchError,
  search,
  loadMore: searchLoadMore,
  clear: clearSearch,
} = useKeywordSearch()

const mode = ref<'browse' | 'search'>('browse')

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

void refresh()

function onSubmitSearch(): void {
  if (searchQuery.value.trim() === '') {
    if (mode.value === 'search')
      onClearSearch()
    return
  }
  mode.value = 'search'
  clearGenres()
  void search(searchQuery.value)
}

function onClearSearch(): void {
  searchQuery.value = ''
  clearSearch()
  mode.value = 'browse'
}
</script>

<template>
  <section class="flex flex-col gap-8" :aria-label="mode === 'search' ? t('search.sectionLabel') : t('browse.sectionLabel')">
    <div class="flex flex-wrap items-center gap-x-8 gap-y-4">
      <SearchField
        :query="searchQuery"
        :clearable="mode === 'search'"
        @update:query="searchQuery = $event"
        @search="onSubmitSearch"
        @clear="onClearSearch"
      />
      <template v-if="mode === 'browse'">
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
      </template>
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

    <div
      v-else
      class="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-4"
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
