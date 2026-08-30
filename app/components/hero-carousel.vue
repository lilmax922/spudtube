<script setup lang="ts">
import type { HeroTitle } from '../composables/use-hero-titles'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { backdropSrcSet, backdropUrl, providerLogoSrcSet, providerLogoUrl } from '../lib/images'
import HeroSlideActions from './hero-slide-actions.vue'

interface Props {
  titles: HeroTitle[]
}

const props = defineProps<Props>()
const { t } = useI18n()

const TRENDING_LIMIT = 5

const heroIdx = shallowRef(0)
let timer: ReturnType<typeof setInterval> | null = null

const trending = computed<HeroTitle[]>(() => {
  const list = [...props.titles]
  list.sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0))
  return list.slice(0, TRENDING_LIMIT)
})

function go(idx: number): void {
  const len = trending.value.length
  if (len === 0)
    return
  heroIdx.value = ((idx % len) + len) % len
}

function next(): void {
  go(heroIdx.value + 1)
}
function prev(): void {
  go(heroIdx.value - 1)
}

function startTimer(): void {
  stopTimer()
  if (trending.value.length <= 1)
    return
  timer = setInterval(next, 5000)
}
function stopTimer(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function yearOf(title: HeroTitle): string {
  return title.releaseDate?.slice(0, 4) ?? '—'
}

function backdropFor(title: HeroTitle): string | null {
  return backdropUrl(title.backdropPath)
}

function kindLabel(title: HeroTitle): string {
  return title.kind === 'MOVIE' ? t('browse.kindMovies') : t('browse.kindTvShows')
}

function detailPath(title: HeroTitle): string {
  return title.kind === 'MOVIE' ? `/movie/${title.tmdbId}` : `/tv/${title.tmdbId}`
}

function firstProviderLogo(title: HeroTitle): string | null {
  return providerLogoUrl(title.providers[0]?.logoPath ?? null)
}

function firstProviderLogoSrcSet(title: HeroTitle): string | null {
  return providerLogoSrcSet(title.providers[0]?.logoPath ?? null)
}

function handleMouseEnter(): void {
  stopTimer()
}
function handleMouseLeave(): void {
  startTimer()
}

watch(trending, () => {
  heroIdx.value = 0
  startTimer()
})

onMounted(() => {
  startTimer()
})

onBeforeUnmount(() => {
  stopTimer()
})
</script>

<template>
  <div
    v-if="trending.length > 0"
    class="heroCarousel"
    aria-roledescription="carousel"
    :aria-label="t('browse.sectionLabel')"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div
      v-for="(feat, i) in trending"
      :key="`${feat.kind}-${feat.tmdbId}`"
      class="heroSlide"
      :class="{ active: i === heroIdx }"
      :data-index="i"
      :aria-hidden="i === heroIdx ? 'false' : 'true'"
    >
      <NuxtImg
        v-if="backdropFor(feat)"
        :src="backdropFor(feat) ?? undefined"
        :srcset="backdropSrcSet(feat.backdropPath) ?? undefined"
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
            {{ feat.name }}
          </div>
          <div class="heroRow heroMeta">
            <span v-if="feat.voteAverage != null" class="heroMetaScore">
              <span aria-hidden="true">★</span>
              {{ feat.voteAverage.toFixed(1) }}
            </span>
            <span v-if="feat.voteAverage != null" aria-hidden="true" class="heroMetaDot">·</span>
            <span class="heroMetaKind">{{ kindLabel(feat) }}</span>
            <span v-if="feat.genres.length > 0" aria-hidden="true" class="heroMetaDot">·</span>
            <span v-if="feat.genres.length > 0" class="heroMetaGenres">
              {{ feat.genres.slice(0, 3).map(g => g.name).join(' · ') }}
            </span>
            <span v-if="feat.contentRating" class="heroMetaBadge">
              {{ feat.contentRating }}
            </span>
          </div>
          <div v-if="feat.overview" class="heroRow heroOverview">
            {{ feat.overview }}
          </div>
          <div class="heroRow heroStrip">
            <span v-if="feat.providers[0]" class="heroStripProvider">
              <NuxtImg
                v-if="firstProviderLogo(feat)"
                :src="firstProviderLogo(feat) ?? undefined"
                :srcset="firstProviderLogoSrcSet(feat) ?? undefined"
                sizes="32px"
                :alt="feat.providers[0].name"
                loading="lazy"
                decoding="async"
                class="heroStripProviderLogo"
              />
            </span>
            <span class="heroStripText">{{ yearOf(feat) }}</span>
            <span v-if="feat.runtimeMinutes" aria-hidden="true" class="heroStripDot">·</span>
            <span v-if="feat.runtimeMinutes" class="heroStripText">{{ t('browse.minutesShort', { minutes: feat.runtimeMinutes }) }}</span>
          </div>
          <div class="heroRow heroActions">
            <NuxtLink
              :to="detailPath(feat)"
              class="heroBtn heroBtnPrimary"
            >
              {{ t('hero.viewDetails') }}
            </NuxtLink>
            <HeroSlideActions :kind="feat.kind" :tmdb-id="feat.tmdbId" />
          </div>
        </div>
      </div>
    </div>
    <button class="heroArrow prev" :aria-label="t('hero.previous')" @click="prev">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M15 18L9 12l6-6" /></svg>
    </button>
    <button class="heroArrow next" :aria-label="t('hero.next')" @click="next">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg>
    </button>
    <div class="heroDots" role="tablist">
      <button
        v-for="(_, i) in trending"
        :key="i"
        class="heroDot"
        :class="{ active: i === heroIdx }"
        :data-dot="i"
        :aria-label="t('hero.slide', { index: i + 1 })"
        role="tab"
        :aria-selected="i === heroIdx"
        @click="go(i)"
      />
    </div>
  </div>
</template>

<style scoped>
.heroCarousel {
  position: relative;
  min-height: 600px;
  overflow: hidden;
  isolation: isolate;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  margin-top: calc(var(--header-h) * -1);
  background: #0a0a0a;
}
.heroSlide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  padding: calc(var(--header-h) + 28px) 64px 80px;
  opacity: 0;
  transition: opacity 0.55s ease;
  isolation: isolate;
  pointer-events: none;
}
.heroSlide.active {
  opacity: 1;
  z-index: 1;
  pointer-events: auto;
}
.heroSlide::before {
  content: "";
  position: absolute;
  inset: 0;
  background: #0a0a0a;
  z-index: -3;
}
.heroSlide::after {
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
.heroStripProvider {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  width: 22px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
}
.heroStripProviderLogo {
  height: 100%;
  width: 100%;
  object-fit: cover;
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
.heroBtnGhost {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
  border-color: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(4px);
}
.heroBtnGhost:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}
.heroArrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.38);
  color: #fff;
  backdrop-filter: blur(6px);
  z-index: 4;
  transition: background 0.15s;
  border: none;
  cursor: pointer;
}
.heroArrow:hover {
  background: rgba(0, 0, 0, 0.58);
}
.heroArrow.prev {
  left: 14px;
}
.heroArrow.next {
  right: 14px;
}
.heroDots {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 4;
}
.heroDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.38);
  transition: all 0.22s;
  border: none;
  padding: 0;
  cursor: pointer;
}
.heroDot.active {
  background: #fff;
  width: 22px;
  border-radius: 9999px;
}
@media (max-width: 880px) {
  .heroCarousel {
    min-height: 540px;
  }
  .heroInfo {
    max-width: 100%;
  }
  .heroTitle {
    max-width: 18ch;
  }
}
@media (max-width: 560px) {
  .heroSlide {
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
