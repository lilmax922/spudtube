export interface TtlCache {
  wrap: <T>(
    key: string,
    ttl: number | ((value: T) => number),
    loader: () => Promise<T>,
  ) => Promise<T>
}

export function createTtlCache({ now }: { now: () => number }): TtlCache {
  const entries = new Map<string, { expiresAt: number, value: unknown }>()

  return {
    async wrap<T>(
      key: string,
      ttl: number | ((value: T) => number),
      loader: () => Promise<T>,
    ): Promise<T> {
      const hit = entries.get(key)
      if (hit && hit.expiresAt > now())
        return hit.value as T
      const value = await loader()
      const ttlMs = typeof ttl === 'function' ? ttl(value) : ttl
      entries.set(key, { expiresAt: now() + ttlMs, value })
      return value
    },
  }
}
