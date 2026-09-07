<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { TitleSummary } from '#server/tmdb/types'
import type { CarouselVariant } from '../composables/use-carousel'
import { computed, provide, ref } from 'vue'
import { CarouselItem } from '@/components/ui/carousel'
import { useContentGutter } from '../composables/use-carousel'
import { EXPANDABLE_SHIFT_KEY, MIN_EXPANDABLE_TITLES } from './constants'
import ExpandableTitleCard from './expandable-title-card.vue'
import SectionHeader from './section-header.vue'
import TitleCard from './title-card.vue'
import TitleCarousel from './title-carousel.vue'

interface Props {
  title: string
  items: TitleSummary[]
  variant: CarouselVariant
  ariaLabel?: string
  showSeeMore?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  ariaLabel: undefined,
  showSeeMore: true,
})

const emit = defineEmits<{ seeMore: [] }>()

const expandableItems = computed(() => props.items.filter(item => item.backdropPath != null))

const useExpandableCards = computed(() => props.variant === 'expandable' && expandableItems.value.length >= MIN_EXPANDABLE_TITLES)

const displayItems = computed(() => useExpandableCards.value ? expandableItems.value : props.items)

// Row glide for push expansion: the hovered card reports how far its 540px
// growth would overflow the viewport, and every item translates left by that
// amount so the expanded card stays fully visible. Cleared on leave/blur.
const expandShift = ref<number | null>(null)

function setShift(px: number | null): void {
  expandShift.value = px
}

provide(EXPANDABLE_SHIFT_KEY, setShift)

const sectionStyle = computed<CSSProperties | undefined>(() =>
  expandShift.value == null ? undefined : { '--expand-shift': `${-expandShift.value}px` } as CSSProperties,
)

const gutter = useContentGutter()
</script>

<template>
  <section class="title-carousel-section relative z-[1] hover:z-[20]" :style="sectionStyle">
    <SectionHeader
      :title="title"
      :show-see-more="props.showSeeMore && displayItems.length > 0"
      @see-more="emit('seeMore')"
    />

    <TitleCarousel :variant="props.variant" :aria-label="ariaLabel ?? title">
      <CarouselItem
        v-for="(item, idx) in displayItems"
        :key="`${item.kind}-${item.tmdbId}-${idx}`"
        class="pl-0 basis-auto shrink-0 snap-start max-[880px]:w-[168px] max-[560px]:w-[152px]"
        :class="useExpandableCards ? 'expandable-carousel-item w-[240px]' : 'w-[180px]'"
      >
        <ExpandableTitleCard v-if="useExpandableCards" :title="item" :edge-margin="gutter" />
        <TitleCard v-else :title="item" />
      </CarouselItem>
    </TitleCarousel>
  </section>
</template>

<style scoped>
.title-carousel-section :deep(.title-carousel-viewport) {
  z-index: 1;
}
.title-carousel-section:hover :deep(.title-carousel-viewport) {
  z-index: 5;
}

/* Expandable row: the hovered/focused card widens to roughly twice its
   rest width (240px -> 540px), pushing siblings instead of floating above
   them. When the growth would overflow the viewport, the whole row glides
   left by --expand-shift so the expanded card stays fully visible.
   Desktop fine pointers only; narrower viewports and touch stay a
   scrollable poster carousel with standard-size cards. */
@media (min-width: 881px) and (hover: hover) and (pointer: fine) {
  .expandable-carousel-item {
    transform: translateX(var(--expand-shift, 0px));
    transition: width 0.5s ease-in-out, transform 0.5s ease-in-out;
  }
  /* Hover growth waits 0.5s for intent (see EXPANDABLE_HOVER_DELAY_MS in
     use-expandable-geometry.ts); the glide transform is never
     delayed (the shift itself already arrives late via JS) and leaving
     collapses with no delay. Focus expands immediately. */
  .expandable-carousel-item:hover {
    transition: width 0.5s ease-in-out 0.5s, transform 0.5s ease-in-out;
  }
  .expandable-carousel-item:hover,
  .expandable-carousel-item:focus-within {
    /* Keep in sync with EXPANDABLE_WIDTH in use-expandable-geometry.ts.
       The 0.5s hover delay lives on .expandable-carousel-item:hover above;
       focus and collapse stay immediate. */
    width: 540px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .expandable-carousel-item {
    transition: none;
  }
}
</style>
