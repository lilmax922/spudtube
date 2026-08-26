<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'

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
      class="gap-0 p-0 sm:max-w-[min(860px,92vw)]"
      :close-label="t('detail.close')"
    >
      <DialogHeader class="border-b border-border px-4 py-3">
        <DialogTitle class="text-sm font-bold">
          {{ t('detail.trailer') }}
        </DialogTitle>
      </DialogHeader>
      <div
        v-if="embedUrl"
        class="p-4 pt-3.5 pb-5"
      >
        <div class="aspect-video w-full overflow-hidden rounded-lg bg-black ring-1 ring-border">
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
