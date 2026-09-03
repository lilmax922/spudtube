<script setup lang="ts">
import type { Genre, Provider } from '#server/tmdb/types'
import { Filter, Search, X } from '@lucide/vue'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
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
const drawerOpen = ref(false)
const providerSearchInputRef = ref<HTMLInputElement | null>(null)
const drawerProviderSearchInputRef = ref<HTMLInputElement | null>(null)
const providerSearchText = ref('')
const drawerProviderSearchText = ref('')

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

function scrollToCoverHero(): void {
  if (typeof window === 'undefined')
    return
  requestAnimationFrame(() => {
    const bar = document.querySelector('.homeFilterBar') as HTMLElement | null
    if (!bar)
      return
    const headerH = Number.parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
      10,
    ) || 64
    const barTop = bar.getBoundingClientRect().top + window.scrollY
    const heroHideY = Math.max(0, barTop - headerH)
    if (window.scrollY < heroHideY - 2)
      window.scrollTo({ top: heroHideY, behavior: 'smooth' })
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

const isDrawerSearching = computed(() => drawerProviderSearchText.value.trim().length > 0)

const drawerDisplayedProviders = computed<Provider[]>(() => {
  if (isDrawerSearching.value)
    return props.providerSearchResults ?? []
  return props.popularProviders?.length ? props.popularProviders : props.availableProviders
})

const drawerProviderSectionLabel = computed(() =>
  isDrawerSearching.value ? t('browse.providersSearchResults') : t('browse.providersPopular'),
)

const filterCount = computed(() =>
  props.selectedGenreIds.length
  + (props.minRating != null ? 1 : 0)
  + props.selectedProviderIds.length,
)

const filterSummaryChips = computed(() => {
  const chips: { key: string, label: string }[] = []
  if (props.minRating != null) {
    const opt = RATING_OPTIONS.find(o => o.value === props.minRating)
    if (opt)
      chips.push({ key: `rating-${opt.value}`, label: opt.label })
  }
  for (const id of props.selectedGenreIds) {
    const g = props.genres.find(x => x.id === id)
    chips.push({ key: `genre-${id}`, label: g?.name ?? String(id) })
  }
  for (const id of props.selectedProviderIds) {
    const p = props.availableProviders.find(x => x.id === id) ?? props.popularProviders?.find(x => x.id === id)
    chips.push({ key: `provider-${id}`, label: p?.name ?? String(id) })
  }
  return chips
})

const summaryPreview = computed(() => filterSummaryChips.value.slice(0, 3))
const summaryOverflow = computed(() => Math.max(0, filterSummaryChips.value.length - summaryPreview.value.length))

function onProviderSearchInput(): void {
  emit('searchProviders', providerSearchText.value)
}

function onDrawerProviderSearchInput(): void {
  emit('searchProviders', drawerProviderSearchText.value)
}

function clearProviderSearchInput(): void {
  providerSearchText.value = ''
  emit('clearProviderSearch')
  nextTick(() => providerSearchInputRef.value?.focus())
}

function clearDrawerProviderSearchInput(): void {
  drawerProviderSearchText.value = ''
  emit('clearProviderSearch')
  nextTick(() => drawerProviderSearchInputRef.value?.focus())
}

function openDrawer(): void {
  drawerOpen.value = true
}

function onDrawerOpenChange(value: boolean): void {
  drawerOpen.value = value
}

watch(open, (value) => {
  if (value) {
    scrollToCoverHero()
    focusSearchInput()
    ensurePopoverVisible()
  }
  else {
    providerSearchText.value = ''
    emit('clearProviderSearch')
  }
})

watch(drawerOpen, (value) => {
  if (value) {
    nextTick(() => drawerProviderSearchInputRef.value?.focus())
  }
  else {
    drawerProviderSearchText.value = ''
    emit('clearProviderSearch')
  }
})

watch(() => props.providerSearchQuery, (value) => {
  // keep local input in sync if parent drives query (e.g. locale reset)
  if (value === '' && providerSearchText.value !== '')
    providerSearchText.value = ''
  if (value === '' && drawerProviderSearchText.value !== '')
    drawerProviderSearchText.value = ''
})
</script>

<template>
  <section
    class="homeFilterBar"
    :aria-label="t('browse.sectionLabel')"
  >
    <!-- Mobile summary + Drawer: <880 -->
    <div class="homeFilterBarSummary">
      <div
        role="button"
        tabindex="0"
        class="homeFilterBarSummaryInner"
        aria-label="Open filters"
        @click="openDrawer"
        @keydown.enter.prevent="openDrawer"
        @keydown.space.prevent="openDrawer"
      >
        <span v-if="filterSummaryChips.length === 0" class="text-body-md text-muted-foreground">{{ t('browse.filterPlaceholder') }}</span>
        <span v-else class="flex items-center gap-1.5 overflow-hidden">
          <span
            v-for="chip in summaryPreview"
            :key="chip.key"
            class="inline-flex h-6 shrink-0 items-center rounded-full bg-muted px-2.5 text-caption-md font-medium text-foreground"
          >{{ chip.label }}</span>
          <span
            v-if="summaryOverflow > 0"
            class="inline-flex h-6 shrink-0 items-center rounded-full bg-secondary px-2 text-caption-sm font-bold text-foreground"
          >+{{ summaryOverflow }}</span>
        </span>
      </div>
      <button
        type="button"
        class="relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-card px-4 text-button-md font-medium text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        aria-label="Open filters"
        @click="openDrawer"
      >
        <Filter :size="14" :stroke-width="1.75" aria-hidden="true" />
        {{ t('browse.filterTitle') }}
        <span
          v-if="filterCount > 0"
          class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-caption-sm font-bold tabular-nums text-primary-foreground"
          aria-hidden="true"
        >{{ filterCount }}</span>
      </button>
    </div>
    <Drawer :open="drawerOpen" @update:open="onDrawerOpenChange">
      <DrawerContent
        data-testid="home-filter-drawer"
        class="max-h-[84vh] bg-popover"
      >
        <DrawerHeader class="shrink-0 border-b border-border">
          <DrawerTitle>{{ t('browse.filterTitle') }}</DrawerTitle>
          <DrawerDescription class="sr-only">
            {{ t('browse.filterTitle') }}
          </DrawerDescription>
        </DrawerHeader>
        <div class="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:thin]">
          <div class="flex flex-col gap-6 p-4">
            <!-- Ratings -->
            <section class="flex flex-col gap-3">
              <h3 class="text-caption-md font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {{ t('browse.ratingLabel') }}
              </h3>
              <div class="flex flex-wrap gap-2" role="group" :aria-label="t('browse.ratingLabel')">
                <button
                  v-for="option in RATING_OPTIONS"
                  :key="option.value ?? 'all'"
                  type="button"
                  class="inline-flex h-8 items-center rounded-full px-3.5 text-button-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                  :class="minRating === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'"
                  :aria-pressed="minRating === option.value"
                  @click="onRatingClick(option.value)"
                >
                  <span v-if="option.symbol" aria-hidden="true" class="mr-1">{{ option.symbol }}</span>
                  {{ option.label }}
                </button>
              </div>
            </section>
            <!-- Genres -->
            <section v-if="genres.length > 0" class="flex flex-col gap-3">
              <h3 class="text-caption-md font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {{ t('browse.genresLabel') }}
              </h3>
              <div class="flex flex-wrap gap-2" role="group" :aria-label="t('browse.genresLabel')">
                <button
                  v-for="genre in genres"
                  :key="genre.id"
                  type="button"
                  class="inline-flex h-8 items-center rounded-full border px-3 text-button-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                  :class="selectedGenreIds.includes(genre.id)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-card text-muted-foreground hover:text-foreground'"
                  :aria-pressed="selectedGenreIds.includes(genre.id)"
                  @click="emit('toggleGenre', genre.id)"
                >
                  {{ genre.name }}
                </button>
              </div>
            </section>
            <!-- Providers -->
            <section v-if="availableProviders.length > 0 || (popularProviders && popularProviders.length > 0)" class="flex flex-col gap-3">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-caption-md font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  {{ drawerProviderSectionLabel }}
                </h3>
                <span class="text-caption-sm tabular-nums text-muted-foreground/60">{{ drawerDisplayedProviders.length }}</span>
              </div>
              <label class="flex items-center gap-2 rounded-full border border-input bg-card px-3 py-1.5 focus-within:border-ring/40 focus-within:ring-2 focus-within:ring-ring/15">
                <Search :size="14" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                  ref="drawerProviderSearchInputRef"
                  v-model="drawerProviderSearchText"
                  type="search"
                  class="min-w-0 flex-1 bg-transparent text-body-md text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                  :placeholder="t('browse.providersSearchPlaceholder')"
                  :aria-label="t('browse.providersSearchPlaceholder')"
                  autocomplete="off"
                  @input="onDrawerProviderSearchInput"
                >
                <button
                  v-if="drawerProviderSearchText.length > 0"
                  type="button"
                  class="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none"
                  :aria-label="t('search.clear')"
                  @click="clearDrawerProviderSearchInput"
                >
                  <X :size="12" :stroke-width="2" aria-hidden="true" />
                </button>
              </label>
              <div
                class="grid grid-cols-5 gap-2 overflow-y-auto py-1 pr-1 [scrollbar-width:thin]"
                role="group"
                :aria-label="t('browse.providersLabel')"
                :aria-busy="providerSearchLoading"
              >
                <button
                  v-for="provider in drawerDisplayedProviders"
                  :key="provider.id"
                  type="button"
                  class="flex size-10 shrink-0 items-center justify-center rounded-[20%] p-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                  :class="selectedProviderIds.includes(provider.id)
                    ? 'ring-2 ring-ring/30 grayscale-0 opacity-100'
                    : selectedProviderIds.length > 0
                      ? 'grayscale opacity-55 hover:grayscale-0 hover:opacity-100'
                      : 'grayscale-0 opacity-100 hover:opacity-90'"
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
                v-if="isDrawerSearching && !providerSearchLoading && drawerDisplayedProviders.length === 0"
                class="rounded-lg bg-muted/60 px-3 py-3 text-center text-body-md text-muted-foreground"
              >
                {{ t('browse.providersSearchEmpty') }}
              </p>
              <p
                v-if="!isDrawerSearching && drawerDisplayedProviders.length === 0"
                class="rounded-lg bg-muted/60 px-3 py-3 text-center text-body-md text-muted-foreground"
              >
                {{ t('browse.providersSearchEmpty') }}
              </p>
            </section>
          </div>
        </div>
        <div class="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-popover p-4">
          <button
            type="button"
            class="inline-flex h-9 items-center rounded-full px-4 text-button-md font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            @click="emit('clearFilters')"
          >
            {{ t('browse.clearAll') }}
          </button>
          <button
            type="button"
            class="inline-flex h-9 items-center rounded-full bg-primary px-5 text-button-md font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            @click="drawerOpen = false"
          >
            {{ t('browse.done') }}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
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
            class="grid max-h-[min(44vh,300px)] grid-cols-6 gap-2 overflow-y-auto py-1 pr-1 [scrollbar-width:thin] max-[880px]:grid-cols-5"
            role="group"
            :aria-label="t('browse.providersLabel')"
            :aria-busy="providerSearchLoading"
          >
            <button
              v-for="provider in displayedProviders"
              :key="provider.id"
              type="button"
              class="flex size-10 shrink-0 items-center justify-center rounded-[20%] p-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
              :class="selectedProviderIds.includes(provider.id)
                ? 'ring-2 ring-ring/30 grayscale-0 opacity-100'
                : selectedProviderIds.length > 0
                  ? 'grayscale opacity-55 hover:grayscale-0 hover:opacity-100'
                  : 'grayscale-0 opacity-100 hover:opacity-90'"
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
  z-index: 45;
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
.homeFilterBarSummary {
  display: none;
  max-width: var(--max-content-width);
  margin: 0 auto;
  align-items: center;
  gap: 12px;
  padding: 10px var(--content-gutter);
  min-height: 48px;
}
.homeFilterBarSummaryInner {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  overflow: hidden;
  border-radius: 9999px;
  background: var(--card);
  padding: 6px 12px;
  text-align: left;
  cursor: pointer;
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
.bg-popover {
  background: var(--popover);
}
@media (max-width: 880px) {
  .homeFilterBarInner {
    display: none;
  }
  .homeFilterBarSummary {
    display: flex;
    gap: 8px;
    padding: 8px var(--content-gutter);
  }
}
</style>

<style>
.homeFilterBarPopover {
  width: min(380px, calc(100vw - 32px)) !important;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px !important;
  background: var(--popover);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
}
@media (max-width: 880px) {
  .homeFilterBarPopover {
    width: min(340px, calc(100vw - 24px)) !important;
  }
}
</style>
