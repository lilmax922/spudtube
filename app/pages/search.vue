<script setup lang="ts">
import { LoaderCircle, Search } from '@lucide/vue'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from '#imports'
import TitleCard from '../components/title-card.vue'
import { useInfiniteScroll } from '../composables/use-infinite-scroll'
import { useSearchState } from '../composables/use-search-state'

const { t } = useI18n()
const route = useRoute()
const {
  searchedQuery,
  items,
  loading,
  loadingMore,
  error,
  search,
  loadMore,
  clear,
} = useSearchState()

const queryParam = computed(() => {
  const raw = route.query.q
  return typeof raw === 'string' ? raw.trim() : ''
})

watch(queryParam, (q) => {
  if (q === '') {
    clear()
  }
  else {
    void search(q)
  }
}, { immediate: true })

const sentinel = shallowRef<HTMLElement | null>(null)

useInfiniteScroll(sentinel, () => {
  void loadMore()
})

const emptyMessage = computed(() =>
  searchedQuery.value
    ? t('search.noResults', { query: searchedQuery.value })
    : t('search.noResults', { query: queryParam.value }),
)

const displayQuery = computed(() => searchedQuery.value || queryParam.value)
</script>

<template>
  <div class="mx-auto w-full max-w-[1280px] px-6 pb-10 pt-6">
    <div
      v-if="displayQuery"
      class="mb-6 flex items-center justify-between gap-4 border-b border-border pb-5"
      data-testid="search-header"
    >
      <h1 class="flex items-center gap-2 text-[18px] font-bold tracking-tight text-foreground">
        <Search :size="18" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>{{ t('search.related', { query: displayQuery }) }}</span>
      </h1>
      <span class="shrink-0 text-xs font-medium text-muted-foreground">
        <template v-if="loading && items.length === 0">
          {{ t('search.loading') }}
        </template>
        <template v-else>
          {{ t('search.count', { count: items.length }) }}
        </template>
      </span>
    </div>
    <section class="flex flex-col gap-6" :aria-label="t('search.sectionLabel')">
      <p
        v-if="error && items.length === 0"
        class="rounded-lg bg-card p-8 text-center text-sm text-muted-foreground shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
      >
        {{ t('search.error') }}
      </p>

      <div
        v-else-if="loading && items.length === 0"
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
        v-else-if="items.length === 0"
        class="rounded-lg bg-card p-8 text-center text-sm text-muted-foreground shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
      >
        {{ emptyMessage }}
      </p>

      <div
        v-if="items.length > 0"
        class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 max-[880px]:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] max-[560px]:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]"
        :aria-busy="loading || loadingMore"
      >
        <TitleCard
          v-for="title in items"
          :key="`${title.kind}-${title.tmdbId}`"
          :title="title"
          :show-kind="true"
        />
      </div>

      <div ref="sentinel" aria-hidden="true" />

      <p
        v-if="error && items.length > 0"
        class="text-center text-sm text-muted-foreground"
      >
        {{ t('search.error') }}
      </p>

      <p
        v-if="loadingMore || (loading && items.length > 0)"
        class="flex items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <LoaderCircle :size="16" :stroke-width="1.75" class="animate-spin" aria-hidden="true" />
        {{ t('search.loading') }}
      </p>
    </section>
  </div>
</template>
