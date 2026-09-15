import type { ComputedRef, WatchSource } from 'vue'
import type { AsyncData, NuxtApp } from '#app'
import type { TmdbLanguage } from '#server/tmdb/types'
import type { Kind } from '#shared/kind/kind'
import { computed, watch } from 'vue'
import { clearNuxtData, useAsyncData, useNuxtApp } from '#imports'

export interface SsrData<T> {
  data: ComputedRef<T | null>
  pending: ComputedRef<boolean>
  failed: ComputedRef<boolean>
  ensure: () => Promise<void>
  reload: () => Promise<void>
}

export interface SsrKeyParams {
  kind: Kind
  lang: TmdbLanguage
}

interface ActiveEntry<T> {
  key: string
  request: AsyncData<T, Error>
}

// DisplayLocale narrows to the two TMDB languages and Kind is binary, so the
// key space is closed: every combination below is created up front in setup
// (without fetching), and later context switches only select and execute an
// existing entry. Creating fetches outside setup would log NUXT_E3003.
const SSR_KINDS: readonly Kind[] = ['MOVIE', 'TV_SHOW']
const SSR_LANGS: readonly TmdbLanguage[] = ['en', 'zh-TW']

// Payload data is only trustworthy during hydration: on later mounts the
// static snapshot would serve stale content instead of refetching, so only
// hydration may seed entries from it.
function hydrationOnlyGetCachedData<T>(key: string, nuxtApp: NuxtApp): T | undefined {
  return nuxtApp.isHydrating ? (nuxtApp.payload.data[key] as T | undefined) : undefined
}

function keyFor(prefix: string, params: SsrKeyParams): string {
  return `${prefix}:${params.kind}:${params.lang}`
}

export function useSsrData<T>(
  prefix: string,
  paramsFn: () => SsrKeyParams,
  fetcher: () => Promise<T>,
  clearSources: WatchSource[] = [],
): SsrData<T> {
  const entries = new Map<string, ActiveEntry<T>>()
  for (const kind of SSR_KINDS) {
    for (const lang of SSR_LANGS) {
      const comboKey = keyFor(prefix, { kind, lang })
      entries.set(comboKey, {
        key: comboKey,
        // The entry matching the current context starts fetching immediately
        // so SSR tracks it; the rest stay idle until selected. Inference
        // picks an overload whose data shape no longer matches the entry,
        // so pin it back.
        request: useAsyncData(comboKey, fetcher, {
          immediate: import.meta.server && comboKey === keyFor(prefix, paramsFn()),
          getCachedData: hydrationOnlyGetCachedData<T>,
        }) as ActiveEntry<T>['request'],
      })
    }
  }

  function touch(): ActiveEntry<T> {
    const key = keyFor(prefix, paramsFn())
    const existing = entries.get(key)
    // The key space above is closed, so every selection hits a pre-created
    // entry. Recreate only as a safety net.
    if (existing)
      return existing
    const created: ActiveEntry<T> = {
      key,
      request: useAsyncData(key, fetcher, {
        immediate: false,
        getCachedData: hydrationOnlyGetCachedData<T>,
      }) as ActiveEntry<T>['request'],
    }
    entries.set(key, created)
    return created
  }

  // Clear the outgoing entry synchronously at trigger time, before the next
  // paint: it shows a skeleton, never stale data from the previous context.
  // Only features whose first paint branches on emptiness (the filter bar)
  // need this; the hero and the rows keep settled content behind their
  // loading flags instead.
  let previousKey = keyFor(prefix, paramsFn())
  if (clearSources.length > 0) {
    watch(clearSources, () => {
      clearNuxtData([previousKey])
      previousKey = keyFor(prefix, paramsFn())
    }, { flush: 'sync' })
  }

  // Pure selection for render reads: every key is pre-created above, so this
  // never creates entries outside setup (which would log NUXT_E3003).
  function selected(): ActiveEntry<T> | undefined {
    return entries.get(keyFor(prefix, paramsFn()))
  }

  const data = computed<T | null>(() => selected()?.request.data.value ?? null)
  const pending = computed<boolean>(() => selected()?.request.pending.value ?? false)
  const failed = computed<boolean>(() => selected()?.request.error.value != null)

  async function ensure(): Promise<void> {
    const active = touch()
    if (active.request.data.value != null)
      return
    await active.request.execute({ dedupe: 'defer' })
  }

  async function reload(): Promise<void> {
    const active = touch()
    await active.request.execute({ dedupe: 'defer' })
  }

  return { data, pending, failed, ensure, reload }
}

// Test-only: drop every keyed entry so the next test rebuilds with its own
// fetcher. clearNuxtData alone is not enough: the registry keeps the first
// entry (and its handler), so a reused key would silently keep fetching
// with the previous test's fake.
export function clearSsrDataForTest(): void {
  const nuxtApp = useNuxtApp()
  clearNuxtData()
  for (const cacheKey of Object.keys(nuxtApp._asyncData))
    delete nuxtApp._asyncData[cacheKey]
  for (const promiseKey of Object.keys(nuxtApp._asyncDataPromises))
    delete nuxtApp._asyncDataPromises[promiseKey]
}
