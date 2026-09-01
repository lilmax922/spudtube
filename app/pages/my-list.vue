<script setup lang="ts">
import type { MonetizationTag, MyList, MyListEntry } from '#server/api/my-list.get'
import type { Kind, Provider } from '#server/tmdb/types'
import type { Filters, KindFilter, MonetizationFilter } from '../components/my-list-filter.vue'
import { AnimatePresence, motion } from 'motion-v'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { definePageMeta, useFetch, useHead, useSeoMeta } from '#imports'
import MyListCard from '../components/my-list-card.vue'
import MyListFilter from '../components/my-list-filter.vue'
import { authClient } from '../lib/auth-client'

definePageMeta({ middleware: 'my-list' })

useSeoMeta({ robots: 'noindex, nofollow' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

type MyListTab = 'watchlist' | 'watched' | 'rated'

const { t, locale } = useI18n()

const { data: session } = await authClient.useSession(useFetch)
const signedIn = computed(() => session.value?.user != null)

const activeTab = ref<MyListTab>('watchlist')

const { data: list, pending, error, refresh: refreshList } = useFetch<MyList>('/api/my-list', {
  query: { language: locale },
  // Only fetch once signed in; the session flipping true re-triggers the fetch.
  immediate: signedIn.value,
  watch: [signedIn, locale],
})

let refreshTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRefresh(): void {
  if (refreshTimer)
    clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    void refreshList()
  }, 3800)
}

function onCardUpdated(): void {
  scheduleRefresh()
}

onBeforeUnmount(() => {
  if (refreshTimer)
    clearTimeout(refreshTimer)
})

const TABS: Array<{ key: MyListTab, label: string }> = [
  { key: 'watchlist', label: t('myList.tabs.watchlist') },
  { key: 'watched', label: t('myList.tabs.watched') },
  { key: 'rated', label: t('myList.tabs.rated') },
]

const activeEntries = computed(() => list.value?.[activeTab.value] ?? [])

const filters = ref<Filters>({
  kind: 'all',
  monetization: 'all',
  providerIds: [],
  sort: 'recent',
})

const availableProviders = computed<Provider[]>(() => {
  const map = new Map<number, Provider>()
  for (const entry of activeEntries.value) {
    for (const provider of entry.providers) {
      if (!map.has(provider.id))
        map.set(provider.id, provider)
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
})

const monetizationCounts = computed(() => {
  const counts: Record<MonetizationTag, number> = {
    subscription: 0,
    buy: 0,
    rent: 0,
    free: 0,
  }
  for (const entry of activeEntries.value) {
    for (const tag of entry.monetization)
      counts[tag] += 1
  }
  return counts
})

const kindCounts = computed(() => {
  const counts: Record<Kind, number> = {
    MOVIE: 0,
    TV_SHOW: 0,
  }
  for (const entry of activeEntries.value) {
    if (entry.kind === 'MOVIE' || entry.kind === 'TV_SHOW')
      counts[entry.kind] += 1
  }
  return counts
})

function entryMatchesKind(entry: MyListEntry, kind: KindFilter): boolean {
  return kind === 'all' || entry.kind === kind
}

function entryMatchesMonetization(entry: MyListEntry, monetization: MonetizationFilter): boolean {
  if (monetization === 'all')
    return true
  return entry.monetization.includes(monetization)
}

function entryMatchesProviders(entry: MyListEntry, providerIds: number[]): boolean {
  if (providerIds.length === 0)
    return true
  const entryProviderIds = new Set(entry.providers.map(provider => provider.id))
  return providerIds.some(id => entryProviderIds.has(id))
}

const filteredEntries = computed<MyListEntry[]>(() => {
  const base = activeEntries.value.filter(entry =>
    entryMatchesKind(entry, filters.value.kind)
    && entryMatchesMonetization(entry, filters.value.monetization)
    && entryMatchesProviders(entry, filters.value.providerIds),
  )
  if (filters.value.sort === 'recent')
    return base
  return [...base].sort((a, b) => (a.title?.name ?? '').localeCompare(b.title?.name ?? ''))
})

const filterCounts = computed(() => ({
  total: activeEntries.value.length,
  byMonetization: monetizationCounts.value,
  byKind: kindCounts.value,
}))

function onFiltersClear(): void {
  filters.value = {
    kind: 'all',
    monetization: 'all',
    providerIds: [],
    sort: filters.value.sort,
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-[var(--max-content-width)] px-[var(--content-gutter)] py-8">
    <h1 class="text-heading-xl text-foreground">
      {{ t('myList.heading') }}
    </h1>

    <div
      role="tablist"
      aria-label="My List"
      class="mt-6 flex gap-1 border-b border-border"
    >
      <button
        v-for="tab in TABS"
        :key="tab.key"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.key"
        class="-mb-px inline-flex h-10 items-center rounded-t-lg border-b-2 px-4 text-button-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        :class="activeTab === tab.key
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      v-if="activeEntries.length > 0"
      class="-mx-[var(--content-gutter)] bg-card px-[var(--content-gutter)] py-3"
    >
      <MyListFilter
        v-model="filters"
        :available-providers="availableProviders"
        :counts="filterCounts"
        @clear="onFiltersClear"
      />
    </div>

    <div v-if="pending && !list" class="py-12 text-center text-body-md text-muted-foreground">
      {{ t('myList.loading') }}
    </div>
    <div v-else-if="error && !list" class="py-12 text-center text-body-md text-muted-foreground">
      {{ t('myList.error') }}
    </div>
    <div
      v-else-if="activeEntries.length === 0"
      class="flex flex-col items-center gap-2 py-12 text-center"
    >
      <p class="text-heading-sm text-foreground">
        {{ t('myList.heading') }}
      </p>
      <p class="text-body-md text-muted-foreground">
        {{ t(`myList.empty.${activeTab}`) }}
      </p>
    </div>
    <div
      v-else-if="filteredEntries.length === 0"
      class="flex flex-col items-center gap-3 py-12 text-center"
    >
      <p class="text-body-sm-strong text-foreground">
        {{ t('myList.filterEmpty') }}
      </p>
      <button
        type="button"
        class="inline-flex h-10 items-center px-4 text-button-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        @click="onFiltersClear"
      >
        {{ t('myList.filter.clear') }}
      </button>
    </div>
    <template v-else>
      <ul
        role="tabpanel"
        class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
      >
        <AnimatePresence mode="popLayout">
          <motion.li
            v-for="entry in filteredEntries"
            :key="`${entry.kind}:${entry.tmdbId}`"
            :initial="{ opacity: 0, y: 12, scale: 0.98 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: -8, scale: 0.98 }"
            :transition="{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }"
            layout
            class="list-none"
          >
            <MyListCard :entry="entry" @updated="onCardUpdated" />
          </motion.li>
        </AnimatePresence>
      </ul>
    </template>
  </div>
</template>
