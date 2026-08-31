<script setup lang="ts">
import { onClickOutside, onKeyStroke, useWindowSize } from '@vueuse/core'
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'

interface Props {
  open: boolean
  trailerKey: string | null
}
const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()

const embedUrl = computed(() => {
  if (!props.trailerKey)
    return null
  return `https://www.youtube-nocookie.com/embed/${props.trailerKey}?autoplay=1`
})

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

const videoBoxRef = useTemplateRef<HTMLElement>('videoBoxRef')

onClickOutside(videoBoxRef, () => {
  if (props.open)
    close()
})

onKeyStroke('Escape', () => {
  if (props.open)
    close()
})

const { width: viewportWidth, height: viewportHeight } = useWindowSize()

const trailerBoxStyle = computed(() => {
  const w = viewportWidth.value
  const h = viewportHeight.value
  if (!Number.isFinite(w) || !Number.isFinite(h) || w === 0 || h === 0)
    return {} as Record<string, string>
  const availableW = w - 32
  const availableH = (h - 112) * 16 / 9
  const width = Math.min(1120, availableW, availableH)
  if (width <= 0)
    return {} as Record<string, string>
  return { width: `${width}px` } as Record<string, string>
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
      class="fixed inset-0 z-[80] flex items-center justify-center top-auto left-auto translate-x-0 translate-y-0 w-full max-w-none h-[100dvh] gap-0 overflow-visible rounded-none border-0 bg-transparent p-4 shadow-none sm:max-w-none"
    >
      <DialogTitle class="sr-only">
        {{ t('detail.trailer') }}
      </DialogTitle>
      <div
        ref="videoBoxRef"
        data-testid="trailer-box"
        class="relative mx-auto w-[min(1120px,calc(100vw_-_2rem),calc((100dvh_-_7rem)_*_16/9))] max-w-[1120px]"
        :style="trailerBoxStyle"
      >
        <div
          v-if="embedUrl"
          class="aspect-video w-full overflow-hidden rounded-lg bg-black ring-1 ring-white/15"
        >
          <iframe
            :src="embedUrl"
            class="h-full w-full"
            :title="t('detail.trailer')"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          />
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
