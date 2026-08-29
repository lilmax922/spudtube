<script setup lang="ts">
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
    <BrowseGrid class="py-8" />
  </div>
</template>
