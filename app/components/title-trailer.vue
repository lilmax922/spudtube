<script setup lang="ts">
import { computed } from 'vue'
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

function onOpenChange(value: boolean): void {
  emit('update:open', value)
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="onOpenChange"
  >
    <DialogContent
      :show-close-button="false"
      overlay-class="bg-black"
      class="w-auto max-w-none overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none"
    >
      <DialogTitle class="sr-only">
        {{ t('detail.trailer') }}
      </DialogTitle>
      <div class="relative mx-auto w-[min(1120px,calc(100vw_-_2rem),calc((100dvh_-_7rem)_*_16/9))]">
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
