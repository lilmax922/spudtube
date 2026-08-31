<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { AnimatePresence, motion } from 'motion-v'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Skeleton } from '@/components/ui/skeleton'
import { useBrowseGrid } from '../composables/use-browse-grid'
import { useInfiniteScroll } from '../composables/use-infinite-scroll'
import { useSearchState } from '../composables/use-search-state'
import ContentRow from './content-row.vue'
import HomeFilterBar from './home-filter-bar.vue'
import TitleCard from './title-card.vue'

const { t } = useI18n()
const {
  kind,
  selectedGenreIds,
  minRating,
  selectedProviderIds,
  availableProviders,
  popularProviders,
  providerSearchResults,
  providerSearchQuery,
  providerSearchLoading,
  genres,
  items,
  loading,
  loadingMore,
  error,
  refresh,
  loadMore,
  toggleGenre,
  setMinRating,
  toggleProvider,
  clearFilters,
  searchProviders,
  clearProviderSearch,
} = useBrowseGrid()
const safeMinRating = computed(() => (minRating as unknown as { value: number | null } | undefined)?.value ?? null)
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

const isUnfilteredBrowse = computed(() =>
  mode.value === 'browse'
  && selectedGenreIds.value.length === 0
  && safeMinRating.value == null
  && selectedProviderIds.value.length === 0
  && !gridError.value,
)

const isRowsMode = computed(() =>
  isUnfilteredBrowse.value
  && gridItems.value.length > 0,
)

interface BrowseRow {
  key: string
  label: string
  items: typeof gridItems.value
}

const rows = computed<BrowseRow[]>(() => {
  if (!isRowsMode.value)
    return []

  const all = gridItems.value
  if (all.length === 0)
    return []

  const kindLabel = kind.value === 'MOVIE' ? t('browse.kindMovies') : t('browse.kindTvShows')

  const byPopular = [...all]
  const byRating = [...all].sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0))
  const byRecent = [...all].slice().sort((a, b) => {
    const da = a.releaseDate ?? ''
    const db = b.releaseDate ?? ''
    return db.localeCompare(da)
  })

  const freq: Record<number, number> = {}
  for (const item of all) {
    for (const gid of item.genreIds ?? [])
      freq[gid] = (freq[gid] ?? 0) + 1
  }
  const topGenreIds = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => Number(id))

  const genreRows: BrowseRow[] = topGenreIds
    .map((gid) => {
      const genre = genres.value.find(g => g.id === gid)
      const label = genre ? `精選：${genre.name}${kindLabel}` : `精選${kindLabel}`
      const filtered = all.filter(item => (item.genreIds ?? []).includes(gid))
      return { key: `genre-${gid}`, label, items: filtered }
    })
    .filter(row => row.items.length > 0)

  const fallbackGenreRows: BrowseRow[] = genreRows.length > 0
    ? genreRows
    : genres.value.slice(0, 3).map(g => ({
        key: `genre-${g.id}`,
        label: `精選：${g.name}${kindLabel}`,
        items: byPopular.filter(item => (item.genreIds ?? []).includes(g.id)).slice(0, 8) || byPopular.slice(0, 6),
      })).filter(r => r.items.length > 0)

  return [
    { key: 'trending', label: `本週熱門${kindLabel}`, items: byPopular },
    { key: 'top-rated', label: `高評價${kindLabel}`, items: byRating },
    { key: 'recent', label: kind.value === 'MOVIE' ? '現正熱映' : '本季播映中', items: byRecent },
    ...fallbackGenreRows,
  ]
})

function handleSeeMore(key: string): void {
  if (key.startsWith('genre-')) {
    const gid = Number(key.slice(6))
    if (!Number.isNaN(gid)) {
      clearFilters()
      toggleGenre(gid)
      return
    }
  }
  void loadMore()
}

const sentinel = ref<HTMLElement | null>(null)

useInfiniteScroll(sentinel, () => {
  if (isUnfilteredBrowse.value)
    return
  if (mode.value === 'search')
    void searchLoadMore()
  else
    void loadMore()
})

watch(() => searchedQuery.value, (value) => {
  if (value !== '')
    clearFilters()
})

void refresh()
</script>

<template>
  <section class="flex flex-col gap-8" :aria-label="mode === 'search' ? t('search.sectionLabel') : t('browse.sectionLabel')">
    <HomeFilterBar
      v-if="mode === 'browse'"
      :selected-genre-ids="selectedGenreIds"
      :min-rating="minRating"
      :selected-provider-ids="selectedProviderIds"
      :genres="genres"
      :available-providers="availableProviders"
      :popular-providers="popularProviders"
      :provider-search-results="providerSearchResults"
      :provider-search-query="providerSearchQuery"
      :provider-search-loading="providerSearchLoading"
      @toggle-genre="toggleGenre"
      @set-min-rating="setMinRating"
      @toggle-provider="toggleProvider"
      @clear-filters="clearFilters"
      @search-providers="searchProviders"
      @clear-provider-search="clearProviderSearch"
    />

    <div class="browseGridBody">
      <div v-if="gridError && gridItems.length === 0" class="mx-auto w-full max-w-[var(--max-content-width)] px-[var(--content-gutter)]">
        <p class="rounded-lg bg-card p-8 text-center text-body-md text-muted-foreground shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
          {{ mode === 'search' ? t('search.error') : t('browse.error') }}
        </p>
      </div>

      <div
        v-else-if="gridLoading && gridItems.length === 0"
        aria-busy="true"
      >
        <div
          v-if="isUnfilteredBrowse"
          class="rows flex flex-col gap-10 pt-2"
          aria-label="Loading browse rows"
        >
          <div
            v-for="rowIndex in 3"
            :key="rowIndex"
            class="content-row relative"
          >
            <div class="mx-auto flex w-full max-w-[var(--max-content-width)] items-baseline gap-3.5 px-[var(--content-gutter)] pb-3">
              <Skeleton class="h-6 w-32 rounded bg-muted" />
            </div>
            <div class="flex gap-4 overflow-hidden px-[var(--content-gutter)]">
              <Skeleton
                v-for="index in 6"
                :key="index"
                class="aspect-[2/3] w-[180px] shrink-0 rounded-lg bg-card shadow-[0_4px_12px_rgba(0,0,0,0.25)] max-[880px]:w-[168px] max-[560px]:w-[152px]"
              />
            </div>
          </div>
        </div>
        <div
          v-else
          class="mx-auto grid w-full max-w-[var(--max-content-width)] grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 px-[var(--content-gutter)] max-[880px]:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] max-[560px]:grid-cols-[repeat(auto-fill,minmax(152px,1fr))]"
        >
          <Skeleton
            v-for="index in 12"
            :key="index"
            class="aspect-[2/3] rounded-lg bg-card shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
          />
        </div>
      </div>

      <div v-else-if="gridItems.length === 0" class="mx-auto w-full max-w-[var(--max-content-width)] px-[var(--content-gutter)]">
        <p class="rounded-lg bg-card p-8 text-center text-body-md text-muted-foreground shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
          {{ emptyMessage }}
        </p>
      </div>

      <template v-else>
        <AnimatePresence mode="wait">
          <motion.div
            v-if="mode === 'search'"
            key="search-grid"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -8 }"
            :transition="{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }"
            class="mx-auto grid w-full max-w-[var(--max-content-width)] grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 px-[var(--content-gutter)] max-[880px]:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] max-[560px]:grid-cols-[repeat(auto-fill,minmax(152px,1fr))]"
            :aria-busy="gridLoading || gridLoadingMore"
          >
            <AnimatePresence mode="popLayout">
              <motion.div
                v-for="title in gridItems"
                :key="`${title.kind}-${title.tmdbId}`"
                layout
                :initial="{ opacity: 0, y: 12, scale: 0.98 }"
                :animate="{ opacity: 1, y: 0, scale: 1 }"
                :exit="{ opacity: 0, y: -8, scale: 0.98 }"
                :transition="{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }"
              >
                <TitleCard
                  :title="title"
                  :show-kind="showKind"
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <motion.div
            v-else-if="isRowsMode"
            key="rows"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -8 }"
            :transition="{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }"
            class="rows flex flex-col gap-10 pt-2"
          >
            <ContentRow
              v-for="row in rows"
              :key="row.key"
              :title="row.label"
              :items="row.items"
              :aria-label="row.label"
              @see-more="handleSeeMore(row.key)"
            />
          </motion.div>

          <motion.div
            v-else
            key="filtered-grid"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -8 }"
            :transition="{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }"
            class="mx-auto grid w-full max-w-[var(--max-content-width)] grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 px-[var(--content-gutter)] max-[880px]:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] max-[560px]:grid-cols-[repeat(auto-fill,minmax(152px,1fr))]"
            :aria-busy="gridLoading || gridLoadingMore"
          >
            <AnimatePresence mode="popLayout">
              <motion.div
                v-for="title in gridItems"
                :key="`${title.kind}-${title.tmdbId}`"
                layout
                :initial="{ opacity: 0, y: 12, scale: 0.98 }"
                :animate="{ opacity: 1, y: 0, scale: 1 }"
                :exit="{ opacity: 0, y: -8, scale: 0.98 }"
                :transition="{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }"
              >
                <TitleCard
                  :title="title"
                  :show-kind="showKind"
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </template>

      <div ref="sentinel" aria-hidden="true" />

      <p
        v-if="gridError && gridItems.length > 0"
        class="mx-auto w-full max-w-[var(--max-content-width)] px-[var(--content-gutter)] text-center text-body-md text-muted-foreground"
      >
        {{ mode === 'search' ? t('search.error') : t('browse.error') }}
      </p>

      <p
        v-if="!isRowsMode && (gridLoadingMore || (gridLoading && gridItems.length > 0))"
        class="mx-auto flex w-full max-w-[var(--max-content-width)] items-center justify-center gap-2 px-[var(--content-gutter)] text-body-md text-muted-foreground"
      >
        <LoaderCircle :size="16" :stroke-width="1.75" class="animate-spin" aria-hidden="true" />
        {{ loadingMessage }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.browseGridBody {
  padding-bottom: 64px;
}
</style>
