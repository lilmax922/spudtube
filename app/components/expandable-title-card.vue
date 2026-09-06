<script setup lang="ts">
import type { TitleSummary } from '#server/tmdb/types'
import { Clapperboard } from '@lucide/vue'
import { computed, inject, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAvailability } from '../composables/use-availability'
import { useDiscoveryBadges } from '../composables/use-discovery-badges'
import { EXPANDABLE_VIEWPORT_MARGIN, matchesExpandableMedia, useExpandableShift } from '../composables/use-expandable-geometry'
import { useRegion } from '../composables/use-region'
import { backdropSrcSet, backdropUrl, posterSrcSet, posterUrl, providerLogoSrcSet, providerLogoUrl } from '../lib/images'
import { kindLabelKey, titleDetailPath } from '../lib/kind'
import { EXPANDABLE_SHIFT_KEY } from './constants'

const props = withDefaults(defineProps<{ title: TitleSummary, showKind?: boolean, edgeMargin?: number }>(), {
  showKind: false,
  edgeMargin: EXPANDABLE_VIEWPORT_MARGIN,
})

const { t } = useI18n()

const posterFailed = ref(false)
const backdropFailed = ref(false)

const posterSrc = computed(() =>
  props.title.posterPath && !posterFailed.value ? posterUrl(props.title.posterPath) : null,
)

const backdropSrc = computed(() =>
  props.title.backdropPath && !backdropFailed.value ? backdropUrl(props.title.backdropPath) : null,
)

const year = computed(() => props.title.releaseDate?.slice(0, 4) ?? null)

const kindLabel = computed(() => t(kindLabelKey(props.title.kind)))

const HOVER_PROVIDER_LIMIT = 6

const { badges } = useDiscoveryBadges(props.title.kind)

// Same source as TitleCard: real TMDB list membership only, never the rating.
const discoveryBadge = computed(() => {
  const sets = badges.data.value
  if (!sets)
    return ''
  const id = props.title.tmdbId
  if (sets.trendingIds.includes(id))
    return t('card.badges.trending')
  if (sets.topRatedIds.includes(id))
    return t('card.badges.topRated')
  return ''
})

const ratingText = computed(() => {
  const v = props.title.voteAverage
  return v != null ? v.toFixed(1) : '—'
})

const { region } = useRegion()
const { catalog: availability, loadCatalog } = useAvailability(props.title.kind, props.title.tmdbId, { immediate: false })

const inspected = ref(false)

function markInspected(): void {
  if (inspected.value)
    return
  inspected.value = true
  void loadCatalog()
}

const artRef = shallowRef<HTMLElement | null>(null)
const { shift, refreshShift } = useExpandableShift(artRef, () => props.edgeMargin)
const setShift = inject(EXPANDABLE_SHIFT_KEY, null)

// Push rows grow rightward, so a right-edge card would overflow the viewport.
// Report the needed row glide on interact; the section translates every item
// left by that amount and clears it once nothing is expanded.
function onEnter(): void {
  markInspected()
  if (setShift == null || !matchesExpandableMedia())
    return
  refreshShift()
  setShift(shift.value)
}

function onLeave(): void {
  setShift?.(null)
}

function onLeaveFocus(event: FocusEvent): void {
  const current = event.currentTarget
  const next = event.relatedTarget
  if (current instanceof Node && next instanceof Node && current.contains(next))
    return
  setShift?.(null)
}

const hoverProviders = computed(() => {
  const entry = availability.data.value?.[region.value]
  if (!entry)
    return []
  const streamable = [...entry.groups.subscription, ...entry.groups.free]
    .filter(provider => provider.logoPath != null)
  return streamable.slice(0, HOVER_PROVIDER_LIMIT)
})
</script>

<template>
  <NuxtLink
    :to="titleDetailPath(title.kind, title.tmdbId)"
    data-testid="expandable-title-card"
    class="group/expandable-card expandable-title-card-root relative flex flex-col rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/20"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @focusin="onEnter"
    @focusout="onLeaveFocus"
  >
    <div ref="artRef" class="expandable-title-card-art relative aspect-[2/3] h-auto w-full overflow-hidden rounded-xl bg-muted shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
      <span
        v-if="showKind"
        data-testid="kind-badge"
        class="absolute left-2 top-2 z-[2] rounded-md bg-background/70 px-1.5 py-0.5 text-caption-sm font-semibold uppercase tracking-wide text-foreground backdrop-blur"
      >
        {{ kindLabel }}
      </span>

      <span
        v-if="discoveryBadge"
        data-testid="discovery-badge"
        class="discovery-badge"
      >
        {{ discoveryBadge }}
      </span>

      <NuxtImg
        v-if="posterSrc"
        :src="posterSrc"
        :srcset="posterSrcSet(props.title.posterPath)"
        sizes="240px md:320px"
        :alt="title.name"
        loading="lazy"
        decoding="async"
        data-testid="expandable-poster"
        class="expandable-poster absolute inset-0 h-full w-full object-cover"
        @error="posterFailed = true"
      />
      <NuxtImg
        v-if="backdropSrc"
        :src="backdropSrc"
        :srcset="backdropSrcSet(props.title.backdropPath)"
        sizes="540px"
        :alt="title.name"
        loading="lazy"
        decoding="async"
        data-testid="expandable-backdrop"
        class="expandable-backdrop absolute inset-0 h-full w-full object-cover"
        @error="backdropFailed = true"
      />
      <div
        v-if="!posterSrc && !backdropSrc"
        class="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-muted-foreground"
      >
        <Clapperboard :size="24" :stroke-width="1.75" aria-hidden="true" />
        <span class="line-clamp-3 text-caption-sm leading-snug">{{ title.name }}</span>
      </div>

      <div class="expandable-overlay-content">
        <div class="line-clamp-2 text-heading-sm leading-tight tracking-tight">
          {{ title.name }}
        </div>

        <div v-if="hoverProviders.length > 0" data-testid="provider-strip" class="flex items-center gap-1.5">
          <NuxtImg
            v-for="provider in hoverProviders"
            :key="provider.id"
            :src="providerLogoUrl(provider.logoPath) ?? undefined"
            :srcset="providerLogoSrcSet(provider.logoPath) ?? undefined"
            sizes="32px"
            :alt="provider.name"
            :title="provider.name"
            loading="lazy"
            decoding="async"
            class="h-6 w-6 rounded bg-muted object-contain p-0.5"
          />
        </div>

        <div class="flex flex-wrap items-center gap-1 text-body-sm-strong">
          <span v-if="year">{{ year }}</span>
          <span>·</span>
          <span class="inline-flex items-center gap-1"><span aria-hidden="true">★</span> {{ ratingText }}</span>
          <span>·</span>
          <span>{{ kindLabel }}</span>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.expandable-title-card-root {
  z-index: 1;
}

/* Rest state is a 2:3 portrait poster. Hover/focus swaps to the backdrop
   and reveals the info overlay at the same height; only the carousel item
   widens (240px -> 540px) so the card extends horizontally and siblings
   are pushed, not overlapped. Desktop fine pointers only. */
.expandable-poster,
.expandable-backdrop {
  transition: opacity 0.5s ease-in-out;
}
.expandable-poster {
  opacity: 1;
}
.expandable-backdrop {
  opacity: 0;
}
.group\/expandable-card:hover .expandable-poster,
.group\/expandable-card:focus-visible .expandable-poster,
.group\/expandable-card:focus-within .expandable-poster {
  opacity: 0;
}
.group\/expandable-card:hover .expandable-backdrop,
.group\/expandable-card:focus-visible .expandable-backdrop,
.group\/expandable-card:focus-within .expandable-backdrop {
  opacity: 1;
}

.expandable-title-card-art {
  isolation: isolate;
}

/* Desktop needs no art overrides: the base crossfade above already shows
   the portrait poster at rest and the backdrop on hover/focus. The art
   height is fixed below so rest (240x360) and expanded (540x360) share the
   same height and the card only extends horizontally. Height never
   animates; only the carousel item widens. */
@media (min-width: 881px) and (hover: hover) and (pointer: fine) {
  .expandable-title-card-art {
    /* 360 = 240px item width x 3/2. Keep in sync with the item width in
       title-carousel-section.vue; expanded 540x360 keeps this height. */
    height: 360px;
  }
}
.expandable-title-card-art::before {
  content: '';
  position: absolute;
  inset: 0;
  top: auto;
  height: 60%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.7) 50%, rgba(0, 0, 0, 0) 100%);
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
  z-index: 2;
  pointer-events: none;
}
.group\/expandable-card:hover .expandable-title-card-art::before,
.group\/expandable-card:focus-visible .expandable-title-card-art::before,
.group\/expandable-card:focus-within .expandable-title-card-art::before {
  opacity: 1;
}

.expandable-overlay-content {
  position: absolute;
  inset: 0;
  top: auto;
  height: 60%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4px;
  padding: 12px;
  z-index: 3;
  color: #fff;
  overflow-wrap: anywhere;
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
  pointer-events: none;
}
.group\/expandable-card:hover .expandable-overlay-content,
.group\/expandable-card:focus-visible .expandable-overlay-content,
.group\/expandable-card:focus-within .expandable-overlay-content {
  opacity: 1;
}

.discovery-badge {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 4;
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: var(--text-caption-sm);
  letter-spacing: 0.06em;
  font-weight: 800;
  padding: 6px 11px;
  border-radius: 0 12px 0 8px;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}

/* Below the tablet breakpoint and on touch/coarse pointers there is no
   expansion: the row stays a scrollable poster carousel. */
@media (max-width: 880px) {
  .group\/expandable-card:hover .expandable-poster,
  .group\/expandable-card:focus-visible .expandable-poster,
  .group\/expandable-card:focus-within .expandable-poster {
    opacity: 1;
  }
  .group\/expandable-card:hover .expandable-backdrop,
  .group\/expandable-card:focus-visible .expandable-backdrop,
  .group\/expandable-card:focus-within .expandable-backdrop,
  .group\/expandable-card:hover .expandable-overlay-content,
  .group\/expandable-card:focus-visible .expandable-overlay-content,
  .group\/expandable-card:focus-within .expandable-overlay-content,
  .group\/expandable-card:hover .expandable-title-card-art::before,
  .group\/expandable-card:focus-visible .expandable-title-card-art::before,
  .group\/expandable-card:focus-within .expandable-title-card-art::before {
    opacity: 0;
  }
}
@media (hover: none) {
  .expandable-backdrop,
  .expandable-overlay-content {
    display: none;
  }
  .expandable-title-card-art::before {
    display: none;
  }
}
@media (pointer: coarse) {
  .expandable-backdrop,
  .expandable-overlay-content {
    display: none;
  }
  .expandable-title-card-art::before {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .expandable-title-card-art,
  .expandable-poster,
  .expandable-backdrop,
  .expandable-overlay-content,
  .expandable-title-card-art::before {
    transition: none;
  }
}
</style>
