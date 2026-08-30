<script setup lang="ts">
import type { Genre, Provider } from '#server/tmdb/types'
import { Search, X } from '@lucide/vue'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { providerLogoSrcSet, providerLogoUrl } from '../lib/images'
import GenreChips from './genre-chips.vue'

interface Props {
  selectedGenreIds: number[]
  minRating: number | null
  selectedProviderIds: number[]
  genres: Genre[]
  availableProviders: Provider[]
  popularProviders?: Provider[]
  providerSearchResults?: Provider[]
  providerSearchQuery?: string
  providerSearchLoading?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  popularProviders: undefined,
  providerSearchResults: undefined,
  providerSearchQuery: '',
  providerSearchLoading: false,
})

const emit = defineEmits<{
  toggleGenre: [genreId: number]
  setMinRating: [rating: number | null]
  toggleProvider: [providerId: number]
  clearFilters: []
  searchProviders: [query: string]
  clearProviderSearch: []
}>()

const { t } = useI18n()

const open = ref(false)
const providerSearchInputRef = ref<HTMLInputElement | null>(null)
const providerSearchText = ref('')

interface RatingOption {
  value: number | null
  label: string
  symbol?: string
}

const RATING_OPTIONS: RatingOption[] = [
  { value: null, label: t('browse.ratingAll') },
  { value: 7, label: t('browse.ratingHigh'), symbol: '★' },
  { value: 8, label: t('browse.ratingTop'), symbol: '★' },
]

function onRatingClick(rating: number | null): void {
  const next = props.minRating === rating ? null : rating
  emit('setMinRating', next)
}

function toggleProvider(id: number): void {
  emit('toggleProvider', id)
}

const isFiltered = computed(() =>
  props.selectedGenreIds.length > 0
  || props.minRating != null
  || props.selectedProviderIds.length > 0,
)

function onOpenUpdate(value: boolean): void {
  open.value = value
}

function focusSearchInput(): void {
  nextTick(() => {
    providerSearchInputRef.value?.focus()
  })
}

function ensurePopoverVisible(): void {
  if (typeof window === 'undefined')
    return
  requestAnimationFrame(() => {
    const popover = (document.querySelector('[data-testid="home-filter-bar-detail"]')
      ?? document.querySelector('[data-slot="popover-content"]')) as HTMLElement | null
    const bar = document.querySelector('.homeFilterBar') as HTMLElement | null
    if (!popover || !bar)
      return
    const popRect = popover.getBoundingClientRect()
    const margin = 16
    const headerH = Number.parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
      10,
    ) || 64
    const isClipped = popRect.bottom > window.innerHeight - margin || popRect.top < headerH
    if (!isClipped)
      return
    const barTop = bar.getBoundingClientRect().top + window.scrollY
    const heroHideY = Math.max(0, barTop - headerH)
    if (window.scrollY < heroHideY) {
      const neededToFitBottom = window.scrollY + (popRect.bottom - window.innerHeight + margin)
      const targetY = Math.max(heroHideY, neededToFitBottom)
      window.scrollTo({ top: targetY, behavior: 'smooth' })
      return
    }
    if (popRect.bottom > window.innerHeight - margin) {
      const targetY = window.scrollY + (popRect.bottom - window.innerHeight + margin)
      window.scrollTo({ top: targetY, behavior: 'smooth' })
    }
  })
}

const clusterProviders = computed(() => {
  const source = props.popularProviders?.length ? props.popularProviders : props.availableProviders
  return source.slice(0, 5)
})

const isSearching = computed(() => providerSearchText.value.trim().length > 0)

const displayedProviders = computed<Provider[]>(() => {
  if (isSearching.value)
    return props.providerSearchResults ?? []
  return props.popularProviders?.length ? props.popularProviders : props.availableProviders
})

const providerSectionLabel = computed(() =>
  isSearching.value ? t('browse.providersSearchResults') : t('browse.providersPopular'),
)

function onProviderSearchInput(): void {
  emit('searchProviders', providerSearchText.value)
}

function clearProviderSearchInput(): void {
  providerSearchText.value = ''
  emit('clearProviderSearch')
  nextTick(() => providerSearchInputRef.value?.focus())
}

watch(open, (value) => {
  if (value) {
    focusSearchInput()
    ensurePopoverVisible()
  }
  else {
    providerSearchText.value = ''
    emit('clearProviderSearch')
  }
})

watch(() => props.providerSearchQuery, (value) => {
  // keep local input in sync if parent drives query (e.g. locale reset)
  if (value === '' && providerSearchText.value !== '')
    providerSearchText.value = ''
})
</script>

<template>
  <section
    class="homeFilterBar"
    :aria-label="t('browse.sectionLabel')"
  >
    <div class="homeFilterBarInner">
      <div
        class="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-card p-1 shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
        role="group"
        :aria-label="t('browse.ratingLabel')"
      >
        <button
          v-for="option in RATING_OPTIONS"
          :key="option.value ?? 'all'"
          type="button"
          class="inline-flex h-7 items-center rounded-full px-3 text-caption-md font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          :class="minRating === option.value
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
          :aria-pressed="minRating === option.value"
          @click="onRatingClick(option.value)"
        >
          <span v-if="option.symbol" aria-hidden="true" class="mr-1">{{ option.symbol }}</span>
          {{ option.label }}
        </button>
      </div>

      <div v-if="genres.length > 0" class="homeFilterBarGenres overflow-x-auto">
        <GenreChips
          :genres="genres"
          :model-value="selectedGenreIds"
          @toggle="emit('toggleGenre', $event)"
        />
      </div>

      <span
        v-if="selectedGenreIds.length > 0"
        class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-secondary px-1.5 text-caption-sm font-bold tabular-nums text-foreground ring-1 ring-background"
        aria-hidden="true"
        data-testid="genre-count"
      >
        {{ selectedGenreIds.length }}
      </span>

      <Popover
        v-if="availableProviders.length > 0 || (popularProviders && popularProviders.length > 0)"
        :open="open"
        @update:open="onOpenUpdate"
      >
        <PopoverTrigger as-child>
          <button
            type="button"
            class="group relative inline-flex items-center rounded-full bg-muted p-1 pr-1.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 data-[state=open]:bg-secondary"
            :aria-expanded="open"
            aria-controls="home-filter-bar-detail"
            :aria-label="t('browse.providersLabel')"
          >
            <span class="flex items-center -space-x-1.5">
              <span
                v-for="provider in clusterProviders"
                :key="provider.id"
                class="flex size-6 items-center justify-center overflow-hidden rounded-[20%] border-2 border-background"
              >
                <NuxtImg
                  v-if="provider.logoPath"
                  :src="providerLogoUrl(provider.logoPath) ?? undefined"
                  :srcset="providerLogoSrcSet(provider.logoPath) ?? undefined"
                  sizes="24px"
                  :alt="provider.name"
                  loading="lazy"
                  decoding="async"
                  class="h-full w-full object-cover"
                />
              </span>
            </span>
            <span
              v-if="selectedProviderIds.length > 0"
              class="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-caption-sm font-bold tabular-nums text-foreground ring-1 ring-background"
              aria-hidden="true"
            >
              {{ selectedProviderIds.length }}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          id="home-filter-bar-detail"
          data-testid="home-filter-bar-detail"
          align="end"
          :side-offset="10"
          class="homeFilterBarPopover bg-popover p-3"
          @open-auto-focus="focusSearchInput(); ensurePopoverVisible()"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-caption-md font-medium uppercase tracking-[0.06em] text-muted-foreground">{{ providerSectionLabel }}</span>
            <span v-if="!isSearching" class="text-caption-sm tabular-nums text-muted-foreground/60">{{ displayedProviders.length }}</span>
            <span v-else class="text-caption-sm tabular-nums text-muted-foreground/60">{{ providerSearchLoading ? '…' : String(displayedProviders.length) }}</span>
          </div>
          <label class="flex items-center gap-2 rounded-full border border-input bg-card px-3 py-1.5 focus-within:border-ring/40 focus-within:ring-2 focus-within:ring-ring/15">
            <Search :size="14" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref="providerSearchInputRef"
              v-model="providerSearchText"
              type="search"
              class="min-w-0 flex-1 bg-transparent text-body-md text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              :placeholder="t('browse.providersSearchPlaceholder')"
              :aria-label="t('browse.providersSearchPlaceholder')"
              autocomplete="off"
              @input="onProviderSearchInput"
            >
            <button
              v-if="providerSearchText.length > 0"
              type="button"
              class="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none"
              :aria-label="t('search.clear')"
              @click="clearProviderSearchInput"
            >
              <X :size="12" :stroke-width="2" aria-hidden="true" />
            </button>
          </label>
          <div
            class="grid max-h-[min(42vh,280px)] grid-cols-6 gap-2 overflow-y-auto py-1 pr-1 [scrollbar-width:thin] max-[880px]:grid-cols-5"
            role="group"
            :aria-label="t('browse.providersLabel')"
            :aria-busy="providerSearchLoading"
          >
            <button
              v-for="provider in displayedProviders"
              :key="provider.id"
              type="button"
              class="shrink-0 rounded-[20%] p-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
              :class="selectedProviderIds.includes(provider.id)
                ? 'ring-2 ring-ring/30 ring-offset-2 ring-offset-popover'
                : 'opacity-90 hover:opacity-100'"
              :aria-pressed="selectedProviderIds.includes(provider.id)"
              :title="provider.name"
              :aria-label="provider.name"
              @click="toggleProvider(provider.id)"
            >
              <span class="flex size-10 items-center justify-center overflow-hidden rounded-[20%] bg-card shadow-[0_2px_8px_rgba(0,0,0,0.22)]">
                <NuxtImg
                  v-if="provider.logoPath"
                  :src="providerLogoUrl(provider.logoPath) ?? undefined"
                  :srcset="providerLogoSrcSet(provider.logoPath) ?? undefined"
                  sizes="40px"
                  :alt="provider.name"
                  loading="lazy"
                  decoding="async"
                  class="h-full w-full object-cover"
                />
              </span>
            </button>
          </div>
          <p
            v-if="isSearching && !providerSearchLoading && displayedProviders.length === 0"
            class="rounded-lg bg-muted/60 px-3 py-3 text-center text-body-md text-muted-foreground"
          >
            {{ t('browse.providersSearchEmpty') }}
          </p>
          <p
            v-if="!isSearching && displayedProviders.length === 0"
            class="rounded-lg bg-muted/60 px-3 py-3 text-center text-body-md text-muted-foreground"
          >
            {{ t('browse.providersSearchEmpty') }}
          </p>
        </PopoverContent>
      </Popover>

      <button
        v-if="isFiltered"
        type="button"
        class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-button-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        @click="emit('clearFilters')"
      >
        <X :size="14" :stroke-width="1.75" aria-hidden="true" />
        {{ t('browse.clearAll') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.homeFilterBar {
  position: sticky;
  top: var(--header-h);
  z-index: 40;
  background: rgba(20, 20, 22, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.homeFilterBarInner {
  max-width: var(--max-content-width);
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px var(--content-gutter);
  min-height: 48px;
}
.homeFilterBarGenres {
  flex: 1 1 0;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  /* single-line scroll with edge fade — Letterboxd/Disney pattern */
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%);
}
.homeFilterBarGenres::-webkit-scrollbar {
  display: none;
}
.homeFilterBarPopover {
  width: min(420px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: var(--popover);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
}
.bg-popover {
  background: var(--popover);
}
@media (max-width: 880px) {
  .homeFilterBarInner {
    gap: 8px;
    padding: 8px var(--content-gutter);
  }
  .homeFilterBarPopover {
    width: min(360px, calc(100vw - 24px));
  }
}
</style>
