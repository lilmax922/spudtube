export interface TtlCache {
  wrap: <T>(
    key: string,
    ttl: number | ((value: T) => number),
    loader: () => Promise<T>,
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
    ): Promise<T> {
      const hit = entries.get(key)
      if (hit && hit.expiresAt > now())
        return hit.value as T
      const inFlight = pending.get(key)
      if (inFlight)
        return inFlight as Promise<T>
      const task = loader().then((value) => {
        const ttlMs = typeof ttl === 'function' ? ttl(value) : ttl
        store(key, value, ttlMs)
        return value
      })
      pending.set(key, task)
      try {
        return await task
      }
      finally {
        // Load-bearing: a leaked entry would hang all future same-key loads.
        pending.delete(key)
      }
    },
  }
}
