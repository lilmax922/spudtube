export interface TtlCache {
  wrap: <T>(key: string, ttlMs: number, loader: () => Promise<T>) => Promise<T>
}

export function createTtlCache({ now }: { now: () => number }): TtlCache {
  const entries = new Map<string, { expiresAt: number, value: unknown }>()

  return {
    async wrap<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
      const hit = entries.get(key)
      if (hit && hit.expiresAt > now())
        return hit.value as T
      const value = await loader()
      entries.set(key, { expiresAt: now() + ttlMs, value })
      return value
    },
  }
}
