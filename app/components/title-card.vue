<script setup lang="ts">
import type { TitleSummary } from '#server/tmdb/types'
import { Clapperboard } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAvailability } from '../composables/use-availability'
import { useDiscoveryBadges } from '../composables/use-discovery-badges'
import { useRegion } from '../composables/use-region'
import { posterSrcSet, posterUrl, providerLogoSrcSet, providerLogoUrl } from '../lib/images'
import { kindLabelKey, titleDetailPath } from '../lib/kind'

const props = withDefaults(defineProps<{ title: TitleSummary, showKind?: boolean, overview?: string }>(), {
  showKind: false,
  overview: undefined,
})

const { t } = useI18n()

const imageFailed = ref(false)

const posterSrc = computed(() =>
  props.title.posterPath ? posterUrl(props.title.posterPath) : null,
)

const year = computed(() => props.title.releaseDate?.slice(0, 4) ?? null)

const kindLabel = computed(() => t(kindLabelKey(props.title.kind)))

const HOVER_PROVIDER_LIMIT = 6

const { badges } = useDiscoveryBadges(props.title.kind)

// Labels only ever come from real TMDB list membership (/trending/{kind}/week, /{kind}/top_rated);
// there is deliberately no vote-threshold fallback because that would fabricate status.
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

const hoverDescription = computed(() => {
  const overview = props.overview ?? props.title.overview ?? null
  return overview != null && overview.trim().length > 0 ? overview : null
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
    class="group/title-card title-card-root relative flex flex-col rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/20"
    tabindex="0"
    @mouseenter="markInspected"
    @focusin="markInspected"
  >
    <div class="title-card-art relative aspect-[16/9] overflow-hidden rounded-xl bg-muted shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
      <span
        v-if="showKind"
        data-testid="kind-badge"
        class="absolute left-2 top-2 z-[2] rounded-md bg-background/70 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground backdrop-blur"
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
        v-if="posterSrc && !imageFailed"
        :src="posterSrc"
        :srcset="posterSrcSet(props.title.posterPath)"
        sizes="180px sm:240px md:320px"
        :alt="title.name"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover transition-transform duration-300 group-hover/title-card:scale-105"
        @error="imageFailed = true"
      />
      <div
        v-else
        class="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-muted-foreground"
      >
        <Clapperboard :size="24" :stroke-width="1.75" aria-hidden="true" />
        <span class="line-clamp-3 text-xs leading-snug">{{ title.name }}</span>
      </div>

      <div class="title-card-hover-bar">
        <span class="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[11px] font-bold text-foreground backdrop-blur">
          <span aria-hidden="true">★</span> {{ ratingText }}
        </span>
      </div>
    </div>

    <h3 class="mt-2 line-clamp-2 text-sm font-medium text-foreground">
      {{ title.name }}
    </h3>
    <p v-if="year" class="mt-0.5 text-xs tabular-nums text-muted-foreground">
      {{ year }}
    </p>

    <div class="hover-card" aria-hidden="true">
      <div class="hover-card-art relative aspect-[16/9] overflow-hidden rounded-t-xl bg-muted">
        <NuxtImg
          v-if="posterSrc && !imageFailed"
          :src="posterSrc"
          :srcset="posterSrcSet(props.title.posterPath)"
          sizes="180px sm:240px md:320px"
          :alt="title.name"
          loading="lazy"
          decoding="async"
          class="h-full w-full object-cover"
        />
        <div
          v-else
          class="flex h-full w-full items-center justify-center bg-muted text-muted-foreground"
        >
          <Clapperboard :size="28" :stroke-width="1.75" aria-hidden="true" />
        </div>
      </div>

      <div class="hover-card-body flex flex-col gap-2 bg-popover p-4 text-popover-foreground">
        <div class="hover-card-title line-clamp-2 text-[17px] font-extrabold leading-tight tracking-tight">
          {{ title.name }}
        </div>

        <div v-if="hoverProviders.length > 0" data-testid="provider-strip" class="flex items-center gap-1.5">
          <NuxtImg
            v-for="provider in hoverProviders"
            :key="provider.id"
            :src="providerLogoUrl(provider.logoPath) ?? undefined"
            :srcset="providerLogoSrcSet(provider.logoPath) ?? undefined"
            sizes="24px"
            :alt="provider.name"
            :title="provider.name"
            loading="lazy"
            decoding="async"
            class="h-6 w-6 rounded-md bg-muted object-contain p-0.5"
          />
        </div>

        <div class="hover-card-meta flex flex-wrap items-center gap-1.5 text-[11.5px] font-medium">
          <span v-if="discoveryBadge" class="rounded bg-primary px-1.5 py-0.5 text-[9px] font-extrabold tracking-widest text-primary-foreground">{{ discoveryBadge }}</span>
          <span v-if="year">{{ year }}</span>
          <span>·</span>
          <span class="inline-flex items-center gap-1"><span aria-hidden="true">★</span> {{ ratingText }}</span>
          <span>·</span>
          <span>{{ kindLabel }}</span>
        </div>

        <p v-if="hoverDescription" class="hover-card-desc line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
          {{ hoverDescription }}
        </p>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.title-card-root {
  z-index: 1;
}
.title-card-root:hover {
  z-index: 40;
}

.title-card-art {
  isolation: isolate;
}

.discovery-badge {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 6px 11px;
  border-radius: 0 12px 0 8px;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}

.title-card-hover-bar {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  padding: 10px 10px 8px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.82) 0%, rgba(0, 0, 0, 0) 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
}
.group\/title-card:hover .title-card-hover-bar {
  opacity: 1;
}

.hover-card {
  position: absolute;
  top: -14px;
  left: -24px;
  right: -24px;
  bottom: auto;
  min-height: calc(100% + 28px);
  background: var(--popover);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  transform: translateY(8px) scale(0.96);
  transition: opacity 0.22s, visibility 0.22s, transform 0.22s;
  z-index: 50;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  pointer-events: none;
}

.group\/title-card:hover .hover-card {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.hover-card-title {
  overflow-wrap: anywhere;
}

.hover-card-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 560px) {
  .hover-card {
    display: none;
  }
  .title-card-hover-bar {
    display: none;
  }
}
</style>
