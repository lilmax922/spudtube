import type { Ref } from 'vue'
import type { RatingLabel } from '#server/db/schema/rating'
import type { Kind } from '#server/tmdb/types'
import { computed, ref, watch } from 'vue'
import { $fetch } from '#imports'
import { toMediaSegment } from '../lib/kind'

export interface RatingFetcher {
  getRating: () => Promise<RatingLabel | null>
  putRating: (label: RatingLabel) => Promise<RatingLabel>
  deleteRating: () => Promise<RatingLabel | null>
}

interface RatingResponse {
  label: RatingLabel | null
}

export function createApiRatingFetcher(kind: Kind, id: Ref<string | string[]>): RatingFetcher {
  const url = computed(() => {
    const raw = Array.isArray(id.value) ? id.value[0] ?? '' : id.value
    return `/api/ratings/${toMediaSegment(kind)}/${raw}`
  })
  return {
    getRating() {
      return $fetch<RatingResponse>(url.value)
        .then((result: RatingResponse) => result.label)
    },
    putRating(label) {
      return $fetch<RatingResponse>(url.value, { method: 'PUT', body: { label } })
        .then((result: RatingResponse) => result.label)
    },
    deleteRating() {
      return $fetch<RatingResponse>(url.value, { method: 'DELETE' })
        .then((result: RatingResponse) => result.label)
    },
  }
}

export interface TitleRatingState {
  label: Ref<RatingLabel | null>
  pending: Ref<boolean>
  rate: (label: RatingLabel) => Promise<void>
  clear: () => Promise<void>
}

// Optimistic per-title rating state: the label flips immediately, then settles to the
// server response; failures revert. The GET only ever runs while signed in.
export function useTitleRating(
  kind: Kind,
  id: Ref<string | string[]>,
  signedIn: Ref<boolean>,
  fetcher: RatingFetcher = createApiRatingFetcher(kind, id),
): TitleRatingState {
  const label = ref<RatingLabel | null>(null)
  const pending = ref(false)
  let refreshVersion = 0

  async function refresh(): Promise<void> {
    const version = ++refreshVersion
    try {
      const fetched = (await fetcher.getRating()) ?? null
      if (version === refreshVersion)
        label.value = fetched
    }
    catch {
      // A transient failure never destroys a displayed verdict: keep the current label.
    }
  }

  watch(signedIn, (value) => {
    if (!value) {
      label.value = null
      return
    }
    void refresh()
  }, { immediate: true, flush: 'sync' })

  watch(id, () => {
    label.value = null
    refreshVersion++
    if (signedIn.value)
      void refresh()
  }, { flush: 'sync' })

  async function rate(next: RatingLabel): Promise<void> {
    if (!signedIn.value || pending.value)
      return
    refreshVersion++
    const previous = label.value
    label.value = next
    pending.value = true
    try {
      label.value = (await fetcher.putRating(next)) ?? null
    }
    catch {
      label.value = previous
    }
    finally {
      pending.value = false
    }
  }

  async function clear(): Promise<void> {
    if (!signedIn.value || pending.value)
      return
    refreshVersion++
    const previous = label.value
    label.value = null
    pending.value = true
    try {
      label.value = (await fetcher.deleteRating()) ?? null
    }
    catch {
      label.value = previous
    }
    finally {
      pending.value = false
    }
  }

  return { label, pending, rate, clear }
}
