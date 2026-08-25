<script setup lang="ts">
import type { RatingLabel } from '#server/db/schema/rating'
import type { WatchStatus } from '#server/db/schema/title-status'
import type { Kind, Provider } from '#server/tmdb/types'
import { ArrowLeft } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from '#imports'
import { useAvailability } from '../composables/use-availability'
import { useRegion } from '../composables/use-region'
import { useTitleDetail } from '../composables/use-title-detail'
import { useTitleRating } from '../composables/use-title-rating'
import { useTitleStatus } from '../composables/use-title-status'
import { authClient, signIn } from '../lib/auth-client'
import AvailabilityPanel from './availability-panel.vue'
import CastList from './cast-list.vue'
import KeywordsPanel from './keywords-panel.vue'
import MediaStrip from './media-strip.vue'
import RecommendationsStrip from './recommendations-strip.vue'
import TitleFactsPanel from './title-facts-panel.vue'
import TitleIdentityBlock from './title-identity-block.vue'
import TitleNotFound from './title-not-found.vue'
import TitleTrailer from './title-trailer.vue'

interface Props {
  kind: Kind
}
const props = defineProps<Props>()

const route = useRoute()
const { t } = useI18n()

const titleId = computed(() => route.params.id ?? '')

const { detail, recommendations } = useTitleDetail(props.kind, titleId)

const session = authClient.useSession()
const signedIn = computed(() => session.value.data?.user != null)

const { label: rating, pending: ratingPending, rate, clear } = useTitleRating(props.kind, titleId, signedIn)
const { status, pending: statusPending, set, clear: clearStatus } = useTitleStatus(props.kind, titleId, signedIn)

const tmdbId = computed(() => detail.data.value?.tmdbId ?? null)
const { catalog } = useAvailability(props.kind, tmdbId)
const { region } = useRegion()

const heroProviders = computed<Provider[]>(() => {
  const data = catalog.data.value
  if (!data || tmdbId.value == null)
    return []
  const regionData = data[region.value]
  if (!regionData)
    return []
  const groups = regionData.groups
  return [...groups.subscription, ...groups.free, ...groups.rent, ...groups.buy]
})

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
    <p v-if="detail.pending.value" class="mx-auto max-w-[1280px] px-6 py-8 text-muted-foreground">
      {{ t('detail.loading') }}
    </p>
    <div v-else-if="failed" class="mx-auto max-w-[1280px] px-6 py-12 text-center">
      <p class="text-muted-foreground">
        {{ t('detail.error') }}
      </p>
      <NuxtLink
        to="/"
        class="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
      >
        <ArrowLeft :size="16" :stroke-width="1.75" aria-hidden="true" />
        {{ t('detail.notFound.backHome') }}
      </NuxtLink>
    </div>
    <TitleNotFound v-else-if="notFound" />
    <template v-else-if="detail.data.value">
      <TitleIdentityBlock
        :detail="detail.data.value"
        :providers="heroProviders"
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
      />

      <div class="mx-auto w-full max-w-[1280px] px-6">
        <div class="flex items-center gap-2 py-3">
          <NuxtLink
            to="/"
            class="inline-flex min-h-10 items-center gap-1 rounded-full px-3 py-1 text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          >
            <ArrowLeft :size="14" :stroke-width="1.75" aria-hidden="true" />
            {{ t('detail.back') }}
          </NuxtLink>
        </div>

        <div class="grid grid-cols-1 gap-8 py-8 lg:grid-cols-[1fr_320px]">
          <div class="order-1 flex min-w-0 flex-col">
            <AvailabilityPanel :kind="detail.data.value.kind" :tmdb-id="detail.data.value.tmdbId" />
            <TitleTrailer
              v-if="detail.data.value.trailerKey"
              id="trailer-section"
              :trailer-key="detail.data.value.trailerKey"
            />
            <CastList :cast="detail.data.value.cast" />
            <MediaStrip :paths="detail.data.value.backdrops" />
          </div>
          <aside class="order-2 flex flex-col lg:sticky lg:top-6 lg:self-start">
            <TitleFactsPanel :detail="detail.data.value" />
            <KeywordsPanel :keywords="detail.data.value.keywords" />
          </aside>
        </div>
      </div>

      <div class="mx-auto w-full max-w-[1280px] px-6">
        <div class="mt-8 border-t border-border pt-8">
          <RecommendationsStrip :titles="recommendations.data.value?.results ?? []" />
        </div>
      </div>
    </template>
  </div>
</template>
