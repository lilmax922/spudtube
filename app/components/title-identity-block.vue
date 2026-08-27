<script setup lang="ts">
import type { RatingLabel } from '#server/db/schema/rating'
import type { WatchStatus } from '#server/db/schema/title-status'
import type { TitleDetail } from '#server/tmdb/types'
import { Play } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { backdropUrl } from '../lib/images'
import { kindLabelKey } from '../lib/kind'
import RatingTrio from './rating-trio.vue'
import TitleStatusToggle from './title-status-toggle.vue'
import { Badge } from './ui/badge'

interface Props {
  detail: TitleDetail
  rating?: RatingLabel | null
  status?: WatchStatus | null
  signedIn?: boolean
  ratingPending?: boolean
  statusPending?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  rating: null,
  status: null,
  signedIn: false,
  ratingPending: false,
  statusPending: false,
})

const emit = defineEmits<{
  selectRating: [label: RatingLabel]
  clearRating: []
  setStatus: [status: WatchStatus]
  clearStatus: []
  signInRequested: []
  playTrailer: []
}>()

const { t } = useI18n()

const backdrop = computed(() => backdropUrl(props.detail.backdropPath))
const year = computed(() => props.detail.releaseDate?.slice(0, 4) ?? null)
const hasRuntime = computed(() => props.detail.runtimeMinutes != null)
const kindLabel = computed(() => t(kindLabelKey(props.detail.kind)))

const hasTrailer = computed(() => props.detail.trailerKey != null && props.detail.trailerKey !== '')

const ratingScore = computed(() => {
  const v = props.detail.voteAverage
  return v != null ? v.toFixed(1) : null
})

function playTrailer(): void {
  if (!hasTrailer.value)
    return
  emit('playTrailer')
}
</script>

<template>
  <section class="relative isolate flex min-h-[56vh] items-center overflow-hidden px-6 py-10 md:min-h-[72vh] md:py-14">
    <img
      v-if="backdrop"
      :src="backdrop"
      alt=""
      class="absolute inset-0 h-full w-full object-cover"
      aria-hidden="true"
    >
    <div
      v-if="backdrop"
      class="absolute inset-0 bg-black/35"
      aria-hidden="true"
    />
    <div
      v-else
      class="absolute inset-0 bg-card"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute inset-0"
      aria-hidden="true"
      style="background: linear-gradient(to right, rgba(0,0,0,.72) 0%, rgba(0,0,0,.45) 18%, transparent 32%, transparent 68%, rgba(0,0,0,.45) 82%, rgba(0,0,0,.72) 100%), linear-gradient(to top, rgba(0,0,0,.78) 0%, rgba(0,0,0,.28) 38%, transparent 60%)"
    />

    <div class="relative flex w-full flex-col justify-end pb-10 pt-48 md:pb-14">
      <div class="max-w-[620px]">
        <h1 class="text-[30px] font-extrabold leading-[1.15] tracking-[-0.02em] text-white md:text-[34px]">
          {{ detail.name }}
        </h1>

        <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold text-white/88">
          <span>{{ kindLabel }}</span>
          <template v-for="genre in detail.genres" :key="genre.id">
            <span aria-hidden="true" class="text-white/35">·</span>
            <span>{{ genre.name }}</span>
          </template>
          <Badge
            v-if="detail.contentRating"
            variant="secondary"
            class="ml-1 text-[11px] font-bold"
          >
            {{ detail.contentRating }}
          </Badge>
        </div>

        <p
          v-if="detail.overview"
          class="mt-3 line-clamp-3 max-w-[30vw] text-sm font-normal leading-[1.7] text-white/88"
        >
          {{ detail.overview }}
        </p>

        <div class="mt-5 flex flex-wrap items-center gap-3">
          <button
            v-if="hasTrailer"
            type="button"
            class="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            :aria-label="t('detail.playTrailer')"
            @click="playTrailer"
          >
            <Play :size="16" :stroke-width="1.75" fill="currentColor" aria-hidden="true" />
            {{ t('detail.playTrailer') }}
          </button>
          <RatingTrio
            :label="rating"
            :signed-in="signedIn"
            :pending="ratingPending"
            @select="emit('selectRating', $event)"
            @clear="emit('clearRating')"
            @sign-in-requested="emit('signInRequested')"
          />
          <TitleStatusToggle
            :status="status"
            :signed-in="signedIn"
            :pending="statusPending"
            @set-status="emit('setStatus', $event)"
            @clear-status="emit('clearStatus')"
            @sign-in-requested="emit('signInRequested')"
          />
        </div>

        <div
          v-if="year || hasRuntime || ratingScore"
          class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium tabular-nums text-white/70"
        >
          <span v-if="year">{{ year }}</span>
          <span v-if="year && hasRuntime" aria-hidden="true" class="text-white/35">·</span>
          <span v-if="hasRuntime">{{ t('detail.runtimeMinutes', { minutes: detail.runtimeMinutes }) }}</span>
          <template v-if="ratingScore">
            <span aria-hidden="true" class="text-white/35">·</span>
            <span class="inline-flex items-center gap-1.5 font-semibold text-white/88">
              <svg viewBox="0 0 24 24" fill="currentColor" class="size-[13px]" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></svg>
              {{ ratingScore }}
            </span>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
