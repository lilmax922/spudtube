import type { Ref } from 'vue'
import type { Kind } from '#shared/kind/kind'
import type { RatingLabel, WatchStatus } from '#shared/personal-tracking/personal-tracking'
import { computed, ref, watch } from 'vue'
import { $fetch } from '#imports'
import { toMediaSegment } from '#shared/kind/kind'

export interface PersonalTrackingFetcher {
  getRating: () => Promise<RatingLabel | null>
  putRating: (label: RatingLabel) => Promise<RatingLabel>
  deleteRating: () => Promise<RatingLabel | null>
  getStatus: () => Promise<WatchStatus | null>
  putStatus: (status: WatchStatus) => Promise<WatchStatus>
  deleteStatus: () => Promise<WatchStatus | null>
}

interface RatingResponse {
  label: RatingLabel | null
}

interface StatusResponse {
  status: WatchStatus | null
}

export function createApiPersonalTrackingFetcher(kind: Kind, id: Ref<string | string[]>): PersonalTrackingFetcher {
  const ratingUrl = computed(() => {
    const raw = Array.isArray(id.value) ? id.value[0] ?? '' : id.value
    return `/api/ratings/${toMediaSegment(kind)}/${raw}`
  })
  const statusUrl = computed(() => {
    const raw = Array.isArray(id.value) ? id.value[0] ?? '' : id.value
    return `/api/status/${toMediaSegment(kind)}/${raw}`
  })
  return {
    getRating() {
      return $fetch<RatingResponse>(ratingUrl.value)
        .then((result: RatingResponse) => result.label)
    },
    putRating(label) {
      return $fetch<RatingResponse>(ratingUrl.value, { method: 'PUT', body: { label } })
        .then((result: RatingResponse) => result.label)
    },
    deleteRating() {
      return $fetch<RatingResponse>(ratingUrl.value, { method: 'DELETE' })
        .then((result: RatingResponse) => result.label)
    },
    getStatus() {
      return $fetch<StatusResponse>(statusUrl.value)
        .then((result: StatusResponse) => result.status)
    },
    putStatus(status) {
      return $fetch<StatusResponse>(statusUrl.value, { method: 'PUT', body: { status } })
        .then((result: StatusResponse) => result.status)
    },
    deleteStatus() {
      return $fetch<StatusResponse>(statusUrl.value, { method: 'DELETE' })
        .then((result: StatusResponse) => result.status)
    },
  }
}

export interface TrackingSnapshot {
  rating: RatingLabel | null
  status: WatchStatus | null
}

export type TrackingField = 'rating' | 'status'

export interface PersonalTrackingState {
  state: Ref<TrackingSnapshot>
  pending: Ref<boolean>
  rate: (label: RatingLabel) => Promise<void>
  setStatus: (status: WatchStatus) => Promise<void>
  clear: (field: TrackingField) => Promise<void>
}

const EMPTY_TRACKING: TrackingSnapshot = { rating: null, status: null }

// One deep module for per-title personal tracking. Rating and WatchStatus stay
// independent values (including their divergent delete semantics) but share one
// seam: one snapshot, one pending flag, one version guard per field. Mutations
// serialize through the single pending flag so concurrent flips cannot interleave,
// and every refresh or mutation carries its field version so a response that
// started under a previous title, or before sign-out, never overwrites the
// current snapshot.
export function usePersonalTracking(
  kind: Kind,
  id: Ref<string | string[]>,
  signedIn: Ref<boolean>,
  fetcher: PersonalTrackingFetcher = createApiPersonalTrackingFetcher(kind, id),
): PersonalTrackingState {
  const state = ref<TrackingSnapshot>({ ...EMPTY_TRACKING })
  const pending = ref(false)
  let ratingVersion = 0
  let statusVersion = 0

  async function refreshRating(): Promise<void> {
    const version = ++ratingVersion
    try {
      const fetched = (await fetcher.getRating()) ?? null
      if (version === ratingVersion)
        state.value = { ...state.value, rating: fetched }
    }
    catch {
      // A transient failure never destroys a displayed verdict: keep the current rating.
    }
  }

  async function refreshStatus(): Promise<void> {
    const version = ++statusVersion
    try {
      const fetched = (await fetcher.getStatus()) ?? null
      if (version === statusVersion)
        state.value = { ...state.value, status: fetched }
    }
    catch {
      // A transient failure never destroys a displayed status: keep the current status.
    }
  }

  function refresh(): void {
    void refreshRating()
    void refreshStatus()
  }

  function reset(reason: 'signed-out' | 'title-change'): void {
    state.value = { ...EMPTY_TRACKING }
    // Invalidate in-flight refreshes so they cannot repopulate the cleared snapshot.
    ratingVersion++
    statusVersion++
    if (reason === 'title-change' && signedIn.value)
      refresh()
  }

  watch(signedIn, (value) => {
    if (!value) {
      reset('signed-out')
      return
    }
    refresh()
  }, { immediate: true, flush: 'sync' })

  watch(id, () => {
    reset('title-change')
  }, { flush: 'sync' })

  async function mutateRating(next: RatingLabel | null, persist: () => Promise<RatingLabel | null>): Promise<void> {
    if (!signedIn.value || pending.value)
      return
    const version = ++ratingVersion
    const previous = state.value.rating
    state.value = { ...state.value, rating: next }
    pending.value = true
    try {
      const settled = (await persist()) ?? null
      if (version === ratingVersion)
        state.value = { ...state.value, rating: settled }
    }
    catch {
      if (version === ratingVersion)
        state.value = { ...state.value, rating: previous }
    }
    finally {
      pending.value = false
    }
  }

  async function mutateStatus(next: WatchStatus | null, persist: () => Promise<WatchStatus | null>): Promise<void> {
    if (!signedIn.value || pending.value)
      return
    const version = ++statusVersion
    const previous = state.value.status
    state.value = { ...state.value, status: next }
    pending.value = true
    try {
      const settled = (await persist()) ?? null
      if (version === statusVersion)
        state.value = { ...state.value, status: settled }
    }
    catch {
      if (version === statusVersion)
        state.value = { ...state.value, status: previous }
    }
    finally {
      pending.value = false
    }
  }

  async function rate(label: RatingLabel): Promise<void> {
    await mutateRating(label, () => fetcher.putRating(label))
  }

  async function setStatus(status: WatchStatus): Promise<void> {
    await mutateStatus(status, () => fetcher.putStatus(status))
  }

  async function clear(field: TrackingField): Promise<void> {
    if (field === 'rating')
      await mutateRating(null, () => fetcher.deleteRating())
    else
      await mutateStatus(null, () => fetcher.deleteStatus())
  }

  return { state, pending, rate, setStatus, clear }
}
