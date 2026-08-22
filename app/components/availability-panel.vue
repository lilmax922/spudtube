<script setup lang="ts">
import type { AvailabilityGroups, Kind, RegionAvailability } from '#server/tmdb/types'
import { Globe } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isCuratedRegion } from '#shared/region/region'
import { useAvailability } from '../composables/use-availability'
import { useRegion } from '../composables/use-region'
import { providerLogoUrl } from '../lib/images'

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
    class="rounded-lg border border-border bg-card/80 p-5 backdrop-blur-lg backdrop-saturate-150"
    :aria-label="t('availability.heading')"
  >
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 class="flex items-center gap-1 text-[16.5px] font-bold tracking-tight text-foreground">
        <Globe :size="16" :stroke-width="1.75" aria-hidden="true" />
        {{ t('availability.heading') }}
      </h2>
      <label class="flex items-center gap-2">
        <span class="sr-only">{{ t('region.label') }}</span>
        <select
          :value="region"
          class="h-[38px] rounded-md border border-input bg-card px-2 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        <span class="w-14 shrink-0 pt-1 text-[12.5px] font-medium text-muted-foreground">
          {{ t(`availability.groups.${group.key}`) }}
        </span>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="provider in group.providers"
            :key="provider.id"
            class="flex h-[38px] items-center rounded-md border border-border bg-muted px-2"
            :title="provider.name"
          >
            <img
              v-if="provider.logoPath"
              :src="providerLogoUrl(provider.logoPath) ?? undefined"
              :alt="provider.name"
              class="max-h-6 max-w-24 object-contain"
            >
            <span v-else class="max-w-28 truncate text-xs font-medium text-muted-foreground">
              {{ provider.name }}
            </span>
          </span>
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
