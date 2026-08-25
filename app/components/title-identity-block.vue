<script setup lang="ts">
import type { RatingLabel } from '#server/db/schema/rating'
import type { WatchStatus } from '#server/db/schema/title-status'
import type { TitleDetail } from '#server/tmdb/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { backdropUrl, posterUrl } from '../lib/images'
import { kindLabelKey } from '../lib/kind'
import RatingTrio from './rating-trio.vue'
import TitleStatusToggle from './title-status-toggle.vue'

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
}>()

const { t } = useI18n()

const poster = computed(() => posterUrl(props.detail.posterPath))
const backdrop = computed(() => backdropUrl(props.detail.backdropPath))
const year = computed(() => props.detail.releaseDate?.slice(0, 4) ?? null)
const hasRuntime = computed(() => props.detail.runtimeMinutes != null)
const hasGenres = computed(() => props.detail.genres.length > 0)
const kindLabel = computed(() => t(kindLabelKey(props.detail.kind)))
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
      style="background: linear-gradient(to right, rgba(0,0,0,.72) 0%, rgba(0,0,0,.45) 18%, transparent 32%, transparent 68%, rgba(0,0,0,.45) 82%, rgba(0,0,0,.72) 100%), linear-gradient(to top, rgba(0,0,0,.62) 0%, rgba(0,0,0,.22) 36%, transparent 58%)"
    />

    <div class="relative mx-auto flex w-full max-w-[1280px] flex-col gap-7 md:flex-row md:items-end">
      <div class="w-[160px] shrink-0 md:w-[200px]">
        <div class="aspect-[2/3] overflow-hidden rounded-[var(--radius)] bg-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.25)] ring-1 ring-white/12 backdrop-blur-sm">
          <img
            v-if="poster"
            :src="poster"
            :alt="detail.name"
            class="h-full w-full object-cover"
          >
          <div
            v-else
            class="flex h-full w-full items-center justify-center bg-white/[0.06] text-4xl font-extrabold tracking-tight text-white/80"
            aria-hidden="true"
          >
            {{ detail.name.slice(0, 1).toUpperCase() }}
          </div>
        </div>
      </div>

      <div class="flex min-w-0 max-w-[560px] flex-1 flex-col">
        <h1 class="text-[30px] font-extrabold leading-[1.15] tracking-[-0.02em] text-white">
          {{ detail.name }}
          <span v-if="year" class="ml-2 text-xl font-semibold tabular-nums tracking-normal text-white/62"> {{ year }}</span>
        </h1>

        <div class="mt-2.5 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-white/88">
          <span class="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11.5px] font-semibold tracking-wide text-white/92 backdrop-blur-sm">
            {{ kindLabel }}
          </span>
          <span v-if="hasRuntime" class="tabular-nums">
            {{ t('detail.runtimeMinutes', { minutes: detail.runtimeMinutes }) }}
          </span>
          <span v-if="hasRuntime && hasGenres" aria-hidden="true" class="text-white/35">·</span>
          <span class="flex flex-wrap items-center gap-1.5">
            <span
              v-for="genre in detail.genres"
              :key="genre.id"
              class="rounded-full bg-white/10 px-2 py-0.5 text-[11.5px] font-medium text-white/80 ring-1 ring-white/10 backdrop-blur-sm"
            >
              {{ genre.name }}
            </span>
            <span v-if="!hasGenres && !hasRuntime" class="text-white/60">—</span>
          </span>
          <span v-if="detail.voteAverage != null" class="ml-1 inline-flex items-center gap-1 rounded-[6px] border border-white/25 bg-white/10 px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-white backdrop-blur-sm">
            ★ {{ detail.voteAverage.toFixed(1) }}
          </span>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-3">
          <RatingTrio
            :label="rating"
            :signed-in="signedIn"
            :pending="ratingPending"
            :vote-average="detail.voteAverage"
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

        <p v-if="detail.tagline" class="mt-4 text-sm font-normal italic leading-[1.7] text-white/85">
          “{{ detail.tagline }}”
        </p>
        <p v-if="detail.overview" class="mt-3 max-w-2xl text-sm font-normal leading-[1.7] text-white/88">
          {{ detail.overview }}
        </p>
        <p v-else class="mt-3 text-sm text-white/55">
          暫無簡介
        </p>
      </div>
    </div>
  </section>
</template>
