<script setup lang="ts">
import type { MonetizationTag, MyList, MyListEntry } from '#server/api/my-list.get'
import type { RatingLabel } from '#server/db/schema/rating'
import type { WatchStatus } from '#server/db/schema/title-status'
import type { Kind, Provider } from '#server/tmdb/types'
import type { Filters, KindFilter, MonetizationFilter } from '../components/my-list-filter.vue'
import { AnimatePresence, motion } from 'motion-v'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { $fetch, definePageMeta, useFetch } from '#imports'
import MyListCard from '../components/my-list-card.vue'
import MyListFilter from '../components/my-list-filter.vue'
import { useToast } from '../composables/use-toast'
import { authClient } from '../lib/auth-client'
import { toMediaSegment } from '../lib/kind'

// Only signed-in Users may browse the list; the my-list middleware bounces everyone else home.
definePageMeta({ middleware: 'my-list' })

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

const removedByKey = ref<Map<string, { entry: MyListEntry, tab: MyListTab }>>(new Map())

function entryKey(kind: string, tmdbId: number): string {
  return `${kind}:${tmdbId}`
}

function bumpList(): void {
  if (!list.value)
    return
  list.value = {
    ...list.value,
    watchlist: [...list.value.watchlist],
    watched: [...list.value.watched],
    rated: [...list.value.rated],
  }
}

function findEntryByKey(key: string): { entry: MyListEntry, tab: MyListTab } | null {
  if (!list.value)
    return null
  for (const tab of (['watchlist', 'watched', 'rated'] as MyListTab[])) {
    const found = list.value[tab].find(entry => entryKey(entry.kind, entry.tmdbId) === key)
    if (found)
      return { entry: found, tab }
  }
  const removed = removedByKey.value.get(key)
  if (removed)
    return removed
  return null
}

function applyOptimisticStatusChange(
  key: string,
  previous: WatchStatus | null,
  next: WatchStatus | null,
): void {
  if (!list.value)
    return

  const existing = findEntryByKey(key)

  const removeFromTab = (tab: MyListTab): MyListEntry | undefined => {
    const idx = list.value![tab].findIndex(e => entryKey(e.kind, e.tmdbId) === key)
    if (idx === -1)
      return undefined
    const [removed] = list.value![tab].splice(idx, 1)
    return removed
  }

  const addToTab = (tab: MyListTab, entry: MyListEntry): void => {
    if (list.value![tab].some(e => entryKey(e.kind, e.tmdbId) === key))
      return
    list.value![tab].unshift(entry)
  }

  // Undo / redo case where entry is currently stashed
  const stashed = removedByKey.value.get(key)
  if (!existing && !stashed)
    return

  // If entry is stashed and we are restoring it
  if (stashed && next != null) {
    const updatedEntry: MyListEntry = { ...stashed.entry, status: next }
    if (next === 'WATCHLISTED')
      addToTab('watchlist', updatedEntry)
    else if (next === 'WATCHED')
      addToTab('watched', updatedEntry)
    removedByKey.value.delete(key)
    removedByKey.value = new Map(removedByKey.value)
    bumpList()
    return
  }

  if (!existing)
    return

  const { entry: original } = existing
  const baseEntry: MyListEntry = stashed?.entry ?? original
  const updatedEntry: MyListEntry = { ...baseEntry, status: next }

  if (previous === 'WATCHLISTED')
    removeFromTab('watchlist')
  else if (previous === 'WATCHED')
    removeFromTab('watched')

  if (next === 'WATCHLISTED') {
    addToTab('watchlist', updatedEntry)
    removedByKey.value.delete(key)
  }
  else if (next === 'WATCHED') {
    addToTab('watched', updatedEntry)
    removedByKey.value.delete(key)
  }
  else if (next == null && previous != null) {
    const inRated = list.value!.rated.some(e => entryKey(e.kind, e.tmdbId) === key)
    const stillInStatus = (['watchlist', 'watched'] as MyListTab[]).some(
      tab => list.value![tab].some(e => entryKey(e.kind, e.tmdbId) === key),
    )
    if (!stillInStatus && !inRated) {
      if (!removedByKey.value.has(key))
        removedByKey.value.set(key, { entry: baseEntry, tab: previous === 'WATCHLISTED' ? 'watchlist' : 'watched' })
    }
    else {
      for (const tab of (['watchlist', 'watched', 'rated'] as MyListTab[])) {
        const idx = list.value![tab].findIndex(e => entryKey(e.kind, e.tmdbId) === key)
        if (idx !== -1)
          list.value![tab][idx] = { ...list.value![tab][idx]!, status: next }
      }
      removedByKey.value.delete(key)
    }
  }

  removedByKey.value = new Map(removedByKey.value)
  bumpList()
}

function applyOptimisticRatingChange(
  key: string,
  previous: RatingLabel | null,
  next: RatingLabel | null,
): void {
  if (!list.value)
    return
  const existing = findEntryByKey(key)
  if (!existing)
    return
  const baseEntry = removedByKey.value.get(key)?.entry ?? existing.entry

  if (previous == null && next != null) {
    // Adding rating -> should appear in rated
    if (!list.value.rated.some(e => entryKey(e.kind, e.tmdbId) === key)) {
      list.value.rated.unshift({ ...baseEntry, ratingLabel: next })
    }
    else {
      const idx = list.value.rated.findIndex(e => entryKey(e.kind, e.tmdbId) === key)
      list.value.rated[idx] = { ...list.value.rated[idx]!, ratingLabel: next }
    }
    // Also patch status tabs if entry is there
    for (const tab of (['watchlist', 'watched'] as MyListTab[])) {
      const idx = list.value[tab].findIndex(e => entryKey(e.kind, e.tmdbId) === key)
      if (idx !== -1)
        list.value[tab][idx] = { ...list.value[tab][idx]!, ratingLabel: next }
    }
    removedByKey.value.delete(key)
    removedByKey.value = new Map(removedByKey.value)
    bumpList()
  }
  else if (previous != null && next == null) {
    // Removing rating -> drop from rated if active tab is rated; keep for other tabs
    const idx = list.value.rated.findIndex(e => entryKey(e.kind, e.tmdbId) === key)
    let removedEntry: MyListEntry | undefined
    if (idx !== -1)
      [removedEntry] = list.value.rated.splice(idx, 1)
    // Patch other tabs
    for (const tab of (['watchlist', 'watched'] as MyListTab[])) {
      const j = list.value[tab].findIndex(e => entryKey(e.kind, e.tmdbId) === key)
      if (j !== -1)
        list.value[tab][j] = { ...list.value[tab][j]!, ratingLabel: next }
    }
    const stillInStatusTabs = (['watchlist', 'watched'] as MyListTab[]).some(
      tab => list.value![tab].some(e => entryKey(e.kind, e.tmdbId) === key),
    )
    if (!stillInStatusTabs && removedEntry) {
      // Entry only lived in rated -> stash for undo if needed
      if (!removedByKey.value.has(key))
        removedByKey.value.set(key, { entry: { ...baseEntry, ratingLabel: previous }, tab: 'rated' })
      removedByKey.value = new Map(removedByKey.value)
    }
    bumpList()
  }
  else if (previous != null && next != null) {
    // Switching rating label
    for (const tab of (['watchlist', 'watched', 'rated'] as MyListTab[])) {
      const idx = list.value[tab].findIndex(e => entryKey(e.kind, e.tmdbId) === key)
      if (idx !== -1)
        list.value[tab][idx] = { ...list.value[tab][idx]!, ratingLabel: next }
    }
    bumpList()
  }
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
  const stashed = removedByKey.value.get(key)
  // Current status is null (after removal), we want to go back to `previous`
  // Re-apply optimistic reverse
  applyOptimisticStatusChange(key, null, previous)
  const segment = toMediaSegment(kind)
  const url = `/api/status/${segment}/${tmdbId}`
  try {
    if (previous == null)
      await $fetch(url, { method: 'DELETE' })
    else
      await $fetch(url, { method: 'PUT', body: { status: previous } })
  }
  catch {
    // Roll back optimistic undo on failure
    const afterFailKey = entryKey(kind, tmdbId)
    // Previous was restored, now need to remove again
    applyOptimisticStatusChange(afterFailKey, previous, null)
    // Re-stash if lost
    if (stashed && !removedByKey.value.has(key))
      removedByKey.value = new Map(removedByKey.value.set(key, stashed))
  }
}

function onCardUpdated(payload: { kind: MyListEntry['kind'], tmdbId: number, previous: WatchStatus | RatingLabel | null, next: WatchStatus | RatingLabel | null, type: 'status' | 'rating' }): void {
  const key = entryKey(payload.kind, payload.tmdbId)
  if (payload.type === 'status') {
    const prev = payload.previous as WatchStatus | null
    const nxt = payload.next as WatchStatus | null
    applyOptimisticStatusChange(key, prev, nxt)
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
    applyOptimisticRatingChange(key, payload.previous as RatingLabel | null, payload.next as RatingLabel | null)
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
