<script setup lang="ts">
import type { MyList } from '#server/api/my-list.get'
import { Clapperboard } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { definePageMeta, useFetch } from '#imports'
import TitleCard from '../components/title-card.vue'
import { authClient } from '../lib/auth-client'

// Only signed-in Users may browse the list; the my-list middleware bounces everyone else home.
definePageMeta({ middleware: 'my-list' })

type MyListTab = 'watchlist' | 'watched' | 'rated'

const { t, locale } = useI18n()

const { data: session } = await authClient.useSession(useFetch)
const signedIn = computed(() => session.value?.user != null)

const activeTab = ref<MyListTab>('watchlist')

const { data: list, pending, error } = useFetch<MyList>('/api/my-list', {
  query: { language: locale },
  // Only fetch once signed in; the session flipping true re-triggers the fetch.
  immediate: signedIn.value,
  watch: [signedIn, locale],
})

const TABS: Array<{ key: MyListTab, label: string }> = [
  { key: 'watchlist', label: t('myList.tabs.watchlist') },
  { key: 'watched', label: t('myList.tabs.watched') },
  { key: 'rated', label: t('myList.tabs.rated') },
]

const activeEntries = computed(() => list.value?.[activeTab.value] ?? [])
</script>

<template>
  <div class="mx-auto w-full max-w-[var(--max-content-width)] px-[var(--content-gutter)] py-8">
    <h1 class="text-heading-xl font-bold tracking-tight text-foreground">
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

    <div v-if="pending" class="py-12 text-center text-body-md text-muted-foreground">
      {{ t('myList.loading') }}
    </div>
    <div v-else-if="error" class="py-12 text-center text-body-md text-muted-foreground">
      {{ t('myList.error') }}
    </div>
    <div
      v-else-if="activeEntries.length === 0"
      class="flex flex-col items-center gap-2 py-12 text-center"
    >
      <p class="text-body-md font-semibold text-foreground">
        {{ t('myList.heading') }}
      </p>
      <p class="text-body-md text-muted-foreground">
        {{ t(`myList.empty.${activeTab}`) }}
      </p>
    </div>
    <ul
      v-else
      role="tabpanel"
      class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 max-[880px]:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] max-[560px]:grid-cols-[repeat(auto-fill,minmax(152px,1fr))]"
    >
      <li v-for="entry in activeEntries" :key="`${entry.kind}:${entry.tmdbId}`" class="contents">
        <TitleCard v-if="entry.title" :title="entry.title" />
        <div
          v-else
          class="flex aspect-[2/3] flex-col items-center justify-center gap-2 rounded-xl bg-muted p-3 text-center text-muted-foreground shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
        >
          <Clapperboard :size="24" :stroke-width="1.75" aria-hidden="true" />
          <p class="line-clamp-2 text-caption-sm leading-snug">
            {{ t('myList.removed') }}
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>
