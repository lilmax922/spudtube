<script setup lang="ts">
import type { Genre, Provider } from '#server/tmdb/types'
import { ChevronLeft, ChevronRight, X } from '@lucide/vue'
import { AnimatePresence, motion } from 'motion-v'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { providerLogoSrcSet, providerLogoUrl } from '../lib/images'
import GenreChips from './genre-chips.vue'

interface Props {
  selectedGenreIds: number[]
  minRating: number | null
  selectedProviderIds: number[]
  genres: Genre[]
  availableProviders: Provider[]
}
const props = defineProps<Props>()

const emit = defineEmits<{
  toggleGenre: [genreId: number]
  setMinRating: [rating: number | null]
  toggleProvider: [providerId: number]
  clearFilters: []
}>()

const { t } = useI18n()

const open = ref(false)

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

const COLLAPSE_TRANSITION = { duration: 0.22, ease: [0.16, 1, 0.3, 1] } as const

const scrollerRef = ref<HTMLDivElement | null>(null)

function scrollLeft(): void {
  scrollerRef.value?.scrollBy({ left: -280, behavior: 'smooth' })
}

function scrollRight(): void {
  scrollerRef.value?.scrollBy({ left: 280, behavior: 'smooth' })
}
</script>

<template>
  <section
    class="homeFilterBar"
    :aria-label="t('browse.sectionLabel')"
  >
    <div class="homeFilterBarInner">
      <div
        class="inline-flex items-center gap-0.5 rounded-full bg-card p-1 shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
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

      <div v-if="genres.length > 0" class="homeFilterBarGenres">
        <GenreChips
          :genres="genres"
          :model-value="selectedGenreIds"
          @toggle="emit('toggleGenre', $event)"
        />
      </div>

      <button
        v-if="availableProviders.length > 0"
        type="button"
        class="group relative inline-flex shrink-0 items-center rounded-full bg-muted p-1 pr-1.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        :class="open ? 'bg-secondary' : ''"
        :aria-expanded="open"
        aria-controls="home-filter-bar-detail"
        :aria-label="t('browse.providersLabel')"
        @click="open = !open"
      >
        <span class="flex items-center -space-x-1.5">
          <span
            v-for="provider in availableProviders.slice(0, 5)"
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

      <button
        v-if="isFiltered"
        type="button"
        class="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-button-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        @click="emit('clearFilters')"
      >
        <X :size="14" :stroke-width="1.75" aria-hidden="true" />
        {{ t('browse.clearAll') }}
      </button>
    </div>

    <AnimatePresence>
      <motion.div
        v-if="open"
        id="home-filter-bar-detail"
        :initial="{ height: 0, opacity: 0 }"
        :animate="{ height: 'auto', opacity: 1 }"
        :exit="{ height: 0, opacity: 0 }"
        :transition="COLLAPSE_TRANSITION"
        class="homeFilterBarPanel"
      >
        <div class="homeFilterBarPanelInner">
          <div class="flex items-center gap-2 text-caption-md font-medium uppercase tracking-[0.06em] text-muted-foreground">
            <span>{{ t('browse.providersLabel') }}</span>
            <span v-if="availableProviders.length > 0" class="text-muted-foreground/60">({{ availableProviders.length }})</span>
          </div>
          <div class="relative flex min-w-0 flex-1 items-center">
            <button
              type="button"
              class="absolute left-0 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
              aria-label="Scroll providers left"
              @click="scrollLeft"
            >
              <ChevronLeft :size="16" :stroke-width="1.75" aria-hidden="true" />
            </button>
            <div
              ref="scrollerRef"
              class="flex w-full gap-2 overflow-x-auto scroll-smooth px-8 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="group"
              :aria-label="t('browse.providersLabel')"
            >
              <button
                v-for="provider in availableProviders"
                :key="provider.id"
                type="button"
                class="shrink-0 rounded-[20%] p-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                :class="selectedProviderIds.length > 0 && !selectedProviderIds.includes(provider.id)
                  ? 'opacity-40 grayscale hover:opacity-60'
                  : 'opacity-100'"
                :aria-pressed="selectedProviderIds.includes(provider.id)"
                :title="provider.name"
                @click="toggleProvider(provider.id)"
              >
                <span class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-[20%] bg-card">
                  <NuxtImg
                    v-if="provider.logoPath"
                    :src="providerLogoUrl(provider.logoPath) ?? undefined"
                    :srcset="providerLogoSrcSet(provider.logoPath) ?? undefined"
                    sizes="32px"
                    :alt="provider.name"
                    loading="lazy"
                    decoding="async"
                    class="h-full w-full object-cover"
                  />
                </span>
              </button>
            </div>
            <button
              type="button"
              class="absolute right-0 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
              aria-label="Scroll providers right"
              @click="scrollRight"
            >
              <ChevronRight :size="16" :stroke-width="1.75" aria-hidden="true" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
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
  flex-wrap: wrap;
}
.homeFilterBarGenres {
  flex: 1 1 240px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.homeFilterBarGenres::-webkit-scrollbar {
  display: none;
}
.homeFilterBarPanel {
  overflow: hidden;
  border-top: 1px solid oklch(1 0 0 / 4%);
}
.homeFilterBarPanelInner {
  max-width: var(--max-content-width);
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px var(--content-gutter);
  flex-wrap: wrap;
}
@media (max-width: 880px) {
  .homeFilterBarInner {
    gap: 8px;
    padding: 8px var(--content-gutter);
  }
}
</style>
