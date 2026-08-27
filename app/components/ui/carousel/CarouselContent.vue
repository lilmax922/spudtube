<script setup lang="ts">
import type { WithClassAsProps } from './interface'
import { cn } from '@/lib/utils'
import { useCarousel } from './useCarousel'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<WithClassAsProps>()

const { carouselRef, orientation } = useCarousel()
</script>

<template>
  <div
    ref="carouselRef"
    data-slot="carousel-content"
    class="overflow-x-clip overflow-y-visible"
    style="scrollbar-width: none; -ms-overflow-style: none;"
  >
    <div
      :class="
        cn(
          'flex gap-4',
          orientation === 'horizontal' ? '' : 'flex-col',
          props.class,
        )"
      v-bind="$attrs"
    >
      <slot />
    </div>
  </div>
</template>
