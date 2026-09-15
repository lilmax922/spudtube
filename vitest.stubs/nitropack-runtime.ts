import type { H3Event } from 'h3'
import { setResponseHeader } from 'h3'

// Test-only stand-in for nitropack/runtime's defineCachedEventHandler. The real
// module pulls in Nitro's storage virtual modules, which do not exist under
// vitest, so the node project aliases nitropack/runtime here (see
// vitest.config.ts). Semantics mirror Nitro: entries expire after maxAge
// seconds, swr:false never serves stale, getKey selects the entry, and
// shouldBypassCache skips the cache entirely. Successful responses carry the
// same cache-control header Nitro would emit.
export interface CachedEventHandlerOptions {
  maxAge?: number
  swr?: boolean
  varies?: string[]
  getKey?: (event: H3Event) => string | Promise<string>
  shouldBypassCache?: (event: H3Event) => boolean | Promise<boolean>
}

export type CachedEventHandler = (event: H3Event) => Promise<unknown>

const stores = new Set<Map<string, { expiresAt: number, body: unknown }>>()

export function __resetNitropackRuntimeCache(): void {
  for (const store of stores) store.clear()
}

export function defineCachedEventHandler(handler: CachedEventHandler, opts: CachedEventHandlerOptions = {}): CachedEventHandler {
  const store = new Map<string, { expiresAt: number, body: unknown }>()
  stores.add(store)
  return async (event: H3Event) => {
    const bypass = opts.shouldBypassCache ? await opts.shouldBypassCache(event) : false
    const maxAge = opts.maxAge ?? 0
    const key = opts.getKey ? await opts.getKey(event) : event.path
    if (!bypass && maxAge > 0) {
      const hit = store.get(key)
      if (hit && hit.expiresAt > Date.now()) {
        setResponseHeader(event, 'cache-control', `max-age=${maxAge}`)
        return hit.body
      }
      store.delete(key)
    }
    const body = await handler(event)
    if (!bypass && maxAge > 0)
      store.set(key, { expiresAt: Date.now() + maxAge * 1000, body })
    if (maxAge > 0)
      setResponseHeader(event, 'cache-control', `max-age=${maxAge}`)
    return body
  }
}
