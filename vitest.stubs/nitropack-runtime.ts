import type { H3Event } from 'h3'
import { setResponseHeader } from 'h3'

// Test-only stand-in for nitropack/runtime's defineCachedEventHandler. The real
// module pulls in Nitro's storage virtual modules, which do not exist under
// vitest, so the node project aliases nitropack/runtime here (see
// vitest.config.ts). Semantics mirror Nitro's cached handler
// (nitropack/dist/runtime/internal/cache.mjs): entries expire after maxAge
// seconds; swr:true serves a stale entry instantly while revalidating in the
// background (a failed revalidation keeps the stale entry, mirroring Nitro's
// SWR handler-error path); swr:false discards expired entries and blocks on
// the live fetch; concurrent same-key requests share one in-flight load (the
// pending slot); thrown errors never populate the cache (Nitro's validate()
// rejects code >= 400 and resolve-errors skip the store write). Successful
// responses carry the same cache-control header Nitro emits (s-maxage plus
// stale-while-revalidate under swr, max-age otherwise).
export interface CachedEventHandlerOptions {
  maxAge?: number
  swr?: boolean
  staleMaxAge?: number
  varies?: string[]
  getKey?: (event: H3Event) => string | Promise<string>
  shouldBypassCache?: (event: H3Event) => boolean | Promise<boolean>
}

export type CachedEventHandler = (event: H3Event) => Promise<unknown>

const stores = new Set<Map<string, { mtime: number, body: unknown }>>()
const pendings = new Set<Map<string, Promise<unknown>>>()

export function __resetNitropackRuntimeCache(): void {
  for (const store of stores) store.clear()
  for (const pending of pendings) pending.clear()
}

function cacheControlValue(maxAge: number, swr: boolean, staleMaxAge?: number): string {
  if (swr) {
    return staleMaxAge
      ? `s-maxage=${maxAge}, stale-while-revalidate=${staleMaxAge}`
      : `s-maxage=${maxAge}, stale-while-revalidate`
  }
  return `max-age=${maxAge}`
}

export function defineCachedEventHandler(handler: CachedEventHandler, opts: CachedEventHandlerOptions = {}): CachedEventHandler {
  const store = new Map<string, { mtime: number, body: unknown }>()
  const pending = new Map<string, Promise<unknown>>()
  stores.add(store)
  pendings.add(pending)
  const varies = (opts.varies ?? []).map(header => header.toLowerCase()).sort()
  const toStrippedEvent = (event: H3Event): H3Event => {
    const originalHeaders = (event.node.req.headers ?? {}) as Record<string, unknown>
    const filtered: Record<string, unknown> = {}
    for (const name of Object.keys(originalHeaders)) {
      if (varies.includes(name.toLowerCase()))
        filtered[name.toLowerCase()] = originalHeaders[name]
    }
    const strippedHeaders = new Headers()
    for (const [name, value] of Object.entries(filtered)) {
      if (Array.isArray(value)) {
        for (const item of value) strippedHeaders.append(name, String(item))
      }
      else if (value !== undefined && value !== null) {
        strippedHeaders.set(name, String(value))
      }
    }
    const stripped = Object.create(Object.getPrototypeOf(event), Object.getOwnPropertyDescriptors(event)) as H3Event
    const reqProxy = new Proxy(event.node.req, {
      get(target, property, receiver) {
        if (property === 'headers')
          return filtered
        return Reflect.get(target, property, receiver)
      },
    })
    stripped.node = { ...event.node, req: reqProxy }
    ;(stripped as unknown as { _headers: Headers })._headers = strippedHeaders
    return stripped
  }
  return async (event: H3Event) => {
    const bypass = opts.shouldBypassCache ? await opts.shouldBypassCache(event) : false
    const maxAge = opts.maxAge ?? 0
    const key = opts.getKey ? await opts.getKey(event) : event.path
    // Nitro's own default is swr:true; the header below follows suit.
    const swr = opts.swr ?? true
    if (bypass || maxAge <= 0)
      return handler(toStrippedEvent(event))
    const headerValue = cacheControlValue(maxAge, swr, opts.staleMaxAge)
    const hit = store.get(key)
    const expired = !hit || Date.now() - hit.mtime > maxAge * 1000
    const load = (): Promise<unknown> => {
      // Pending-slot dedup like Nitro: concurrent same-key requests share one
      // in-flight load instead of stampeding the upstream.
      const inFlight = pending.get(key)
      if (inFlight)
        return inFlight
      const task: Promise<unknown> = (async () => {
        const body = await handler(toStrippedEvent(event))
        store.set(key, { mtime: Date.now(), body })
        return body
      })()
      pending.set(key, task)
      // Identity-checked eviction so a late loser never clears the winner's
      // slot. The store write happens only on success, so a failed load
      // (timeout, 5xx) keeps the prior entry exactly like Nitro.
      task.then(
        () => {
          if (pending.get(key) === task)
            pending.delete(key)
        },
        () => {
          if (pending.get(key) === task)
            pending.delete(key)
        },
      )
      return task
    }
    if (hit && !expired) {
      setResponseHeader(event, 'cache-control', headerValue)
      return hit.body
    }
    if (swr && hit) {
      // Serve stale instantly; the revalidation continues in the background.
      // Quiet catch mirrors Nitro's SWR handler-error path (which logs and
      // keeps serving the stale entry); the stub stays quiet so tests observe
      // only response behavior.
      load().then(() => {}, () => {})
      setResponseHeader(event, 'cache-control', headerValue)
      return hit.body
    }
    // Cold miss, or swr:false past expiry: block on the live fetch like Nitro.
    const body = await load()
    setResponseHeader(event, 'cache-control', headerValue)
    return body
  }
}
