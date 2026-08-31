<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
import BrowseGrid from '../components/browse-grid.vue'
import HeroCarousel from '../components/hero-carousel.vue'
import { useBrowseGrid } from '../composables/use-browse-grid'
import { useHeroTitles } from '../composables/use-hero-titles'

const { kind } = useBrowseGrid()
const { titles: heroTitles, loading: heroLoading } = useHeroTitles(kind)
</script>

<template>
  <div class="flex w-full flex-1 flex-col">
    <HeroCarousel v-if="!heroLoading && heroTitles.length > 0" :titles="heroTitles" />
    <div
      v-else-if="heroLoading"
      data-testid="hero-skeleton"
      aria-busy="true"
      aria-label="Loading featured titles"
      class="heroSkeleton"
    >
      <div class="heroSkeletonInner">
        <div class="heroSkeletonInfo">
          <Skeleton class="h-11 w-[18ch] max-w-full rounded-lg bg-white/10" />
          <Skeleton class="h-4 w-64 max-w-full rounded bg-white/10" />
          <Skeleton class="h-20 w-[60ch] max-w-full rounded-lg bg-white/10" />
          <div class="flex gap-3">
            <Skeleton class="h-10 w-28 rounded-full bg-white/10" />
            <Skeleton class="h-10 w-10 rounded-full bg-white/10" />
            <Skeleton class="h-10 w-10 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </div>
    <BrowseGrid />
  </div>
</template>

<style scoped>
.heroSkeleton {
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
  .heroSkeleton {
    height: min(100vh, 56.25vw);
    max-height: 100vh;
  }
}
.heroSkeletonInner {
  max-width: var(--max-content-width);
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
}
.heroSkeletonInfo {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 16px;
}
@media (max-width: 880px) {
  .heroSkeleton {
    min-height: 540px;
    height: min(100dvh, 56.25vw);
  }
}
@media (max-width: 560px) {
  .heroSkeleton {
    padding: calc(var(--header-h) + 20px) 20px 56px;
  }
}
</style>
