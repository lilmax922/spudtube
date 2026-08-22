import type { Ref } from 'vue'
import type { WatchStatus } from '#server/db/schema/title-status'
import type { Kind } from '#server/tmdb/types'
import { computed, ref, watch } from 'vue'
import { $fetch } from '#imports'
import { toMediaSegment } from '../lib/kind'

export interface StatusFetcher {
  getStatus: () => Promise<WatchStatus | null>
  putStatus: (status: WatchStatus) => Promise<WatchStatus>
  deleteStatus: () => Promise<WatchStatus | null>
}

interface StatusResponse {
  status: WatchStatus | null
}

export function createApiStatusFetcher(kind: Kind, id: Ref<string | string[]>): StatusFetcher {
  const url = computed(() => {
    const raw = Array.isArray(id.value) ? id.value[0] ?? '' : id.value
    return `/api/status/${toMediaSegment(kind)}/${raw}`
  })
  return {
    getStatus() {
      return $fetch<StatusResponse>(url.value)
        .then((result: StatusResponse) => result.status)
    },
    putStatus(status) {
      return $fetch<StatusResponse>(url.value, { method: 'PUT', body: { status } })
        .then((result: StatusResponse) => result.status)
    },
    deleteStatus() {
      return $fetch<StatusResponse>(url.value, { method: 'DELETE' })
        .then((result: StatusResponse) => result.status)
    },
  }
}

export interface TitleStatusState {
  status: Ref<WatchStatus | null>
  pending: Ref<boolean>
  set: (status: WatchStatus) => Promise<void>
  clear: () => Promise<void>
}

// Optimistic per-title watch status: the state flips immediately, then settles to the
// server response; failures revert. The GET only ever runs while signed in.
export function useTitleStatus(
  kind: Kind,
  id: Ref<string | string[]>,
  signedIn: Ref<boolean>,
  fetcher: StatusFetcher = createApiStatusFetcher(kind, id),
): TitleStatusState {
  const status = ref<WatchStatus | null>(null)
  const pending = ref(false)
  let refreshVersion = 0

  async function refresh(): Promise<void> {
    const version = ++refreshVersion
    try {
      const fetched = (await fetcher.getStatus()) ?? null
      if (version === refreshVersion)
        status.value = fetched
    }
    catch {
      if (version === refreshVersion)
        status.value = null
    }
  }

  watch(signedIn, (value) => {
    if (!value) {
      status.value = null
      return
    }
    void refresh()
  }, { immediate: true, flush: 'sync' })

  async function set(next: WatchStatus): Promise<void> {
    if (!signedIn.value || pending.value)
      return
    refreshVersion++
    const previous = status.value
    status.value = next
    pending.value = true
    try {
      status.value = (await fetcher.putStatus(next)) ?? null
    }
    catch {
      status.value = previous
    }
    finally {
      pending.value = false
    }
  }

  async function clear(): Promise<void> {
    if (!signedIn.value || pending.value)
      return
    refreshVersion++
    const previous = status.value
    status.value = null
    pending.value = true
    try {
      status.value = (await fetcher.deleteStatus()) ?? null
    }
    catch {
      status.value = previous
    }
    finally {
      pending.value = false
    }
  }

  return { status, pending, set, clear }
}
