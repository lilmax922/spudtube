<script setup lang="ts">
import { LoaderCircle, Search as SearchIcon, X } from '@lucide/vue'
import { useDebounceFn } from '@vueuse/core'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { navigateTo, useRoute, useSeoMeta } from '#imports'
import TitleCard from '../components/title-card.vue'
import { useInfiniteScroll } from '../composables/use-infinite-scroll'
import { useSearchState } from '../composables/use-search-state'

useSeoMeta({ robots: 'noindex, nofollow' })

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

const draft = shallowRef(queryParam.value)
watch(queryParam, (q) => {
  draft.value = q
})

const debouncedNavigate = useDebounceFn((value: string) => {
  const trimmed = value.trim()
  const current = queryParam.value
  if (trimmed === current)
    return
  if (trimmed === '') {
    void navigateTo({ path: '/search', query: {} })
  }
  else {
    void navigateTo({ path: '/search', query: { q: trimmed } })
  }
}, 350)

watch(draft, (value) => {
  debouncedNavigate(value)
})

function onSubmit(): void {
  debouncedNavigate.cancel()
  const trimmed = draft.value.trim()
  const current = queryParam.value
  if (trimmed === current) {
    if (trimmed !== '')
      void search(trimmed)
    return
  }
  if (trimmed === '') {
    void navigateTo({ path: '/search', query: {} })
  }
  else {
    void navigateTo({ path: '/search', query: { q: trimmed } })
  }
}

function onClear(): void {
  debouncedNavigate.cancel()
  draft.value = ''
  void navigateTo({ path: '/search', query: {} })
}

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
  <div class="mx-auto w-full max-w-[var(--max-content-width)] px-[var(--content-gutter)] pb-10 pt-6">
    <form
      role="search"
      class="mb-6 flex items-center gap-3 rounded-[12px] border border-input bg-card px-3 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.25)] focus-within:border-ring focus-within:shadow-[0_0_0_2px_color-mix(in_oklab,var(--ring)_20%,transparent)]"
      @submit.prevent="onSubmit"
    >
      <SearchIcon :size="18" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        :value="draft"
        type="search"
        :aria-label="t('search.label')"
        :placeholder="t('search.placeholder')"
        class="h-10 w-full bg-transparent text-body-md text-foreground outline-none placeholder:text-muted-foreground"
        @input="draft = ($event.target as HTMLInputElement).value"
      >
      <button
        v-if="draft !== ''"
        type="button"
        :aria-label="t('search.clear')"
        class="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        @click="onClear"
      >
        <X :size="16" :stroke-width="1.75" aria-hidden="true" />
      </button>
    </form>

    <div
      v-if="displayQuery"
      class="mb-6 flex items-center gap-3 border-b border-border pb-5"
      data-testid="search-header"
    >
      <h1 class="flex items-center gap-2 text-heading-xl font-bold tracking-tight text-foreground">
        <SearchIcon :size="18" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>{{ t('search.related', { query: displayQuery }) }}</span>
      </h1>
      <span class="text-caption-sm font-medium text-muted-foreground">
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
        class="rounded-lg bg-card p-8 text-center text-body-md text-muted-foreground shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
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
        class="rounded-lg bg-card p-8 text-center text-body-md text-muted-foreground shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
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
        class="text-center text-body-md text-muted-foreground"
      >
        {{ t('search.error') }}
      </p>

      <p
        v-if="loadingMore || (loading && items.length > 0)"
        class="flex items-center justify-center gap-2 text-body-md text-muted-foreground"
      >
        <LoaderCircle :size="16" :stroke-width="1.75" class="animate-spin" aria-hidden="true" />
        {{ t('search.loading') }}
      </p>
    </section>
  </div>
</template>
