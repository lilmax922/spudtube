<script setup lang="ts">
import type { RatingLabel } from '#server/db/schema/rating'
import type { WatchStatus } from '#server/db/schema/title-status'
import type { TitleDetail } from '#server/tmdb/types'
import { Play } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { backdropSrcSet, backdropUrl } from '../lib/images'
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
  playTrailer: []
}>()

const { t } = useI18n()

const backdrop = computed(() => backdropUrl(props.detail.backdropPath))
const backdropSet = computed(() => backdropSrcSet(props.detail.backdropPath))
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
  <section class="heroCarousel">
    <NuxtImg
      v-if="backdrop"
      :src="backdrop ?? undefined"
      :srcset="backdropSet ?? undefined"
      class="heroBackdrop"
      sizes="100vw"
      alt=""
      loading="eager"
      decoding="async"
      aria-hidden="true"
    />
    <div class="heroInner">
      <div class="heroInfo">
        <div class="heroRow heroTitle">
          {{ detail.name }}
        </div>
        <div class="heroRow heroMeta">
          <span v-if="ratingScore" class="heroMetaScore">
            <span aria-hidden="true">★</span>
            {{ ratingScore }}
          </span>
          <span v-if="ratingScore" aria-hidden="true" class="heroMetaDot">·</span>
          <span class="heroMetaKind">{{ kindLabel }}</span>
          <span v-if="detail.genres.length > 0" aria-hidden="true" class="heroMetaDot">·</span>
          <span v-if="detail.genres.length > 0" class="heroMetaGenres">
            {{ detail.genres.slice(0, 3).map(g => g.name).join(' · ') }}
          </span>
          <span v-if="detail.contentRating" class="heroMetaBadge">
            {{ detail.contentRating }}
          </span>
        </div>
        <div v-if="detail.overview" class="heroRow heroOverview">
          {{ detail.overview }}
        </div>
        <div class="heroRow heroStrip">
          <span v-if="year" class="heroStripText">{{ year }}</span>
          <span v-if="year && hasRuntime" aria-hidden="true" class="heroStripDot">·</span>
          <span v-if="hasRuntime" class="heroStripText">{{ t('browse.minutesShort', { minutes: detail.runtimeMinutes }) }}</span>
        </div>
        <div class="heroRow heroActions">
          <button
            v-if="hasTrailer"
            type="button"
            class="heroBtn heroBtnPrimary"
            :aria-label="t('detail.playTrailer')"
            @click="playTrailer"
          >
            <Play :size="18" :stroke-width="1.75" fill="currentColor" aria-hidden="true" />
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
      </div>
    </div>
  </section>
</template>

<style scoped>
.heroCarousel {
  position: relative;
  min-height: 600px;
  height: min(100dvh, 56.25vw);
  max-height: 100dvh;
  overflow: hidden;
  isolation: isolate;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  margin-top: calc(var(--header-h) * -1);
  background: #0a0a0a;
  display: flex;
  align-items: flex-end;
  padding: calc(var(--header-h) + 28px) 64px 80px;
}
@supports not (height: 1dvh) {
  .heroCarousel {
    height: min(100vh, 56.25vw);
    max-height: 100vh;
  }
}
.heroCarousel::before {
  content: "";
  position: absolute;
  inset: 0;
  background: #0a0a0a;
  z-index: -3;
}
.heroCarousel::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to right, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.55) 38%, rgba(0, 0, 0, 0.18) 64%, transparent 90%),
    linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.35) 40%, transparent 70%);
  z-index: -1;
}
.heroBackdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -2;
}
.heroInner {
  max-width: var(--max-content-width);
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
}
.heroInfo {
  max-width: 640px;
  padding-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.heroRow {
  color: #fff;
}
.heroTitle {
  font-size: var(--text-display);
  line-height: var(--leading-display);
  letter-spacing: var(--tracking-display);
  font-weight: var(--weight-display);
  text-wrap: balance;
  max-width: 14ch;
}
.heroMeta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: var(--text-caption-md);
  line-height: var(--leading-caption-md);
  letter-spacing: var(--tracking-caption-md);
  font-weight: 500;
  color: rgba(255, 255, 255, 0.92);
}
.heroMetaScore {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #fbbf24;
  font-weight: 700;
  font-size: var(--text-body-sm-strong);
}
.heroMetaDot {
  color: rgba(255, 255, 255, 0.32);
}
.heroMetaGenres {
  text-transform: none;
}
.heroMetaKind {
  color: rgba(255, 255, 255, 0.92);
}
.heroMetaBadge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: var(--text-caption-sm);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 700;
}
.heroOverview {
  font-size: var(--text-body-lg);
  line-height: var(--leading-body-lg);
  color: rgba(255, 255, 255, 0.86);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 60ch;
}
.heroStrip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: var(--text-caption-md);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.88);
}
.heroStripDot {
  color: rgba(255, 255, 255, 0.32);
}
.heroStripText {
  color: rgba(255, 255, 255, 0.88);
}
.heroActions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}
.heroActions :deep(.bg-muted) {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.14) !important;
  color: rgba(255, 255, 255, 0.92) !important;
}
.heroActions :deep(.bg-muted:hover) {
  background: rgba(255, 255, 255, 0.16) !important;
  color: #fff !important;
}
.heroActions :deep(.border-input) {
  border-color: rgba(255, 255, 255, 0.14) !important;
}
.heroActions :deep(.text-muted-foreground) {
  color: rgba(255, 255, 255, 0.72) !important;
}
.heroActions :deep(.text-foreground) {
  color: rgba(255, 255, 255, 0.92) !important;
}
.heroBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: 9999px;
  font-size: var(--text-button-md);
  line-height: var(--leading-button-md);
  letter-spacing: var(--tracking-button-md);
  font-weight: var(--weight-button-md);
  text-decoration: none;
  border: 1px solid transparent;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}
.heroBtnPrimary {
  background: #fff;
  color: #111;
}
.heroBtnPrimary:hover {
  filter: brightness(1.04);
}
@media (max-width: 880px) {
  .heroCarousel {
    min-height: 540px;
    height: min(100dvh, 56.25vw);
  }
  .heroInfo {
    max-width: 100%;
  }
  .heroTitle {
    max-width: 18ch;
  }
}
@media (max-width: 560px) {
  .heroCarousel {
    padding: calc(var(--header-h) + 20px) 20px 56px;
  }
  .heroTitle {
    max-width: 100%;
  }
  .heroOverview {
    -webkit-line-clamp: 2;
  }
}
</style>
