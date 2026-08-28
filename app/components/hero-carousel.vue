<script setup lang="ts">
import type { TitleSummary } from '#server/tmdb/types'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { titleDetailPath } from '../lib/kind'

interface Props {
  titles: TitleSummary[]
}

const props = defineProps<Props>()
const { t } = useI18n()

const heroIdx = shallowRef(0)
let timer: ReturnType<typeof setInterval> | null = null

const trending = computed(() => {
  const list = [...props.titles]
  // sort by voteAverage desc as proxy for popularity
  list.sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0))
  return list.slice(0, 5)
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

function toneFor(title: TitleSummary): string {
  const hues = ['#991b1b', '#b45309', '#7f1d1d', '#4d7c0f', '#7c3aed', '#0e7490', '#334155']
  const idx = Math.abs(title.tmdbId) % hues.length
  return hues[idx] ?? '#1a1a2e'
}

function yearOf(title: TitleSummary): string {
  return title.releaseDate?.slice(0, 4) ?? '—'
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
      :style="{ '--hero-tone': toneFor(feat) } as Record<string, string>"
      :aria-hidden="i === heroIdx ? 'false' : 'true'"
    >
      <div class="heroInner">
        <div class="heroInfo">
          <div class="heroTitle">
            {{ feat.name }}
          </div>
          <div class="heroSub">
            <span class="score">★ {{ feat.voteAverage?.toFixed(1) ?? '—' }}</span>
            <span>{{ feat.kind === 'MOVIE' ? t('detail.kind.movie') : t('detail.kind.tv') }} · {{ yearOf(feat) }}</span>
          </div>
          <div class="heroMetaLine">
            <span class="providerDot">{{ feat.name.charAt(0) }}</span>
            <span>{{ yearOf(feat) }}</span>
            <span>·</span>
            <span>{{ feat.kind === 'MOVIE' ? t('browse.kindMovies') : t('browse.kindTvShows') }}</span>
          </div>
          <div class="heroActionsApple">
            <NuxtLink
              :to="titleDetailPath(feat.kind, feat.tmdbId)"
              class="btnApplePrimary"
            >
              查看詳情
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
    <button class="heroArrow prev" aria-label="上一部" @click="prev">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M15 18L9 12l6-6" /></svg>
    </button>
    <button class="heroArrow next" aria-label="下一部" @click="next">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg>
    </button>
    <div class="heroDots" role="tablist">
      <button
        v-for="(_, i) in trending"
        :key="i"
        class="heroDot"
        :class="{ active: i === heroIdx }"
        :data-dot="i"
        :aria-label="`第 ${i + 1} 張`"
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
  min-height: 560px;
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
  padding: calc(var(--header-h) + 28px) 64px 64px;
  opacity: 0;
  transition: opacity 0.55s ease;
  isolation: isolate;
}
.heroSlide.active {
  opacity: 1;
  z-index: 1;
}
.heroSlide::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--hero-tone, #1a1a2e);
  z-index: -2;
}
.heroSlide::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to right, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.45) 18%, transparent 32%, transparent 68%, rgba(0, 0, 0, 0.45) 82%, rgba(0, 0, 0, 0.72) 100%),
    linear-gradient(to top, rgba(0, 0, 0, 0.62) 0%, rgba(0, 0, 0, 0.22) 36%, transparent 58%);
  z-index: -1;
}
.heroInner {
  max-width: var(--max-content-width);
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
}
.heroInfo {
  max-width: 560px;
  padding-bottom: 8px;
}
.heroTitle {
  font-size: var(--text-display);
  line-height: var(--leading-display);
  font-weight: var(--weight-display);
  letter-spacing: var(--tracking-display);
  color: #fff;
  text-wrap: balance;
}
.heroSub {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: var(--text-caption-md);
  line-height: var(--leading-caption-md);
  letter-spacing: var(--tracking-caption-md);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  flex-wrap: wrap;
}
.heroSub .score {
  color: #fbbf24;
}
.heroMetaLine {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: var(--text-caption-md);
  line-height: var(--leading-caption-md);
  letter-spacing: var(--tracking-caption-md);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.88);
  flex-wrap: wrap;
}
.heroMetaLine .providerDot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.18);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-caption-sm);
  line-height: var(--leading-caption-sm);
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}
.heroActionsApple {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
}
.btnApplePrimary {
  height: 44px;
  padding: 0 28px;
  border-radius: 9999px;
  background: #fff;
  color: #111;
  font-weight: var(--weight-display);
  font-size: var(--text-button-md);
  line-height: var(--leading-button-md);
  letter-spacing: var(--tracking-button-md);
  border: none;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}
.btnApplePrimary:hover {
  filter: brightness(1.04);
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
  bottom: 18px;
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
    min-height: 480px;
  }
}
@media (max-width: 560px) {
  .heroSlide {
    padding: calc(var(--header-h) + 20px) 20px 32px;
  }
}
</style>
