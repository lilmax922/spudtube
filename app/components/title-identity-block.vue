<script setup lang="ts">
import type { RatingLabel } from '#server/db/schema/rating'
import type { TitleDetail } from '#server/tmdb/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { backdropUrl, posterUrl } from '../lib/images'
import RatingTrio from './rating-trio.vue'

interface Props {
  detail: TitleDetail
  rating?: RatingLabel | null
  signedIn?: boolean
  ratingPending?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  rating: null,
  signedIn: false,
  ratingPending: false,
})

const emit = defineEmits<{
  selectRating: [label: RatingLabel]
  clearRating: []
  signInRequested: []
}>()

const { t } = useI18n()

const poster = computed(() => posterUrl(props.detail.posterPath))
const backdrop = computed(() => backdropUrl(props.detail.backdropPath))
const year = computed(() => props.detail.releaseDate?.slice(0, 4) ?? null)
const hasRuntime = computed(() => props.detail.runtimeMinutes != null)
const hasGenres = computed(() => props.detail.genres.length > 0)
const showMetarow = computed(() => hasRuntime.value || hasGenres.value)
</script>

<template>
  <section class="relative overflow-hidden rounded-xl border border-border">
    <img
      v-if="backdrop"
      :src="backdrop"
      alt=""
      class="absolute inset-0 h-full w-full object-cover"
      aria-hidden="true"
    >
    <div
      v-if="backdrop"
      class="absolute inset-0 bg-background/80"
      aria-hidden="true"
    />

    <div class="relative flex flex-col gap-6 p-9 md:flex-row md:gap-7">
      <div class="w-[160px] shrink-0 md:w-[200px]">
        <div class="aspect-[2/3] overflow-hidden rounded-md bg-muted shadow-lg">
          <img
            v-if="poster"
            :src="poster"
            :alt="detail.name"
            class="h-full w-full object-cover"
          >
        </div>
      </div>

      <div class="flex min-w-0 flex-1 flex-col">
        <h1 class="text-2xl font-bold tracking-tight text-foreground">
          {{ detail.name }}
          <span v-if="year" class="text-xl font-semibold text-muted-foreground">({{ year }})</span>
        </h1>

        <div
          v-if="showMetarow"
          class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-2 text-[13px] font-semibold text-foreground/85"
        >
          <span v-if="hasRuntime">
            {{ t('detail.runtimeMinutes', { minutes: detail.runtimeMinutes }) }}
          </span>
          <span
            v-if="hasRuntime && hasGenres"
            aria-hidden="true"
            class="text-foreground/40"
          >·</span>
          <span
            v-for="genre in detail.genres"
            :key="genre.id"
            class="rounded-full border border-foreground/35 px-2 py-0.5 text-[11.5px] font-semibold text-foreground/90"
          >
            {{ genre.name }}
          </span>
        </div>

        <div class="mt-4">
          <RatingTrio
            :label="rating"
            :signed-in="signedIn"
            :pending="ratingPending"
            :vote-average="detail.voteAverage"
            @select="emit('selectRating', $event)"
            @clear="emit('clearRating')"
            @sign-in-requested="emit('signInRequested')"
          />
        </div>

        <p v-if="detail.tagline" class="mt-4 text-sm italic text-foreground/85">
          {{ detail.tagline }}
        </p>
        <p class="mt-3 max-w-2xl text-sm leading-[1.7] text-foreground/90">
          {{ detail.overview }}
        </p>
      </div>
    </div>
  </section>
</template>
