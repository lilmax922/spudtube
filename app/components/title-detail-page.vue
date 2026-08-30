<script setup lang="ts">
import type { RatingLabel } from '#server/db/schema/rating'
import type { WatchStatus } from '#server/db/schema/title-status'
import type { Kind } from '#server/tmdb/types'
import { ArrowLeft } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from '#imports'
import { useTitleDetail } from '../composables/use-title-detail'
import { useTitleRating } from '../composables/use-title-rating'
import { useTitleStatus } from '../composables/use-title-status'
import { useTrailerState } from '../composables/use-trailer'
import { authClient, signIn } from '../lib/auth-client'
import AvailabilityPanel from './availability-panel.vue'
import CastList from './cast-list.vue'
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

const trailerOpen = ref(false)
const { open: openTrailerGlobal, close: closeTrailerGlobal } = useTrailerState()

watch(trailerOpen, (value) => {
  if (value)
    openTrailerGlobal()
  else closeTrailerGlobal()
})

function onPlayTrailer(): void {
  trailerOpen.value = true
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
        <TitleFactsPanel :detail="detail.data.value" />
        <AvailabilityPanel :kind="detail.data.value.kind" :tmdb-id="detail.data.value.tmdbId" />
        <CastList :cast="detail.data.value.cast" :crew="detail.data.value.crew" />
        <MediaStrip :paths="detail.data.value.backdrops" />
        <div class="mt-8 border-t border-border pt-8">
          <RecommendationsStrip :titles="recommendations.data.value?.results ?? []" />
        </div>
      </div>
    </template>
  </div>
</template>
