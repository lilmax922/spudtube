<script setup lang="ts">
import type { MyList, MyListEntry } from '#server/api/my-list.get'
import { Clapperboard } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { definePageMeta, useFetch } from '#imports'
import { authClient } from '../lib/auth-client'
import { toMediaSegment } from '../lib/kind'
import { posterUrl } from '../lib/tmdb-image'

// Only signed-in Users may browse the list; the my-list middleware bounces everyone else home.
definePageMeta({ middleware: 'my-list' })

type MyListTab = 'watchlist' | 'watched' | 'rated'

const { t } = useI18n()

const { data: session } = await authClient.useSession(useFetch)
const signedIn = computed(() => session.value?.user != null)

const activeTab = ref<MyListTab>('watchlist')

const { data: list, pending, error } = useFetch<MyList>('/api/my-list', {
  // Only fetch once signed in; the session flipping true re-triggers the fetch.
  immediate: signedIn.value,
  watch: [signedIn],
})

const TABS: Array<{ key: MyListTab, label: string }> = [
  { key: 'watchlist', label: t('myList.tabs.watchlist') },
  { key: 'watched', label: t('myList.tabs.watched') },
  { key: 'rated', label: t('myList.tabs.rated') },
]

const activeEntries = computed(() => list.value?.[activeTab.value] ?? [])

function entryPath(entry: MyListEntry): string {
  return `/${toMediaSegment(entry.kind)}/${entry.tmdbId}`
}
</script>

<template>
  <div class="mx-auto w-full max-w-[1280px] px-6 py-8">
    <h1 class="text-2xl font-bold tracking-tight text-foreground">
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
        class="-mb-px inline-flex h-10 items-center rounded-t-lg border-b-2 px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        :class="activeTab === tab.key
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="pending" class="py-12 text-center text-sm text-muted-foreground">
      {{ t('myList.loading') }}
    </div>
    <div v-else-if="error" class="py-12 text-center text-sm text-muted-foreground">
      {{ t('myList.error') }}
    </div>
    <p
      v-else-if="activeEntries.length === 0"
      class="py-12 text-center text-sm text-muted-foreground"
    >
      {{ t(`myList.empty.${activeTab}`) }}
    </p>
    <ul v-else role="tabpanel" class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <li v-for="entry in activeEntries" :key="`${entry.kind}:${entry.tmdbId}`">
        <NuxtLink
          v-if="entry.title"
          :to="entryPath(entry)"
          class="group flex items-center gap-4 rounded-lg bg-card p-3 shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        >
          <div class="h-20 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
            <img
              v-if="entry.title.posterPath"
              :src="posterUrl(entry.title.posterPath, 'w185')"
              :alt="entry.title.name"
              loading="lazy"
              class="h-full w-full object-cover"
            >
            <div
              v-else
              class="flex h-full w-full items-center justify-center"
            >
              <Clapperboard :size="20" :stroke-width="1.75" class="text-muted-foreground" aria-hidden="true" />
            </div>
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-foreground">
              {{ entry.title.name }}
            </p>
            <p class="mt-0.5 text-xs text-muted-foreground">
              {{ entry.title.releaseDate?.slice(0, 4) ?? t(`detail.kind.${toMediaSegment(entry.kind)}`) }}
            </p>
          </div>
        </NuxtLink>
        <div
          v-else
          class="flex items-center gap-4 rounded-lg border border-dashed border-border bg-card p-3 opacity-70 shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
        >
          <div class="flex h-20 w-14 shrink-0 items-center justify-center rounded-md bg-muted">
            <Clapperboard :size="20" :stroke-width="1.75" class="text-muted-foreground" aria-hidden="true" />
          </div>
          <p class="text-sm text-muted-foreground">
            {{ t('myList.removed') }}
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>
