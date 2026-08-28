<script setup lang="ts">
import type { AvailabilityGroups, Kind, RegionAvailability } from '#server/tmdb/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isCuratedRegion } from '#shared/region/region'
import { useAvailability } from '../composables/use-availability'
import { useRegion } from '../composables/use-region'
import { providerLogoSrcSet, providerLogoUrl } from '../lib/images'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

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

function onRegionUpdate(value: unknown): void {
  if (typeof value === 'string' && isCuratedRegion(value)) {
    setRegion(value)
  }
}
</script>

<template>
  <section
    class="border-t border-border py-6 first:border-t-0"
    :aria-label="t('availability.heading')"
  >
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-heading-lg text-foreground">
        {{ t('availability.heading') }}
      </h2>
      <Select :model-value="region" @update:model-value="onRegionUpdate">
        <SelectTrigger
          class="h-8 min-w-32 rounded-full border-border bg-muted px-3 text-caption-sm font-medium text-foreground shadow-[0_4px_12px_rgba(0,0,0,.25)] focus-visible:ring-2 focus-visible:ring-ring/20 data-[placeholder]:text-muted-foreground"
          aria-label="region-select"
        >
          <SelectValue :placeholder="t(`region.names.${region}`)">
            {{ t(`region.names.${region}`) }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          class="rounded-lg border border-border bg-popover shadow-[0_16px_48px_rgba(0,0,0,.55)]"
          position="popper"
        >
          <SelectItem
            v-for="code in curatedRegions"
            :key="code"
            :value="code"
          >
            {{ t(`region.names.${code}`) }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <p v-if="catalog.pending.value" class="text-body-md text-muted-foreground">
      {{ t('availability.loading') }}
    </p>
    <p v-else-if="catalog.error.value" class="text-body-md text-muted-foreground">
      {{ t('availability.error') }}
    </p>
    <template v-else-if="loaded && visibleGroups.length > 0">
      <div
        v-for="group in visibleGroups"
        :key="group.key"
        class="grid grid-cols-[72px_1fr] items-start gap-4 border-t border-border py-3.5 first:border-t-0 first:pt-0"
        data-testid="availability-group"
      >
        <span class="pt-1.5 text-caption-md font-medium text-muted-foreground">
          {{ t(`availability.groups.${group.key}`) }}
        </span>
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <span
            v-for="provider in group.providers"
            :key="provider.id"
            class="inline-flex h-8 items-center gap-2 rounded-full bg-muted px-1.5 pr-3 shadow-[0_4px_12px_rgba(0,0,0,.25)]"
            :title="provider.name"
            data-testid="provider-pill"
          >
            <img
              v-if="provider.logoPath"
              :src="providerLogoUrl(provider.logoPath) ?? undefined"
              :srcset="providerLogoSrcSet(provider.logoPath) ?? undefined"
              sizes="24px"
              :alt="provider.name"
              width="24"
              height="24"
              loading="lazy"
              class="h-6 w-6 shrink-0 rounded-full bg-muted object-cover"
            >
            <span
              v-else
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold leading-none text-muted-foreground"
              aria-hidden="true"
            >
              {{ provider.name.slice(0, 2).toUpperCase() }}
            </span>
            <span class="max-w-32 truncate text-caption-md font-medium text-foreground">
              {{ provider.name }}
            </span>
          </span>
        </div>
      </div>
    </template>
    <div v-else-if="loaded" class="border-t border-border pt-3" data-testid="availability-empty">
      <p class="text-body-md text-foreground/90">
        {{ t('availability.unavailable') }}
      </p>
      <p class="mt-1 text-caption-md text-muted-foreground">
        {{ t('availability.unavailableHint') }}
      </p>
    </div>

    <p class="mt-4 border-t border-border pt-3 text-caption-sm leading-relaxed text-muted-foreground/80">
      {{ t('availability.attribution') }}
    </p>
  </section>
</template>
