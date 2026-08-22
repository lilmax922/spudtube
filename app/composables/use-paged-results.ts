import type { ComputedRef, Ref } from 'vue'
import type { Page } from '#server/tmdb/types'
import { computed, ref, shallowRef } from 'vue'

export interface PagedResults<T> {
  items: Ref<T[]>
  page: Ref<number>
  totalPages: Ref<number>
  loading: Ref<boolean>
  loadingMore: Ref<boolean>
  error: Ref<boolean>
  hasMore: ComputedRef<boolean>
  loadFirstPage: () => Promise<boolean>
  loadNextPage: () => Promise<void>
  reset: () => void
  attempt: () => number
  markFailed: (attempt: number) => void
}

export function usePagedResults<T>(
  fetchPage: (page: number) => Promise<Page<T>>,
): PagedResults<T> {
  const items = shallowRef<T[]>([])
  const page = ref(0)
  const totalPages = ref(0)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref(false)
  let generation = 0

  const hasMore = computed(() => page.value < totalPages.value)

  async function loadFirstPage(): Promise<boolean> {
    const current = ++generation
    loading.value = true
    loadingMore.value = false
    error.value = false
    try {
      const firstPage = await fetchPage(1)
      if (current !== generation)
        return false
      items.value = firstPage.results
      page.value = firstPage.page
      totalPages.value = firstPage.totalPages
      return true
    }
    catch {
      if (current === generation)
        error.value = true
      return false
    }
    finally {
      if (current === generation)
        loading.value = false
    }
  }

  async function loadNextPage(): Promise<void> {
    if (loading.value || loadingMore.value || !hasMore.value)
      return
    const current = generation
    loadingMore.value = true
    error.value = false
    try {
      const next = await fetchPage(page.value + 1)
      if (current !== generation)
        return
      items.value = [...items.value, ...next.results]
      page.value = next.page
      totalPages.value = next.totalPages
    }
    catch {
      if (current === generation)
        error.value = true
    }
    finally {
      loadingMore.value = false
    }
  }

  function reset(): void {
    generation++
    items.value = []
    page.value = 0
    totalPages.value = 0
    loading.value = false
    loadingMore.value = false
    error.value = false
  }

  function attempt(): number {
    return generation
  }

  function markFailed(attemptNumber: number): void {
    if (attemptNumber === generation)
      error.value = true
  }

  return {
    items,
    page,
    totalPages,
    loading,
    loadingMore,
    error,
    hasMore,
    loadFirstPage,
    loadNextPage,
    reset,
    attempt,
    markFailed,
  }
}
