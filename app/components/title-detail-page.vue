<script setup lang="ts">
/* eslint-disable style/quote-props */
import type { RatingLabel } from '#server/db/schema/rating'
import type { WatchStatus } from '#server/db/schema/title-status'
import type { Kind } from '#server/tmdb/types'
import { ArrowLeft } from '@lucide/vue'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead, useRoute, useSiteConfig } from '#imports'
import * as _imports from '#imports'
import { useMediaLightboxState } from '../composables/use-media-lightbox'
import { useTitleDetail } from '../composables/use-title-detail'
import { useTitleRating } from '../composables/use-title-rating'
import { useTitleStatus } from '../composables/use-title-status'
import { useTrailerState } from '../composables/use-trailer'
import { authClient, signIn } from '../lib/auth-client'
import { backdropUrl, posterUrl } from '../lib/images'
import { buildCanonicalUrl, buildDetailDescription, buildDetailTitle, extractYear, getOgLocale, getOgLocaleAlternate } from '../lib/seo'
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
  return JSON.stringify(base)
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

watch([ogImageTitle, ogImageDescription, ogImageYear], ([title, description, year]) => {
  try {
    const _defineOgImage = (_imports as unknown as { defineOgImage?: (component: string, props?: Record<string, unknown>) => void }).defineOgImage
    if (typeof _defineOgImage === 'function') {
      _defineOgImage('SpudTube', {
        title,
        description,
        year,
      } as unknown as Record<string, unknown>)
    }
  }
  catch {}
}, { immediate: true })

const session = authClient.useSession()
const signedIn = computed(() => session.value.data?.user != null)

const { label: rating, pending: ratingPending, rate, clear } = useTitleRating(props.kind, titleId, signedIn)
const { status, pending: statusPending, set, clear: clearStatus } = useTitleStatus(props.kind, titleId, signedIn)

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
  void clear()
}

function onSetStatus(next: WatchStatus): void {
  void set(next)
}

function onClearStatus(): void {
  void clearStatus()
}

function onSignInRequested(): void {
  void signIn.social({ provider: 'google' })
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
        :rating-pending="ratingPending"
        :status-pending="statusPending"
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
  </div>
</template>
