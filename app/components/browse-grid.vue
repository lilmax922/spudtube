<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { AnimatePresence, motion } from 'motion-v'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Skeleton } from '@/components/ui/skeleton'
import { useBrowseGrid } from '../composables/use-browse-grid'
import { useBrowseSections } from '../composables/use-browse-sections'
import { useInfiniteScroll } from '../composables/use-infinite-scroll'
import { useSearchState } from '../composables/use-search-state'
import HomeFilterBar from './home-filter-bar.vue'
import TitleCard from './title-card.vue'
import TitleCarouselSection from './title-carousel-section.vue'

const { t } = useI18n()
const {
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
  sections,
  loading: sectionsLoading,
  refresh: refreshSections,
} = useBrowseSections()
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

interface BrowseRow {
  key: string
  label: string
  items: typeof gridItems.value
}

const rows = computed<BrowseRow[]>(() => {
  if (mode.value !== 'browse')
    return []
  return sections.value.map(section => ({
    key: section.key,
    label: t(section.titleKey),
    items: section.titles,
  }))
})

const isRowsMode = computed(() =>
  isUnfilteredBrowse.value
  && rows.value.length > 0,
)

function handleSeeMore(key: string): void {
  const section = sections.value.find(entry => entry.key === key)
  if (section && section.genres.length > 0) {
    clearFilters()
    if (section.minRating != null)
      setMinRating(section.minRating)
    for (const gid of section.genres)
      toggleGenre(gid)
    return
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
void refreshSections()
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
        v-else-if="(gridLoading || sectionsLoading) && gridItems.length === 0 && rows.length === 0"
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
            class="title-carousel-section relative"
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

      <div v-else-if="gridItems.length === 0 && rows.length === 0" class="mx-auto w-full max-w-[var(--max-content-width)] px-[var(--content-gutter)]">
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
            <TitleCarouselSection
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

      <div
        v-if="gridLoading && gridItems.length > 0"
        data-testid="filter-loading"
        class="pointer-events-none absolute inset-0 z-[5] flex items-start justify-center bg-background/55 pt-24 backdrop-blur-[2px]"
        aria-busy="true"
        aria-live="polite"
      >
        <div class="pointer-events-auto flex items-center gap-2 rounded-full bg-card px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          <LoaderCircle :size="16" :stroke-width="1.75" class="animate-spin text-foreground" aria-hidden="true" />
          <span class="text-body-md text-foreground">{{ loadingMessage }}</span>
        </div>
      </div>

      <div ref="sentinel" aria-hidden="true" />

      <p
        v-if="gridError && gridItems.length > 0"
        class="mx-auto w-full max-w-[var(--max-content-width)] px-[var(--content-gutter)] text-center text-body-md text-muted-foreground"
      >
        {{ mode === 'search' ? t('search.error') : t('browse.error') }}
      </p>

      <p
        v-if="!isRowsMode && (gridLoadingMore || (gridLoading && gridItems.length > 0))"
        class="mx-auto flex w-full max-w-[var(--max-content-width)] items-center justify-center gap-2 px-[var(--content-gutter)] pt-8 text-body-md text-muted-foreground"
      >
        <LoaderCircle :size="16" :stroke-width="1.75" class="animate-spin" aria-hidden="true" />
        {{ loadingMessage }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.browseGridBody {
  position: relative;
  padding-bottom: 64px;
  min-height: 240px;
}
</style>
