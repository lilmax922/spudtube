<script setup lang="ts">
import { Clock, Search as SearchIcon, Star, TrendingUp, X } from '@lucide/vue'
import { useDebounceFn } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { navigateTo } from '#imports'
import { useKeywordSearch } from '../composables/use-keyword-search'
import { kindLabelKey, titleDetailPath } from '../lib/kind'
import { posterUrl } from '../lib/tmdb-image'

interface Props {
  query: string
  open: boolean
  clearable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  clearable: false,
})

const emit = defineEmits<{
  'update:query': [value: string]
  'search': []
  'clear': []
  'close': []
}>()

const { t } = useI18n()
const panelRef = shallowRef<HTMLElement | null>(null)
const searchSentinel = shallowRef<HTMLElement | null>(null)
const activeTab = shallowRef<'all' | 'movie' | 'tv'>('all')
const recents = shallowRef<string[]>([])

const TRENDING = [
  'Toy Story 5',
  'Mutiny',
  'Spider-Man: Brand New Day',
  'The Odyssey',
  'Obsession',
  'Insidious: Out of the Further',
  'Minions & Monsters',
  'The End of Oak Street',
]

const overlaySearch = useKeywordSearch()

const debouncedOverlaySearch = useDebounceFn((q: string) => {
  void overlaySearch.search(q)
}, 350)

const STORAGE_KEY = 'spudtube:recent'

function loadRecents(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    recents.value = raw ? (JSON.parse(raw) as string[]) : []
  }
  catch {
    recents.value = []
  }
}

function saveRecents(list: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }
  catch {}
  recents.value = list
}

function addRecent(q: string): void {
  const trimmed = q.trim()
  if (!trimmed)
    return
  const next = [trimmed, ...recents.value.filter(x => x !== trimmed)].slice(0, 5)
  saveRecents(next)
}

function clearRecents(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  }
  catch {}
  recents.value = []
}

function onPickRecent(value: string): void {
  emit('update:query', value)
  activeTab.value = 'all'
  addRecent(value)
}

function onPickTrending(value: string): void {
  emit('update:query', value)
  activeTab.value = 'all'
  addRecent(value)
}

function onResultClick(title: { kind: 'MOVIE' | 'TV_SHOW', name: string }): void {
  addRecent(title.name)
  emit('close')
}

function posterSrc(title: { posterPath: string | null }): string | null {
  return title.posterPath ? posterUrl(title.posterPath) : null
}

function year(title: { releaseDate: string | null }): string {
  return title.releaseDate?.slice(0, 4) ?? '—'
}

function kindLabel(kind: 'MOVIE' | 'TV_SHOW'): string {
  return t(kindLabelKey(kind))
}

const filteredItems = computed(() => {
  const list = overlaySearch.items.value
  if (activeTab.value === 'movie')
    return list.filter(i => i.kind === 'MOVIE')
  if (activeTab.value === 'tv')
    return list.filter(i => i.kind === 'TV_SHOW')
  return list
})

const tabs = computed<Array<{ id: 'all' | 'movie' | 'tv', label: string }>>(() => [
  { id: 'all', label: t('search.tabs.all') },
  { id: 'movie', label: t('search.tabs.movies') },
  { id: 'tv', label: t('search.tabs.tvShows') },
])

let observer: IntersectionObserver | null = null

function setupObserver(): void {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (!searchSentinel.value || props.query.trim() === '')
    return
  observer = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) {
      void overlaySearch.loadMore()
    }
  }, { root: panelRef.value, rootMargin: '160px' })
  observer.observe(searchSentinel.value)
}

watch(() => props.query, (q) => {
  if (q.trim() === '') {
    debouncedOverlaySearch.cancel()
    overlaySearch.clear()
  }
  else {
    debouncedOverlaySearch(q)
  }
  setupObserver()
})

watch(() => overlaySearch.items.value.length, () => {
  setupObserver()
})

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
    loadRecents()
    setupObserver()
  }
  else {
    document.body.style.overflow = ''
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }
})

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open)
    emit('close')
}

function onBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget)
    emit('close')
}

function onInnerSearch(): void {
  const q = props.query.trim()
  if (q) {
    addRecent(q)
    void navigateTo({ path: '/search', query: { q } })
    emit('close')
    return
  }
  emit('search')
}

function onBarButton(): void {
  if (props.query !== '' || props.clearable)
    emit('clear')
  else
    emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  if (props.open)
    loadRecents()
  if (props.query.trim() !== '')
    void overlaySearch.search(props.query)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
  if (observer)
    observer.disconnect()
  debouncedOverlaySearch.cancel()
})

watch(activeTab, () => {
  setupObserver()
})
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[70] flex flex-col items-center overflow-auto bg-background/72 p-4 pt-[72px] backdrop-blur-[12px] backdrop-saturate-[1.2]"
    role="presentation"
    @click="onBackdropClick"
  >
    <div
      ref="panelRef"
      role="dialog"
      aria-modal="true"
      :aria-label="t('search.label')"
      class="searchSheet w-[min(720px,100%)] overflow-hidden rounded-[16px] border border-border bg-popover shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
      @click.stop
    >
      <form
        role="search"
        class="searchBarRow m-3 flex items-center gap-3 rounded-md rounded-[12px] border border-input border-border bg-card px-3 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.15)] focus-within:border-ring focus-within:shadow-[0_0_0_2px_color-mix(in_oklab,var(--ring)_20%,transparent)]"
        @submit.prevent="onInnerSearch"
      >
        <SearchIcon :size="18" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          :value="query"
          type="search"
          :aria-label="t('search.label')"
          :placeholder="t('search.placeholder')"
          class="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
        >
        <button
          type="button"
          :aria-label="(query !== '' || clearable) ? t('search.clear') : t('search.close')"
          class="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          @click="onBarButton"
        >
          <X :size="16" :stroke-width="1.75" aria-hidden="true" />
        </button>
      </form>
      <div class="searchPanel max-h-[62vh] overflow-auto">
        <template v-if="query.trim() === ''">
          <div class="searchSection p-[18px_16px]">
            <h4 class="flex items-center gap-1.5 text-[13px] font-bold text-foreground">
              <Clock :size="14" :stroke-width="1.75" class="text-muted-foreground" aria-hidden="true" />
              {{ t('search.recentSearches') }}
              <button
                v-if="recents.length > 0"
                type="button"
                class="clearAll ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
                @click="clearRecents"
              >
                {{ t('search.clearAll') }}
              </button>
            </h4>
            <div class="mt-3 flex flex-col">
              <template v-if="recents.length > 0">
                <button
                  v-for="item in recents"
                  :key="item"
                  type="button"
                  class="recentItem flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-sm text-foreground hover:bg-muted"
                  :data-q="item"
                  @click="onPickRecent(item)"
                >
                  <Clock :size="16" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
                  {{ item }}
                </button>
              </template>
              <p
                v-else
                class="text-sm text-muted-foreground"
              >
                {{ t('search.noRecent') }}
              </p>
            </div>
          </div>
          <div class="searchSection border-t border-border p-[18px_16px]">
            <h4 class="flex items-center gap-1.5 text-[13px] font-bold text-foreground">
              <TrendingUp :size="14" :stroke-width="1.75" class="text-primary" aria-hidden="true" />
              {{ t('search.trendingSearches') }}
            </h4>
            <div class="trendingChips mt-3 flex flex-wrap gap-2">
              <button
                v-for="trend in TRENDING"
                :key="trend"
                type="button"
                :data-q="trend"
                class="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-muted px-3.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                @click="onPickTrending(trend)"
              >
                <SearchIcon :size="12" :stroke-width="1.75" aria-hidden="true" />
                {{ trend }}
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="searchTabs flex gap-2 border-b border-border p-3">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              :data-tab="tab.id"
              class="inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
              :class="activeTab === tab.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-muted-foreground hover:text-foreground'"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
          <div
            v-if="overlaySearch.loading.value && filteredItems.length === 0"
            class="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
          >
            <Star :size="14" class="animate-spin" aria-hidden="true" />
            {{ t('search.loading') }}
          </div>
          <div
            v-else-if="overlaySearch.error.value && filteredItems.length === 0"
            class="py-8 text-center text-sm text-muted-foreground"
          >
            {{ t('search.error') }}
          </div>
          <div
            v-else-if="filteredItems.length === 0"
            class="py-8 text-center"
          >
            <b class="block text-foreground">{{ t('search.noResultsTitle') }}</b>
            <span class="text-sm text-muted-foreground">{{ t('search.tryDifferent') }}</span>
          </div>
          <div
            v-else
            class="searchResultList flex flex-col"
          >
            <NuxtLink
              v-for="title in filteredItems"
              :key="`${title.kind}-${title.tmdbId}`"
              :to="titleDetailPath(title.kind, title.tmdbId)"
              class="searchResultItem flex items-center gap-4 border-b border-border p-4 last:border-b-0 hover:bg-muted"
              @click="onResultClick(title)"
            >
              <div class="thumb flex h-36 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                <img
                  v-if="posterSrc(title)"
                  :src="posterSrc(title)!"
                  :alt="title.name"
                  loading="lazy"
                  class="h-full w-full object-cover"
                >
                <span
                  v-else
                  class="text-[28px] font-extrabold text-white"
                >{{ title.name.charAt(0) }}</span>
              </div>
              <div class="meta flex min-w-0 flex-1 flex-col gap-1.5">
                <b class="line-clamp-1 flex items-center gap-2 text-[16px] font-bold text-foreground">
                  {{ title.name }}
                  <span class="shrink-0 rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{{ kindLabel(title.kind) }}</span>
                </b>
                <span class="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <span>{{ year(title) }}</span>
                  <span class="size-1 rounded-full bg-border" aria-hidden="true" />
                  <span class="inline-flex items-center gap-1 text-[#facc15]">★ {{ title.voteAverage?.toFixed(1) ?? '—' }}</span>
                  <span class="size-1 rounded-full bg-border" aria-hidden="true" />
                  <span>{{ kindLabel(title.kind) }}</span>
                </span>
              </div>
            </NuxtLink>
            <div
              ref="searchSentinel"
              aria-hidden="true"
              class="flex justify-center py-3"
            >
              <span
                v-if="overlaySearch.loadingMore.value"
                class="size-6 animate-spin rounded-full border-2 border-border border-t-ring"
                aria-label="載入中"
              />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
