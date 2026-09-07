<script setup lang="ts">
import type { MonetizationTag, MyList, MyListEntry } from '#server/api/my-list.get'
import type { Provider } from '#server/tmdb/types'
import type { Kind } from '#shared/kind/kind'
import type { RatingLabel, WatchStatus } from '#shared/personal-tracking/personal-tracking'
import type { Filters, KindFilter, MonetizationFilter } from '../components/my-list-filter.vue'
import type { PersonalTrackingState } from '../composables/use-personal-tracking'
import { AnimatePresence, motion } from 'motion-v'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { definePageMeta, useFetch, useSeoMeta } from '#imports'
import MyListCard from '../components/my-list-card.vue'
import MyListFilter from '../components/my-list-filter.vue'
import { usePersonalTracking } from '../composables/use-personal-tracking'
import { useToast } from '../composables/use-toast'
import { authClient } from '../lib/auth-client'

definePageMeta({ middleware: 'my-list' })

useSeoMeta({ robots: 'noindex, nofollow' })

type MyListTab = 'watchlist' | 'watched' | 'rated'

const { t, locale } = useI18n()
const { showToast } = useToast()

const { data: session } = await authClient.useSession(useFetch)
const signedIn = computed(() => session.value?.user != null)

const activeTab = ref<MyListTab>('watchlist')

const { data: list, pending, error } = useFetch<MyList>('/api/my-list', {
  query: { language: locale },
  // Only fetch once signed in; the session flipping true re-triggers the fetch.
  immediate: signedIn.value,
  watch: [signedIn, locale],
})

// Full entries removed from every tab, kept only so toast undo can restore them.
const removedEntries = new Map<string, MyListEntry>()

// One tracking instance per title the visitor touches, used only to persist
// undo intents through the same seam as every other mutation. The list itself
// never fetches; it only adjusts its structure from settled module results.
const undoTrackers = new Map<string, PersonalTrackingState>()

function entryKey(kind: string, tmdbId: number): string {
  return `${kind}:${tmdbId}`
}

function undoTrackerFor(kind: MyListEntry['kind'], tmdbId: number): PersonalTrackingState {
  const key = entryKey(kind, tmdbId)
  const existing = undoTrackers.get(key)
  if (existing)
    return existing
  const created = usePersonalTracking(kind, ref(String(tmdbId)), signedIn)
  undoTrackers.set(key, created)
  return created
}

function extractEntry(entries: MyListEntry[], key: string): { rest: MyListEntry[], found?: MyListEntry } {
  const idx = entries.findIndex(entry => entryKey(entry.kind, entry.tmdbId) === key)
  if (idx === -1)
    return { rest: entries }
  return { rest: [...entries.slice(0, idx), ...entries.slice(idx + 1)], found: entries[idx] }
}

function patchEntries(entries: MyListEntry[], key: string, patch: Partial<MyListEntry>): MyListEntry[] {
  return entries.map(entry => entryKey(entry.kind, entry.tmdbId) === key ? { ...entry, ...patch } : entry)
}

function reflectStatusChange(key: string, next: WatchStatus | null): void {
  if (!list.value)
    return
  const pulledWatchlist = extractEntry(list.value.watchlist, key)
  const pulledWatched = extractEntry(list.value.watched, key)
  let rated = list.value.rated
  const base = pulledWatchlist.found ?? pulledWatched.found ?? removedEntries.get(key)
    ?? rated.find(entry => entryKey(entry.kind, entry.tmdbId) === key)
  removedEntries.delete(key)
  if (next == null) {
    const ratedIdx = rated.findIndex(entry => entryKey(entry.kind, entry.tmdbId) === key)
    if (ratedIdx !== -1)
      rated = patchEntries(rated, key, { status: null })
    else if (base)
      removedEntries.set(key, { ...base, status: null })
    list.value = { ...list.value, watchlist: pulledWatchlist.rest, watched: pulledWatched.rest, rated }
    return
  }
  if (!base)
    return
  const updated: MyListEntry = { ...base, status: next }
  let watchlist = pulledWatchlist.rest
  let watched = pulledWatched.rest
  if (next === 'WATCHLISTED')
    watchlist = [updated, ...watchlist]
  else
    watched = [updated, ...watched]
  if (rated.some(entry => entryKey(entry.kind, entry.tmdbId) === key))
    rated = patchEntries(rated, key, { status: next })
  list.value = { ...list.value, watchlist, watched, rated }
}

function reflectRatingChange(key: string, next: RatingLabel | null): void {
  if (!list.value)
    return
  let { watchlist, watched, rated } = list.value
  watchlist = patchEntries(watchlist, key, { ratingLabel: next })
  watched = patchEntries(watched, key, { ratingLabel: next })
  const ratedIdx = rated.findIndex(entry => entryKey(entry.kind, entry.tmdbId) === key)
  if (next != null) {
    if (ratedIdx !== -1) {
      rated = patchEntries(rated, key, { ratingLabel: next })
    }
    else {
      const base = watchlist.find(entry => entryKey(entry.kind, entry.tmdbId) === key)
        ?? watched.find(entry => entryKey(entry.kind, entry.tmdbId) === key)
        ?? removedEntries.get(key)
      if (base)
        rated = [{ ...base, ratingLabel: next }, ...rated]
    }
  }
  else if (ratedIdx !== -1) {
    rated = extractEntry(rated, key).rest
  }
  list.value = { ...list.value, watchlist, watched, rated }
}

function statusToastMessage(next: WatchStatus | null, target: WatchStatus): string {
  if (target === 'WATCHLISTED')
    return next ? t('watchStatus.toast.watchlistAdded') : t('watchStatus.toast.watchlistRemoved')
  return next ? t('watchStatus.toast.watchedAdded') : t('watchStatus.toast.watchedRemoved')
}

function resolveStatusTarget(previous: WatchStatus | null, next: WatchStatus | null): WatchStatus {
  // When toggling off, next is null, target is the status being removed (previous)
  // When toggling on, next is the target itself
  if (next != null)
    return next
  return previous ?? 'WATCHLISTED'
}

async function revertStatusFromPage(
  kind: MyListEntry['kind'],
  tmdbId: number,
  previous: WatchStatus | null,
): Promise<void> {
  const key = entryKey(kind, tmdbId)
  const tracker = undoTrackerFor(kind, tmdbId)
  // The undo intent persists through the same seam as every other mutation,
  // so a failed undo reverts inside the module and the list keeps matching it.
  if (previous == null)
    await tracker.clear('status')
  else
    await tracker.setStatus(previous)
  reflectStatusChange(key, tracker.state.value.status)
}

function onCardUpdated(payload: { kind: MyListEntry['kind'], tmdbId: number, previous: WatchStatus | RatingLabel | null, next: WatchStatus | RatingLabel | null, type: 'status' | 'rating' }): void {
  const key = entryKey(payload.kind, payload.tmdbId)
  if (payload.type === 'status') {
    const prev = payload.previous as WatchStatus | null
    const nxt = payload.next as WatchStatus | null
    // The card already settled the mutation through the shared module; the
    // page only adjusts its own list structure from that settled result.
    reflectStatusChange(key, nxt)
    const target = resolveStatusTarget(prev, nxt)
    showToast({
      message: statusToastMessage(nxt, target),
      actionLabel: t('watchStatus.toast.undo'),
      onAction: () => {
        void revertStatusFromPage(payload.kind, payload.tmdbId, prev)
      },
    })
  }
  else {
    reflectRatingChange(key, payload.next as RatingLabel | null)
  }
}

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
