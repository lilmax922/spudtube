<script setup lang="ts">
import { ChevronLeft, ChevronRight, X } from '@lucide/vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { backdropUrl } from '../lib/images'
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

const currentIndex = shallowRef(props.initialIndex)

watch(() => props.initialIndex, (value) => {
  currentIndex.value = Math.min(Math.max(0, value), Math.max(0, props.paths.length - 1))
})

watch(() => props.open, (open) => {
  if (open)
    currentIndex.value = Math.min(Math.max(0, props.initialIndex), Math.max(0, props.paths.length - 1))
})

watch(() => props.paths.length, (len) => {
  if (currentIndex.value >= len)
    currentIndex.value = Math.max(0, len - 1)
})

const currentPath = computed(() => props.paths[currentIndex.value] ?? null)
const currentUrl = computed(() => currentPath.value ? backdropUrl(currentPath.value) : null)

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

function goPrev(): void {
  if (currentIndex.value > 0)
    currentIndex.value -= 1
}

function goNext(): void {
  if (currentIndex.value < props.paths.length - 1)
    currentIndex.value += 1
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

onKeyStroke('ArrowLeft', () => {
  if (!props.open)
    return
  goPrev()
})

onKeyStroke('ArrowRight', () => {
  if (!props.open)
    return
  goNext()
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
          {{ t('detail.media.counter', { current: currentIndex + 1, total: paths.length }) }}
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
        <button
          data-testid="lightbox-prev"
          type="button"
          class="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:opacity-30 disabled:pointer-events-none"
          :aria-label="t('detail.media.previous')"
          :disabled="currentIndex <= 0"
          @click.stop="goPrev"
        >
          <ChevronLeft :size="22" :stroke-width="1.75" aria-hidden="true" />
        </button>

        <div class="flex flex-1 items-center justify-center min-h-0 min-w-0">
          <img
            v-if="currentUrl"
            data-testid="lightbox-image"
            :src="currentUrl"
            :alt="t('detail.media.heading')"
            class="max-h-[min(85dvh,calc(100dvh-160px))] max-w-[min(1120px,calc(100vw-2rem))] h-auto w-auto object-contain select-none"
            draggable="false"
          >
        </div>

        <button
          data-testid="lightbox-next"
          type="button"
          class="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:opacity-30 disabled:pointer-events-none"
          :aria-label="t('detail.media.next')"
          :disabled="currentIndex >= paths.length - 1"
          @click.stop="goNext"
        >
          <ChevronRight :size="22" :stroke-width="1.75" aria-hidden="true" />
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>
