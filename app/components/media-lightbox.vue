<script setup lang="ts">
import type { CarouselApi } from '@/components/ui/carousel'
import { X } from '@lucide/vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { backdropUrl } from '../lib/images'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'

interface Props {
  paths: string[]
  open: boolean
  initialIndex: number
}
const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()

function clampIndex(value: number): number {
  if (props.paths.length === 0)
    return 0
  return Math.min(Math.max(0, value), props.paths.length - 1)
}

const currentIndex = shallowRef(clampIndex(props.initialIndex))
const api = shallowRef<CarouselApi | undefined>(undefined)

watch(() => props.initialIndex, (value) => {
  const next = clampIndex(value)
  currentIndex.value = next
  api.value?.scrollTo(next, true)
})

watch(() => props.open, (open) => {
  if (!open)
    return
  const next = clampIndex(props.initialIndex)
  currentIndex.value = next
  api.value?.scrollTo(next, true)
})

watch(() => props.paths.length, (len) => {
  if (currentIndex.value >= len)
    currentIndex.value = Math.max(0, len - 1)
})

const counterText = computed(() =>
  t('detail.media.counter', { current: currentIndex.value + 1, total: props.paths.length }),
)

function onInitApi(value: CarouselApi | undefined): void {
  if (!value)
    return
  api.value = value
  const update = (): void => {
    currentIndex.value = value.selectedScrollSnap()
  }
  update()
  value.on('select', update)
  value.on('reInit', update)
  value.scrollTo(currentIndex.value, true)
}

const closeGuard = shallowRef(false)

function close(): void {
  if (closeGuard.value)
    return
  closeGuard.value = true
  emit('update:open', false)
  void nextTick(() => {
    closeGuard.value = false
  })
}

function onOpenChange(value: boolean): void {
  if (!value)
    close()
  else emit('update:open', value)
}

const lightboxBoxRef = useTemplateRef<HTMLElement>('lightboxBoxRef')

onClickOutside(lightboxBoxRef, () => {
  if (props.open)
    close()
})

onKeyStroke('Escape', () => {
  if (props.open)
    close()
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="onOpenChange"
  >
    <DialogContent
      :show-close-button="false"
      overlay-class="bg-black z-[80]"
      class="fixed inset-0 z-[80] flex flex-col items-center justify-center top-auto left-auto translate-x-0 translate-y-0 w-full max-w-none h-[100dvh] gap-0 rounded-none border-0 bg-black p-0 shadow-none sm:max-w-none"
      aria-describedby=""
    >
      <DialogTitle class="sr-only">
        {{ t('detail.media.heading') }}
      </DialogTitle>

      <div class="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 text-white">
        <span
          data-testid="lightbox-counter"
          class="text-caption-sm tabular-nums text-white"
          aria-live="polite"
          aria-atomic="true"
        >
          {{ counterText }}
        </span>
        <button
          data-testid="lightbox-close"
          type="button"
          class="inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          :aria-label="t('detail.media.close')"
          @click="close"
        >
          <X :size="20" :stroke-width="1.75" aria-hidden="true" />
        </button>
      </div>

      <div
        ref="lightboxBoxRef"
        data-testid="lightbox-box"
        class="flex flex-1 items-center justify-center gap-2 px-4 pt-14 pb-4 sm:gap-3 sm:px-6 sm:pb-6 w-full min-h-0"
      >
        <Carousel
          class="w-full max-w-none flex-1 min-h-0 min-w-0"
          :opts="{ align: 'center', loop: false, containScroll: 'trimSnaps', slidesToScroll: 1, dragFree: false }"
          @init-api="onInitApi"
        >
          <CarouselContent class="-ml-0">
            <CarouselItem
              v-for="path in paths"
              :key="path"
              class="pl-0 basis-full"
            >
              <div class="flex h-full min-h-0 w-full items-center justify-center">
                <img
                  v-if="backdropUrl(path)"
                  data-testid="lightbox-image"
                  :src="backdropUrl(path) ?? undefined"
                  :alt="t('detail.media.heading')"
                  class="max-h-[min(85dvh,calc(100dvh-160px))] max-w-[min(1120px,calc(100vw-2rem))] h-auto w-auto object-contain select-none"
                  draggable="false"
                >
              </div>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious
            class="left-4 top-1/2 -translate-y-1/2 bg-white/10 text-white hover:bg-white/20 border-white/10 backdrop-blur-sm size-10"
          />
          <CarouselNext
            class="right-4 top-1/2 -translate-y-1/2 bg-white/10 text-white hover:bg-white/20 border-white/10 backdrop-blur-sm size-10"
          />
        </Carousel>
      </div>
    </DialogContent>
  </Dialog>
</template>
