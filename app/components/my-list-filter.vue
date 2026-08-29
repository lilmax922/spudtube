<script setup lang="ts">
import type { MonetizationTag } from '#server/api/my-list.get'
import type { Kind, Provider } from '#server/tmdb/types'
import { ChevronLeft, ChevronRight, X } from '@lucide/vue'
import { AnimatePresence, motion } from 'motion-v'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { providerLogoSrcSet, providerLogoUrl } from '../lib/images'

export type KindFilter = 'all' | Kind
export type MonetizationFilter = 'all' | MonetizationTag
export type SortOrder = 'recent' | 'title-asc'

export interface Filters {
  kind: KindFilter
  monetization: MonetizationFilter
  providerIds: number[]
  sort: SortOrder
}

interface Props {
  modelValue: Filters
  /** Distinct providers aggregated across the current active entries (deduped). */
  availableProviders: Provider[]
  /** Count per bucket for the current entries. */
  counts: {
    total: number
    byMonetization: Record<MonetizationTag, number>
    byKind: Record<Kind, number>
  }
}
const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [next: Filters]
  'clear': []
}>()

const { t } = useI18n()

const open = ref(false)

const KIND_OPTIONS: { value: KindFilter, labelKey: 'myList.filter.kindAll' | 'browse.kindMovies' | 'browse.kindTvShows' }[] = [
  { value: 'all', labelKey: 'myList.filter.kindAll' },
  { value: 'MOVIE', labelKey: 'browse.kindMovies' },
  { value: 'TV_SHOW', labelKey: 'browse.kindTvShows' },
]

const MONETIZATION_OPTIONS: { value: MonetizationFilter, labelKey: 'myList.filter.all' | 'myList.filter.subscriptions' | 'myList.filter.buyRent' | 'myList.filter.free' }[] = [
  { value: 'all', labelKey: 'myList.filter.all' },
  { value: 'subscription', labelKey: 'myList.filter.subscriptions' },
  { value: 'buy', labelKey: 'myList.filter.buyRent' },
  { value: 'free', labelKey: 'myList.filter.free' },
]

function update<K extends keyof Filters>(key: K, value: Filters[K]): void {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function toggleProvider(id: number): void {
  const next = props.modelValue.providerIds.includes(id)
    ? props.modelValue.providerIds.filter(pid => pid !== id)
    : [...props.modelValue.providerIds, id]
  update('providerIds', next)
}

function clearAll(): void {
  emit('update:modelValue', {
    kind: 'all',
    monetization: 'all',
    providerIds: [],
    sort: props.modelValue.sort,
  })
  emit('clear')
}

const isFiltered = computed(() =>
  props.modelValue.kind !== 'all'
  || props.modelValue.monetization !== 'all'
  || props.modelValue.providerIds.length > 0,
)

const isProviderFiltered = computed(() => props.modelValue.providerIds.length > 0)

const monetizationCount = (bucket: MonetizationTag): number => props.counts.byMonetization[bucket] ?? 0

function kindCount(kind: KindFilter): number {
  if (kind === 'all')
    return props.counts.total
  return props.counts.byKind[kind] ?? 0
}

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
    class="my-list-filter"
    :aria-label="t('myList.filter.label')"
  >
    <!-- toolbar: left kind tabs (compact seg, 30px chip height per Contract) | right provider cluster button -->
    <div class="flex items-center justify-between gap-3">
      <!-- kind tabs -->
      <div
        class="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-card p-1 shadow-[0_2px_8px_rgba(0,0,0,0.18)] max-[560px]:overflow-x-auto max-[560px]:scroll-smooth max-[560px]:[-ms-overflow-style:none] max-[560px]:[scrollbar-width:none] max-[560px]:[&::-webkit-scrollbar]:hidden"
        role="group"
        :aria-label="t('myList.filter.kindLabel')"
      >
        <button
          v-for="option in KIND_OPTIONS"
          :key="option.value"
          type="button"
          class="inline-flex h-7 shrink-0 items-center rounded-full px-3 text-caption-md font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          :class="props.modelValue.kind === option.value
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
          :aria-pressed="props.modelValue.kind === option.value"
          @click="update('kind', option.value)"
        >
          <span>{{ t(option.labelKey) }}</span>
          <span class="ml-1 text-[11px] opacity-60">({{ kindCount(option.value) }})</span>
        </button>
      </div>

      <!-- provider cluster button (Image 1 style) -->
      <button
        type="button"
        class="group relative inline-flex shrink-0 items-center rounded-full bg-muted p-1 pr-1.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        :class="open ? 'bg-secondary' : ''"
        :aria-expanded="open"
        aria-controls="my-list-filter-detail"
        :aria-label="t('myList.filter.providersLabel')"
        @click="open = !open"
      >
        <span v-if="props.availableProviders.length > 0" class="flex items-center -space-x-1.5">
          <span
            v-for="provider in props.availableProviders.slice(0, 5)"
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
        <span v-else class="mx-2 text-caption-sm text-muted-foreground" aria-hidden="true">{{ t('myList.filter.providersLabel') }}</span>
        <span
          class="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-caption-sm font-bold tabular-nums text-foreground ring-1 ring-background"
          aria-hidden="true"
        >
          {{ props.availableProviders.length }}
        </span>
        <span class="ml-1 hidden text-caption-sm font-medium text-muted-foreground group-hover:text-foreground sm:inline" aria-hidden="true">
          <!-- spacer; badge already shows count -->
        </span>
      </button>
    </div>

    <AnimatePresence>
      <motion.div
        v-if="open"
        id="my-list-filter-detail"
        :initial="{ height: 0, opacity: 0 }"
        :animate="{ height: 'auto', opacity: 1 }"
        :exit="{ height: 0, opacity: 0 }"
        :transition="COLLAPSE_TRANSITION"
        class="overflow-hidden"
      >
        <div class="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <!-- monetization chips: All / subscription / rent/buy / free -->
          <div
            class="flex shrink-0 items-center gap-2 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            :aria-label="t('myList.filter.monetizationLabel')"
          >
            <button
              v-for="option in MONETIZATION_OPTIONS"
              :key="option.value"
              type="button"
              class="inline-flex h-8 shrink-0 items-center rounded-full px-3 text-button-md tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
              :class="props.modelValue.monetization === option.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
              :aria-pressed="props.modelValue.monetization === option.value"
              :disabled="option.value !== 'all' && monetizationCount(option.value as MonetizationTag) === 0"
              @click="update('monetization', option.value)"
            >
              <span>{{ t(option.labelKey) }}</span>
              <span v-if="option.value !== 'all'" class="ml-1 opacity-80">
                ({{ monetizationCount(option.value as MonetizationTag) }})
              </span>
            </button>
          </div>

          <template v-if="props.availableProviders.length > 0">
            <div class="hidden h-6 w-px shrink-0 bg-border lg:block" aria-hidden="true" />

            <!-- provider logo scroller (Images 2/3/4) : logo-only, horizontal, muted when not selected -->
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
                :aria-label="t('myList.filter.providersLabel')"
              >
                <button
                  v-for="provider in props.availableProviders"
                  :key="provider.id"
                  type="button"
                  class="shrink-0 rounded-[20%] p-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                  :class="isProviderFiltered && !props.modelValue.providerIds.includes(provider.id)
                    ? 'opacity-40 grayscale hover:opacity-60'
                    : 'opacity-100'"
                  :aria-pressed="props.modelValue.providerIds.includes(provider.id)"
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
          </template>
        </div>

        <div class="mt-3 flex h-8 items-center justify-end">
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-button-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            :class="isFiltered ? 'text-muted-foreground hover:bg-muted hover:text-foreground opacity-100' : 'pointer-events-none opacity-0'"
            :aria-hidden="!isFiltered"
            :tabindex="isFiltered ? 0 : -1"
            @click="clearAll"
          >
            <X :size="14" :stroke-width="1.75" aria-hidden="true" />
            {{ t('myList.filter.clear') }}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  </section>
</template>
