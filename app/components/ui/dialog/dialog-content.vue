<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { X } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<DialogContentProps & {
  class?: HTMLAttributes['class']
  overlayClass?: HTMLAttributes['class']
  showCloseButton?: boolean
  closeLabel?: string
}>(), {
  showCloseButton: true,
  closeLabel: 'Close',
})

const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, 'class', 'overlayClass', 'showCloseButton', 'closeLabel')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      data-slot="dialog-overlay"
      :class="cn(
        'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/60',
        props.overlayClass,
      )"
    />
    <DialogContent
      data-slot="dialog-content"
      v-bind="{ ...forwarded, ...$attrs }"
      :class="cn(
        'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-hidden rounded-xl border border-border p-6 shadow-[0_16px_48px_rgba(0,0,0,0.55)] duration-100 outline-none',
        props.class,
      )"
    >
      <slot />

      <DialogClose
        v-if="showCloseButton"
        data-slot="dialog-close-button"
        class="absolute top-2 right-2 flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        :aria-label="closeLabel"
      >
        <X :size="18" :stroke-width="1.75" aria-hidden="true" />
        <span class="sr-only">{{ closeLabel }}</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
