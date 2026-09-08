<script setup lang="ts">
/* eslint-disable style/quote-props */
import type { Kind } from '#shared/kind/kind'
import type { RatingLabel, WatchStatus } from '#shared/personal-tracking/personal-tracking'
import { ArrowLeft } from '@lucide/vue'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { defineOgImage, useHead, useRoute, useSiteConfig } from '#imports'
import { useMediaLightboxState } from '../composables/use-media-lightbox'
import { usePersonalTracking } from '../composables/use-personal-tracking'
import { useTitleDetail } from '../composables/use-title-detail'
import { useToast } from '../composables/use-toast'
import { useTrailerState } from '../composables/use-trailer'
import { authClient } from '../lib/auth-client'
import { backdropUrl, posterUrl } from '../lib/images'
import { buildCanonicalUrl, buildDetailDescription, buildDetailTitle, extractYear, getOgLocale, getOgLocaleAlternate } from '../lib/seo'
import AuthRequiredModal from './auth-required-modal.vue'
import AvailabilityPanel from './availability-panel.vue'
import CastList from './cast-list.vue'
import MediaLightbox from './media-lightbox.vue'
import MediaStrip from './media-strip.vue'
import RecommendationsStrip from './recommendations-strip.vue'
import TitleIdentityBlock from './title-identity-block.vue'
import TitleNotFound from './title-not-found.vue'
import TitleTrailer from './title-trailer.vue'

interface Props {
  kind: Kind
}
const props = defineProps<Props>()

const route = useRoute()
const { t, locale } = useI18n()

const titleId = computed(() => route.params.id ?? '')

const { detail, recommendations } = useTitleDetail(props.kind, titleId)

const siteConfig = useSiteConfig()

const detailData = computed(() => detail.data.value ?? null)
const seoTitle = computed(() => {
  const d = detailData.value
  if (d == null)
    return undefined
  return buildDetailTitle(d.name, d.releaseDate)
})
const seoDescription = computed(() => {
  const d = detailData.value
  if (d == null)
    return undefined
  return buildDetailDescription(d.overview, d.name, d.releaseDate, (locale.value as 'zh-TW' | 'en'))
})
const ogLocale = computed(() => getOgLocale(locale.value))
const ogLocaleAlternate = computed(() => getOgLocaleAlternate(locale.value))
const canonicalUrl = computed(() => buildCanonicalUrl(siteConfig.url as string | undefined, route.path))

const schemaImage = computed(() => {
  const d = detailData.value
  if (d == null)
    return undefined
  if (d.posterPath)
    return posterUrl(d.posterPath) ?? undefined
  if (d.backdropPath)
    return backdropUrl(d.backdropPath) ?? undefined
  return undefined
})

const ldJsonContent = computed(() => {
  const d = detailData.value
  if (d == null)
    return null
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': props.kind === 'MOVIE' ? 'Movie' : 'TVSeries',
    name: d.name,
    genre: d.genres.map(g => g.name),
  }
  if (schemaImage.value)
    base.image = schemaImage.value
  if (d.releaseDate)
    base.datePublished = d.releaseDate
  if (d.voteAverage != null) {
    base.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: d.voteAverage,
      bestRating: 10,
      worstRating: 0,
    }
  }
  // Escape `<` so a TMDB-controlled string can never break out of the
  // application/ld+json script block. `\u003c` is valid JSON and parses
  // back to `<`, so consumers are unaffected.
  return JSON.stringify(base).replace(/</g, '\\u003c')
})

useHead(() => {
  if (detailData.value == null) {
    return {
      meta: [
        { property: 'og:locale', content: ogLocale.value },
        { property: 'og:locale:alternate', content: ogLocaleAlternate.value },
      ],
    }
  }
  const head: Record<string, unknown> = {
    title: seoTitle.value,
    titleTemplate: '%s',
    link: [{ rel: 'canonical', href: canonicalUrl.value }],
    meta: [
      { name: 'description', content: seoDescription.value },
      { property: 'og:title', content: seoTitle.value },
      { property: 'og:description', content: seoDescription.value },
      { property: 'og:locale', content: ogLocale.value },
      { property: 'og:locale:alternate', content: ogLocaleAlternate.value },
    ],
  }
  if (ldJsonContent.value) {
    ;(head as { script?: unknown[] }).script = [
      { key: 'schema-org', type: 'application/ld+json', innerHTML: ldJsonContent.value },
    ]
  }
  return head
})

const ogImageTitle = computed(() => seoTitle.value ?? detailData.value?.name ?? 'SpudTube')
const ogImageDescription = computed(() => seoDescription.value ?? undefined)
const ogImageYear = computed(() => {
  const d = detailData.value
  if (d == null || d.releaseDate == null)
    return undefined
  return extractYear(d.releaseDate) ?? undefined
})

defineOgImage('SpudTube', { title: ogImageTitle, description: ogImageDescription, year: ogImageYear })

const session = authClient.useSession()
const signedIn = computed(() => session.value.data?.user != null)

const { state: tracking, pending: trackingPending, rate, setStatus, clear } = usePersonalTracking(props.kind, titleId, signedIn)
const { showToast } = useToast()

const rating = computed(() => tracking.value.rating)
const status = computed(() => tracking.value.status)

const trailerOpen = shallowRef(false)
const { open: openTrailerGlobal, close: closeTrailerGlobal } = useTrailerState()

watch(trailerOpen, (value) => {
  if (value)
    openTrailerGlobal()
  else closeTrailerGlobal()
})

const mediaLightboxOpen = shallowRef(false)
const mediaLightboxIndex = shallowRef(0)
const { open: openMediaGlobal, close: closeMediaGlobal } = useMediaLightboxState()

watch(mediaLightboxOpen, (value) => {
  if (value)
    openMediaGlobal()
  else closeMediaGlobal()
})

function onPlayTrailer(): void {
  trailerOpen.value = true
}

function onOpenMedia(index: number): void {
  mediaLightboxIndex.value = index
  mediaLightboxOpen.value = true
}

function onSelectRating(label: RatingLabel): void {
  void rate(label)
}

function onClearRating(): void {
  void clear('rating')
}

function statusToastMessage(next: WatchStatus | null, target: WatchStatus): string {
  if (target === 'WATCHLISTED')
    return next ? t('watchStatus.toast.watchlistAdded') : t('watchStatus.toast.watchlistRemoved')
  return next ? t('watchStatus.toast.watchedAdded') : t('watchStatus.toast.watchedRemoved')
}

async function onSetStatus(next: WatchStatus): Promise<void> {
  const previous = tracking.value.status
  await setStatus(next)
  const settled = tracking.value.status
  if (settled === previous)
    return
  showToast({
    message: statusToastMessage(settled, next),
    actionLabel: t('watchStatus.toast.undo'),
    onAction: () => {
      if (previous == null)
        void clear('status')
      else
        void setStatus(previous)
    },
  })
}

async function onClearStatus(): Promise<void> {
  const previous = tracking.value.status
  if (previous == null)
    return
  await clear('status')
  const settled = tracking.value.status
  if (settled === previous)
    return
  showToast({
    message: statusToastMessage(settled, previous),
    actionLabel: t('watchStatus.toast.undo'),
    onAction: () => {
      void setStatus(previous)
    },
  })
}

const authModalOpen = shallowRef(false)

function onSignInRequested(): void {
  authModalOpen.value = true
}

const notFound = computed(() => {
  if (detail.pending.value)
    return false
  if (detail.data.value == null && detail.error.value == null)
    return true
  return detail.error.value?.statusCode === 400
})
const failed = computed(() => {
  if (detail.pending.value || detail.error.value == null)
    return false
  return detail.error.value.statusCode !== 400
})
</script>

<template>
  <div>
    <p v-if="detail.pending.value" class="mx-auto max-w-[var(--max-content-width)] px-[var(--content-gutter)] py-8 text-muted-foreground">
      {{ t('detail.loading') }}
    </p>
    <div v-else-if="failed" class="mx-auto max-w-[var(--max-content-width)] px-[var(--content-gutter)] py-12 text-center">
      <p class="text-muted-foreground">
        {{ t('detail.error') }}
      </p>
      <NuxtLink
        to="/"
        class="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-button-md text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
      >
        <ArrowLeft :size="16" :stroke-width="1.75" aria-hidden="true" />
        {{ t('detail.notFound.backHome') }}
      </NuxtLink>
    </div>
    <TitleNotFound v-else-if="notFound" />
    <template v-else-if="detail.data.value">
      <TitleIdentityBlock
        :detail="detail.data.value"
        :rating="rating"
        :status="status"
        :signed-in="signedIn"
        :rating-pending="trackingPending"
        :status-pending="trackingPending"
        @select-rating="onSelectRating"
        @clear-rating="onClearRating"
        @set-status="onSetStatus"
        @clear-status="onClearStatus"
        @sign-in-requested="onSignInRequested"
        @play-trailer="onPlayTrailer"
      />

      <TitleTrailer
        v-if="detail.data.value.trailerKey"
        v-model:open="trailerOpen"
        :trailer-key="detail.data.value.trailerKey"
      />

      <div class="mx-auto w-full max-w-[var(--max-content-width)] px-[var(--content-gutter)]">
        <AvailabilityPanel :kind="detail.data.value.kind" :tmdb-id="detail.data.value.tmdbId" />
        <CastList :cast="detail.data.value.cast" :crew="detail.data.value.crew" />
        <MediaStrip :paths="detail.data.value.backdrops" @open="onOpenMedia" />
        <MediaLightbox
          v-model:open="mediaLightboxOpen"
          :paths="detail.data.value.backdrops"
          :initial-index="mediaLightboxIndex"
        />
      </div>
      <RecommendationsStrip :titles="recommendations.data.value?.results ?? []" />
    </template>
    <AuthRequiredModal v-model:open="authModalOpen" />
  </div>
</template>
