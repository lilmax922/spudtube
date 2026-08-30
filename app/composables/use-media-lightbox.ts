import { createGlobalState } from '@vueuse/core'
import { shallowRef } from 'vue'

export const useMediaLightboxState = createGlobalState(() => {
  const isOpen = shallowRef(false)

  function open(): void {
    isOpen.value = true
  }

  function close(): void {
    isOpen.value = false
  }

  return { isOpen, open, close }
})
