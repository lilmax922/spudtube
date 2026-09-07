import type { Ref } from 'vue'
import { onBeforeUnmount, onMounted, watch } from 'vue'

export interface InfiniteScrollOptions {
  root?: Ref<Element | null> | Element | null
  rootMargin?: string
}

// Viewport-rooted by default; pass root for scroll-container sentinels (the
// header overlay panel). Watches the sentinel so late-appearing targets
// after a query resolve are observed without manual re-setup.
export function useInfiniteScroll(
  sentinel: Ref<HTMLElement | null>,
  onReach: () => void,
  options: InfiniteScrollOptions = {},
): void {
  let observer: IntersectionObserver | null = null
  let observed: HTMLElement | null = null

  function setup(): void {
    const target = sentinel.value
    if (target === observed && observer)
      return
    teardown()
    if (!target || typeof IntersectionObserver === 'undefined')
      return
    const root = options.root instanceof Element
      ? options.root
      : (options.root as Ref<Element | null> | undefined)?.value ?? null
    observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting))
        onReach()
    }, {
      ...(root ? { root } : {}),
      ...(options.rootMargin ? { rootMargin: options.rootMargin } : {}),
    })
    observer.observe(target)
    observed = target
  }

  function teardown(): void {
    observer?.disconnect()
    observer = null
    observed = null
  }

  onMounted(setup)
  onBeforeUnmount(teardown)
  watch(sentinel, setup)
}
