import type { Ref } from 'vue'
import { onBeforeUnmount, onMounted } from 'vue'

export function useInfiniteScroll(
  sentinel: Ref<HTMLElement | null>,
  onReach: () => void,
): void {
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (!sentinel.value || typeof IntersectionObserver === 'undefined')
      return
    observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting))
        onReach()
    })
    observer.observe(sentinel.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
  })
}
