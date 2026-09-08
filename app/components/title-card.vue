<script setup lang="ts">
import type { TitleSummary } from '#server/tmdb/types'
import type { TitleCardFeed } from '../composables/use-title-card-data'
import { Clapperboard } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useTitleCardData } from '../composables/use-title-card-data'
import { resolveHoverDescription } from '../lib/card-display'
import { titleDetailPath } from '../lib/kind'

const props = withDefaults(defineProps<{ title: TitleSummary, showKind?: boolean, feed?: TitleCardFeed }>(), {
  showKind: false,
  feed: undefined,
})

const imageFailed = ref(false)

const { kindLabel, discoveryBadge, ratingText, year, poster, providerLogos, markInspected } = useTitleCardData(() => props.title, () => props.feed)

const hoverDescription = computed(() => resolveHoverDescription(props.title.overview))
</script>

<template>
  <NuxtLink
    :to="titleDetailPath(title.kind, title.tmdbId)"
    class="group/title-card title-card-root relative flex flex-col rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/20"
    tabindex="0"
    @mouseenter="markInspected"
    @focusin="markInspected"
  >
    <div class="title-card-art relative aspect-[2/3] overflow-hidden rounded-xl bg-muted shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
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
        v-if="poster && !imageFailed"
        :src="poster.src"
        :srcset="poster.srcset"
        sizes="240px sm:240px md:320px"
        :alt="title.name"
        loading="lazy"
        decoding="async"
        class="title-card-poster h-full w-full object-cover"
        @error="imageFailed = true"
      />
      <div
        v-else
        class="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-muted-foreground"
      >
        <Clapperboard :size="24" :stroke-width="1.75" aria-hidden="true" />
        <span class="line-clamp-3 text-caption-sm leading-snug">{{ title.name }}</span>
      </div>

      <div class="hover-overlay-content">
        <div class="line-clamp-2 text-caption-md font-bold leading-tight tracking-tight">
          {{ title.name }}
        </div>

        <div v-if="providerLogos.length > 0" data-testid="provider-strip" class="flex items-center gap-1.5">
          <NuxtImg
            v-for="provider in providerLogos"
            :key="provider.id"
            :src="provider.src"
            :srcset="provider.srcset"
            sizes="24px"
            :alt="provider.name"
            :title="provider.name"
            loading="lazy"
            decoding="async"
            class="h-5 w-5 rounded bg-muted object-contain p-0.5"
          />
        </div>

        <div class="flex flex-wrap items-center gap-1 text-caption-sm font-medium">
          <span v-if="year">{{ year }}</span>
          <span>·</span>
          <span class="inline-flex items-center gap-1"><span aria-hidden="true">★</span> {{ ratingText }}</span>
          <span>·</span>
          <span>{{ kindLabel }}</span>
        </div>

        <p v-if="hoverDescription" class="line-clamp-2 text-caption-sm leading-relaxed text-muted-foreground">
          {{ hoverDescription }}
        </p>
      </div>
    </div>

    <div class="hover-card" aria-hidden="true" />
  </NuxtLink>
</template>

<style scoped>
.title-card-root {
  z-index: 1;
  transition: box-shadow 0.22s;
}
.title-card-poster {
  transition: transform 0.3s;
}
/* Hover visuals are mouse-only: touch drag over a card synthesizes :hover
   and would otherwise flash the mask mid-swipe. */
@media (hover: hover) and (pointer: fine) {
  .title-card-root:hover {
    z-index: 5;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
  }
  .group\/title-card:hover .title-card-poster {
    transform: scale(1.05);
  }
  .group\/title-card:hover .title-card-art::before {
    opacity: 1;
  }
  .group\/title-card:hover .hover-overlay-content {
    opacity: 1;
  }
}

.title-card-art {
  isolation: isolate;
}
.title-card-art::before {
  content: '';
  position: absolute;
  inset: 0;
  top: auto;
  height: 60%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.7) 50%, rgba(0, 0, 0, 0) 100%);
  opacity: 0;
  transition: opacity 0.22s;
  z-index: 2;
  pointer-events: none;
}

.hover-overlay-content {
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
  transition: opacity 0.22s;
  pointer-events: none;
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

.hover-card {
  display: none;
}
</style>
