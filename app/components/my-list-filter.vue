<script setup lang="ts">
import type { MonetizationTag } from '#server/api/my-list.get'
import type { Kind, Provider } from '#server/tmdb/types'
import { ChevronDown, ListFilter, X } from '@lucide/vue'
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
  /** Count per monetization bucket for the current entries, used to annotate the chips. */
  counts: {
    total: number
    byMonetization: Record<MonetizationTag, number>
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

const SORT_OPTIONS: { value: SortOrder, labelKey: 'myList.filter.recent' | 'myList.filter.titleAsc' }[] = [
  { value: 'recent', labelKey: 'myList.filter.recent' },
  { value: 'title-asc', labelKey: 'myList.filter.titleAsc' },
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

const monetizationCount = (bucket: MonetizationTag): number => props.counts.byMonetization[bucket] ?? 0

const COLLAPSE_TRANSITION = { duration: 0.22, ease: [0.16, 1, 0.3, 1] } as const
</script>

<template>
  <section
    class="my-list-filter mt-4"
    :aria-label="t('myList.filter.label')"
  >
    <div class="filter-toolbar flex flex-wrap items-center justify-between gap-3">
      <span class="text-caption-md text-muted-foreground tabular-nums">
        {{ t('myList.filter.count', { count: props.counts.total }) }}
      </span>

      <div class="flex items-center gap-2">
        <div
          class="inline-flex rounded-full bg-muted p-1"
          role="group"
          :aria-label="t('myList.filter.sortLabel')"
        >
          <button
            v-for="option in SORT_OPTIONS"
            :key="option.value"
            type="button"
            class="inline-flex h-9 min-h-10 items-center rounded-full px-3 text-button-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            :class="props.modelValue.sort === option.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'"
            :aria-pressed="props.modelValue.sort === option.value"
            @click="update('sort', option.value)"
          >
            {{ t(option.labelKey) }}
          </button>
        </div>

        <button
          type="button"
          class="filter-trigger inline-flex h-10 items-center gap-2 rounded-full px-4 text-button-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          :class="open || isFiltered
            ? 'bg-secondary text-foreground'
            : 'bg-muted text-foreground hover:bg-secondary'"
          :aria-expanded="open"
          aria-controls="my-list-filter-detail"
          @click="open = !open"
        >
          <ListFilter :size="16" :stroke-width="1.75" aria-hidden="true" />
          <span>{{ t('myList.filter.trigger') }}</span>
          <span
            v-if="isFiltered"
            class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-caption-sm font-bold tabular-nums text-primary-foreground"
            aria-hidden="true"
          >
            ·
          </span>
          <motion.span
            :animate="{ rotate: open ? 180 : 0 }"
            :transition="{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }"
            class="flex items-center"
            aria-hidden="true"
          >
            <ChevronDown :size="16" :stroke-width="1.75" />
          </motion.span>
        </button>
      </div>
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
        <div class="filter-detail mt-4 rounded-xl bg-card p-5 shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
          <div class="flex flex-col gap-5">
            <div class="flex flex-col gap-2">
              <span class="text-heading-xs font-bold uppercase tracking-wide text-muted-foreground">
                {{ t('myList.filter.kindLabel') }}
              </span>
              <div
                class="inline-flex w-fit rounded-full bg-muted p-1"
                role="group"
                :aria-label="t('myList.filter.kindLabel')"
              >
                <button
                  v-for="option in KIND_OPTIONS"
                  :key="option.value"
                  type="button"
                  class="inline-flex h-9 min-h-10 items-center rounded-full px-4 text-button-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                  :class="props.modelValue.kind === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'"
                  :aria-pressed="props.modelValue.kind === option.value"
                  @click="update('kind', option.value)"
                >
                  {{ t(option.labelKey) }}
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <span class="text-heading-xs font-bold uppercase tracking-wide text-muted-foreground">
                {{ t('myList.filter.monetizationLabel') }}
              </span>
              <div class="flex flex-wrap gap-2" role="group" :aria-label="t('myList.filter.monetizationLabel')">
                <button
                  v-for="option in MONETIZATION_OPTIONS"
                  :key="option.value"
                  type="button"
                  class="inline-flex h-9 min-h-10 items-center gap-1 rounded-full border border-transparent px-3 text-button-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                  :class="props.modelValue.monetization === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'"
                  :aria-pressed="props.modelValue.monetization === option.value"
                  :disabled="option.value !== 'all' && monetizationCount(option.value) === 0"
                  @click="update('monetization', option.value)"
                >
                  <span>{{ t(option.labelKey) }}</span>
                  <span
                    v-if="option.value === 'all'"
                    class="tabular-nums opacity-80"
                  >·</span>
                  <span
                    v-else
                    class="tabular-nums opacity-80"
                  >{{ monetizationCount(option.value) }}</span>
                </button>
              </div>
            </div>

            <div v-if="props.availableProviders.length > 0" class="flex flex-col gap-2">
              <span class="text-heading-xs font-bold uppercase tracking-wide text-muted-foreground">
                {{ t('myList.filter.providersLabel') }}
              </span>
              <div
                class="flex flex-wrap gap-2"
                role="group"
                :aria-label="t('myList.filter.providersLabel')"
              >
                <button
                  v-for="provider in props.availableProviders"
                  :key="provider.id"
                  type="button"
                  class="inline-flex h-9 min-h-10 items-center gap-2 rounded-full border px-2.5 pr-3 text-button-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                  :class="props.modelValue.providerIds.includes(provider.id)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'"
                  :aria-pressed="props.modelValue.providerIds.includes(provider.id)"
                  :title="provider.name"
                  @click="toggleProvider(provider.id)"
                >
                  <span
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-background/30 p-0.5"
                    :class="props.modelValue.providerIds.includes(provider.id) ? 'bg-primary-foreground/20' : 'bg-muted'"
                  >
                    <NuxtImg
                      v-if="provider.logoPath"
                      :src="providerLogoUrl(provider.logoPath) ?? undefined"
                      :srcset="providerLogoSrcSet(provider.logoPath) ?? undefined"
                      sizes="20px"
                      :alt="provider.name"
                      loading="lazy"
                      decoding="async"
                      class="h-full w-full object-contain"
                    />
                  </span>
                  <span class="max-w-[8rem] truncate">{{ provider.name }}</span>
                </button>
              </div>
            </div>

            <div v-if="isFiltered" class="flex justify-end">
              <button
                type="button"
                class="inline-flex h-9 min-h-10 items-center gap-1.5 rounded-full px-3 text-button-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                @click="clearAll"
              >
                <X :size="14" :stroke-width="1.75" aria-hidden="true" />
                {{ t('myList.filter.clear') }}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  </section>
</template>
