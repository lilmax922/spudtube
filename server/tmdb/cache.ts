import { TmdbApiError } from './errors'
import { DEFAULT_CACHE_WRAP_TIMEOUT_MS } from './fetch-timeout'

export interface TtlCache {
  wrap: <T>(
    key: string,
    ttl: number | ((value: T) => number),
    loader: () => Promise<T>,
    opts?: { timeoutMs?: number },
  ) => Promise<T>
}

// Starting point, not physics: each entry is a small JSON page. Future
// payload caches share this same bound.
const MAX_ENTRIES = 1000

export function createTtlCache({ now }: { now: () => number }): TtlCache {
  const entries = new Map<string, { expiresAt: number, value: unknown }>()
  const pending = new Map<string, Promise<unknown>>()

  function store<T>(key: string, value: T, ttlMs: number): void {
    // Opportunistic sweep: the map is capped, so this stays bounded.
    for (const [candidate, entry] of entries) {
      if (entry.expiresAt <= now())
        entries.delete(candidate)
    }
    entries.set(key, { expiresAt: now() + ttlMs, value })
    // Evict oldest-inserted first (Map preserves insertion order).
    while (entries.size > MAX_ENTRIES)
      entries.delete(entries.keys().next().value as string)
  }

  return {
    async wrap<T>(
      key: string,
      ttl: number | ((value: T) => number),
      loader: () => Promise<T>,
      opts?: { timeoutMs?: number },
    ): Promise<T> {
      const hit = entries.get(key)
      if (hit && hit.expiresAt > now())
        return hit.value as T
      const inFlight = pending.get(key)
      if (inFlight)
        return inFlight as Promise<T>
      // Anti-hang: a stalled loader must reject instead of pinning the
      // in-flight slot forever (every later same-key load would hang with it).
      const timeoutMs = opts?.timeoutMs ?? DEFAULT_CACHE_WRAP_TIMEOUT_MS
      let timer: ReturnType<typeof setTimeout> | undefined
      const task = (async (): Promise<T> => {
        try {
          const value = await Promise.race([
            loader(),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () => reject(new TmdbApiError(504, `tmdb cache load timeout after ${timeoutMs}ms: ${key}`)),
                timeoutMs,
              )
            }),
          ])
          const ttlMs = typeof ttl === 'function' ? ttl(value) : ttl
          store(key, value, ttlMs)
          return value
        }
        finally {
          if (timer !== undefined)
            clearTimeout(timer)
        }
      })()
      pending.set(key, task)
      try {
        return await task
      }
      finally {
        // Load-bearing: a leaked entry would hang all future same-key loads.
        // Identity-checked so a late loser never evicts the winner's slot.
        if (pending.get(key) === task)
          pending.delete(key)
      }
    },
  }
}
