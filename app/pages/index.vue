<script setup lang="ts">
import BrowseGrid from '../components/browse-grid.vue'
import FilterBar from '../components/filter-bar.vue'
import HeroCarousel from '../components/hero-carousel.vue'
import { useBrowseGrid } from '../composables/use-browse-grid'
import { useSearchState } from '../composables/use-search-state'

const { items } = useBrowseGrid()
const { mode } = useSearchState()
</script>

<template>
  <div class="flex w-full flex-col">
    <HeroCarousel
      v-if="mode === 'browse' && items.length > 0"
      :titles="items"
    />
    <FilterBar />
    <div
      id="mockframe"
      class="mx-auto w-full max-w-[1280px] px-6 pb-10 pt-6"
    >
      <BrowseGrid />
    </div>
  </div>
</template>
