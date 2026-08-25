<script setup lang="ts">
import type { TitleSummary } from '#server/tmdb/types'
import { Clapperboard } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { kindLabelKey, titleDetailPath } from '../lib/kind'
import { posterUrl } from '../lib/tmdb-image'

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

const discoveryBadge = computed(() => {
  const rating = props.title.voteAverage ?? 0
  if (rating >= 8.5)
    return 'TOP RATED'
  if (rating >= 8)
    return 'MOST LIKED'
  if (rating >= 7.2)
    return 'TRENDING'
  return ''
})

const maturity = computed(() => {
  const rating = props.title.voteAverage ?? 0
  if (rating >= 8.6)
    return 'ALL'
  return '16+'
})

const ratingText = computed(() => {
  const v = props.title.voteAverage
  return v != null ? v.toFixed(1) : '—'
})

const hoverDescription = computed(() => {
  if (props.overview && props.overview.trim().length > 0)
    return props.overview
  return t('detail.notFound.body')
})
</script>

<template>
  <NuxtLink
    :to="titleDetailPath(title.kind, title.tmdbId)"
    class="group/title-card title-card-root relative flex flex-col rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/20"
    tabindex="0"
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
        class="discovery-badge"
      >
        {{ discoveryBadge }}
      </span>

      <img
        v-if="posterSrc && !imageFailed"
        :src="posterSrc"
        :alt="title.name"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-300 group-hover/title-card:scale-105"
        @error="imageFailed = true"
      >
      <div
        v-else
        class="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-muted-foreground"
      >
        <Clapperboard :size="24" :stroke-width="1.75" aria-hidden="true" />
        <span class="line-clamp-3 text-xs leading-snug">{{ title.name }}</span>
      </div>

      <div class="title-card-hover-bar">
        <span class="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
          <span class="text-[#facc15]">★</span> {{ ratingText }}
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
        <img
          v-if="posterSrc && !imageFailed"
          :src="posterSrc"
          :alt="title.name"
          loading="lazy"
          class="h-full w-full object-cover"
        >
        <div
          v-else
          class="flex h-full w-full items-center justify-center bg-muted text-muted-foreground"
        >
          <Clapperboard :size="28" :stroke-width="1.75" aria-hidden="true" />
        </div>
      </div>

      <div class="hover-card-body flex flex-col gap-2 bg-[#0a0a0a] p-4">
        <div class="hover-card-title line-clamp-2 text-[17px] font-extrabold leading-tight tracking-tight text-white">
          {{ title.name }}
        </div>

        <div class="flex items-center gap-1.5 text-xs font-semibold text-[#facc15]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#facc15" stroke="#facc15"><path d="M9.5 2.2a5.5 5.5 0 0 1 5 0l1 1h.01" stroke-width="1.2" fill="none" /><path d="M6 7V6a6 6 0 0 1 12 0v1" /><rect x="3" y="7" width="18" height="13" rx="2" /></svg>
          Watch options available
        </div>

        <div class="hover-card-meta flex flex-wrap items-center gap-1.5 text-[11.5px] font-medium text-white/65">
          <span v-if="discoveryBadge" class="rounded bg-white px-1.5 py-0.5 text-[9px] font-extrabold tracking-widest text-black">{{ discoveryBadge }}</span>
          <span class="rounded border border-white/25 px-1.5 py-0.5 text-[11px] font-semibold text-white/85">{{ maturity }}</span>
          <span v-if="year">{{ year }}</span>
          <span>·</span>
          <span class="inline-flex items-center gap-1"><span class="text-[#facc15]">★</span> {{ ratingText }}</span>
          <span>·</span>
          <span>{{ kindLabel }}</span>
        </div>

        <p class="hover-card-desc line-clamp-2 text-[12.5px] leading-relaxed text-white/80">
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
  background: #fff;
  color: #000;
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
  background: #0a0a0a;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  transform: translateY(8px) scale(0.96);
  transition: opacity 0.22s, visibility 0.22s, transform 0.22s;
  z-index: 50;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.82), 0 8px 20px rgba(0, 0, 0, 0.5);
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
