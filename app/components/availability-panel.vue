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

const regionLink = computed<string | null>(() => availability.value?.link ?? null)

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
        class="grid grid-cols-[72px_1fr] items-start gap-4 border-t border-border py-3.5 first:border-t-0 first:pt-0 max-[560px]:grid-cols-1 max-[560px]:gap-2"
        data-testid="availability-group"
      >
        <span class="pt-3 text-caption-md font-medium text-muted-foreground max-[560px]:pt-0">
          {{ t(`availability.groups.${group.key}`) }}
        </span>
        <div
          class="flex min-w-0 flex-nowrap snap-x snap-mandatory items-center gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          role="list"
          tabindex="0"
          :aria-label="t(`availability.groups.${group.key}`)"
        >
          <template
            v-for="provider in group.providers"
            :key="provider.id"
          >
            <a
              v-if="provider.logoPath && regionLink"
              :href="regionLink"
              target="_blank"
              rel="noopener noreferrer"
              :title="provider.name"
              :aria-label="provider.name"
              data-testid="provider-link"
              class="shrink-0 snap-start rounded-[20%] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              <img
                :src="providerLogoUrl(provider.logoPath) ?? undefined"
                :srcset="providerLogoSrcSet(provider.logoPath) ?? undefined"
                sizes="40px"
                :alt="provider.name"
                width="40"
                height="40"
                loading="lazy"
                class="h-[40px] w-[40px] rounded-[20%] object-cover"
              >
            </a>
            <img
              v-else-if="provider.logoPath"
              :src="providerLogoUrl(provider.logoPath) ?? undefined"
              :srcset="providerLogoSrcSet(provider.logoPath) ?? undefined"
              sizes="40px"
              :alt="provider.name"
              :title="provider.name"
              width="40"
              height="40"
              loading="lazy"
              data-testid="provider-image"
              class="h-[40px] w-[40px] shrink-0 snap-start rounded-[20%] object-cover"
            >
            <span
              v-else
              :title="provider.name"
              :aria-label="provider.name"
              data-testid="provider-fallback"
              class="flex h-[40px] w-[40px] shrink-0 snap-start items-center justify-center rounded-[20%] bg-muted text-caption-sm font-bold leading-none text-muted-foreground"
            >
              {{ provider.name.slice(0, 2).toUpperCase() }}
            </span>
          </template>
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
