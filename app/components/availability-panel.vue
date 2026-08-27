<script setup lang="ts">
import type { AvailabilityGroups, Kind, RegionAvailability } from '#server/tmdb/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isCuratedRegion } from '#shared/region/region'
import { useAvailability } from '../composables/use-availability'
import { useRegion } from '../composables/use-region'
import { providerLogoSrcSet, providerLogoUrl } from '../lib/images'

interface Props {
  kind: Kind
  tmdbId: number
}
const props = defineProps<Props>()

const { t } = useI18n()
const { catalog } = useAvailability(props.kind, props.tmdbId)
const { region, curatedRegions, setRegion } = useRegion()

const AVAILABILITY_GROUP_ORDER = [
  'subscription',
  'free',
  'rent',
  'buy',
] as const satisfies readonly (keyof AvailabilityGroups)[]

const availability = computed<RegionAvailability | null>(() => {
  const raw = catalog.data.value
  return raw ? (raw[region.value] ?? null) : null
})

const visibleGroups = computed(() => {
  const current = availability.value
  if (!current) {
    return []
  }
  return AVAILABILITY_GROUP_ORDER
    .map(key => ({ key, providers: current.groups[key] }))
    .filter(group => group.providers.length > 0)
})

const loaded = computed(() => !catalog.pending.value && catalog.error.value == null)

function onRegionChange(event: Event): void {
  const next = (event.target as HTMLSelectElement).value
  if (isCuratedRegion(next)) {
    setRegion(next)
  }
}
</script>

<template>
  <section
    class="border-t border-border py-6 first:border-t-0"
    :aria-label="t('availability.heading')"
  >
    <div class="mb-3.5 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">
        {{ t('availability.heading') }}
      </h2>
      <label class="flex items-center gap-2">
        <span class="sr-only">{{ t('region.label') }}</span>
        <select
          :value="region"
          class="h-7 rounded-full border border-border bg-muted px-3 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          @change="onRegionChange"
        >
          <option v-for="code in curatedRegions" :key="code" :value="code">
            {{ t(`region.names.${code}`) }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="catalog.pending.value" class="text-sm text-muted-foreground">
      {{ t('availability.loading') }}
    </p>
    <p v-else-if="catalog.error.value" class="text-sm text-muted-foreground">
      {{ t('availability.error') }}
    </p>
    <template v-else-if="loaded && visibleGroups.length > 0">
      <div
        v-for="group in visibleGroups"
        :key="group.key"
        class="flex items-start gap-4 border-t border-border py-3 first:border-t-0 first:pt-0"
      >
        <span class="shrink-0 whitespace-nowrap pt-1.5 text-[12.5px] font-medium text-muted-foreground">
          {{ t(`availability.groups.${group.key}`) }}
        </span>
        <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <template v-for="provider in group.providers" :key="provider.id">
            <img
              v-if="provider.logoPath"
              :src="providerLogoUrl(provider.logoPath) ?? undefined"
              :srcset="providerLogoSrcSet(provider.logoPath) ?? undefined"
              sizes="96px"
              :alt="provider.name"
              :title="provider.name"
              class="h-10 w-auto max-w-48 rounded-[20%] object-contain"
            >
            <span
              v-else
              :title="provider.name"
              class="text-sm font-medium text-foreground/90"
            >
              {{ provider.name }}
            </span>
          </template>
        </div>
      </div>
    </template>
    <div v-else-if="loaded" class="border-t border-border pt-3">
      <p class="text-sm text-foreground/90">
        {{ t('availability.unavailable') }}
      </p>
      <p class="mt-1 text-[12.5px] text-muted-foreground">
        {{ t('availability.unavailableHint') }}
      </p>
    </div>

    <p class="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground/80">
      {{ t('availability.attribution') }}
    </p>
  </section>
</template>
