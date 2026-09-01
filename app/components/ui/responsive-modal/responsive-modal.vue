<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

interface Props {
  open: boolean
  title: string
  description?: string
}

defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isDesktop = shallowRef(true)
let mql: MediaQueryList | null = null

function onOpenChange(value: boolean): void {
  emit('update:open', value)
}

function handleChange(event: MediaQueryListEvent | MediaQueryList): void {
  isDesktop.value = event.matches
}

onMounted(() => {
  mql = window.matchMedia('(min-width: 768px)')
  isDesktop.value = mql.matches
  mql.addEventListener('change', handleChange)
})

onBeforeUnmount(() => {
  if (mql)
    mql.removeEventListener('change', handleChange)
})
</script>

<template>
  <Dialog v-if="isDesktop" :open="open" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">
          {{ description }}
        </DialogDescription>
      </DialogHeader>
      <slot />
    </DialogContent>
  </Dialog>
  <Drawer v-else :open="open" @update:open="onOpenChange">
    <DrawerContent>
      <DrawerHeader class="text-left">
        <DrawerTitle>{{ title }}</DrawerTitle>
        <DrawerDescription v-if="description">
          {{ description }}
        </DrawerDescription>
      </DrawerHeader>
      <div class="px-4 pb-4">
        <slot />
      </div>
    </DrawerContent>
  </Drawer>
</template>
