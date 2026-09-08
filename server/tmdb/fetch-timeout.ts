// Workers-safe fetch timeout: manual AbortController + setTimeout + clearTimeout.
// AbortSignal.timeout() is avoided on purpose: its timer cannot be cancelled
// early and keeps the request context alive for the whole duration on workerd.

export const TMDB_FETCH_TIMEOUT_MS = 10_000

export const DEFAULT_CACHE_WRAP_TIMEOUT_MS = 15_000

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

export interface TimedJsonResult {
  status: number
  ok: boolean
  body: unknown
}

export function createTimeoutError(ms: number, url: string): Error {
  const timeoutError = new Error(`TMDB request timeout after ${ms}ms: ${url}`)
  timeoutError.name = 'TimeoutError'
  return timeoutError
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  fetcher: FetchLike,
  ms: number = TMDB_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined
  // A pre-aborted caller signal never re-fires, so forward it eagerly:
  // otherwise the fetch would proceed on a live signal despite the abort.
  if (init.signal?.aborted) {
    try {
      controller.abort()
    }
    catch {
      // ignore
    }
  }
  // Load-bearing: the timer promise below rejects on its own. Abort is
  // best-effort resource cleanup only — a hung socket in some runtimes
  // never settles its fetch even after abort, so the timeout must never
  // depend on abort propagation. (Proven by the drip-tarpit harness:
  // abort alone left the body reader hanging until the cache backstop.)
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true
      try {
        controller.abort()
      }
      catch {
        // ignore: the reject below carries the timeout either way
      }
      reject(createTimeoutError(ms, url))
    }, ms)
  })
  // Forward a caller-provided abort (e.g. client disconnect) without
  // mistaking it for a timeout.
  const onCallerAbort = (): void => {
    try {
      controller.abort()
    }
    catch {
      // ignore: caller aborts need no further handling here
    }
  }
  init.signal?.addEventListener('abort', onCallerAbort, { once: true })
  try {
    return await Promise.race([
      fetcher(url, { ...init, signal: controller.signal }),
      timeoutPromise,
    ])
  }
  catch (error) {
    // Normalise a post-timeout abort rejection to TimeoutError so callers
    // see one timeout shape regardless of which side won the race.
    if (timedOut && !(error instanceof Error && error.name === 'TimeoutError'))
      throw createTimeoutError(ms, url)
    throw error
  }
  finally {
    init.signal?.removeEventListener('abort', onCallerAbort)
    if (timer !== undefined)
      clearTimeout(timer)
  }
}

// Total-budget fetch+JSON with an abort-independent timeout. Covers what
// fetchWithTimeout cannot: a dripping body (headers arrive fast so fetch
// resolves, then bytes trickle forever). In runtimes where abort does not
// cancel an in-progress body stream, only this outer timer bounds the
// read — verified against the drip-tarpit harness (15s before, ~budget
// after). Callers map TimeoutError to their own status (TMDB: 504).
export async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit,
  fetchFn: FetchLike,
  ms: number = TMDB_FETCH_TIMEOUT_MS,
): Promise<TimedJsonResult> {
  let budgetTimer: ReturnType<typeof setTimeout> | undefined
  const budget = new Promise<never>((_, reject) => {
    budgetTimer = setTimeout(() => reject(createTimeoutError(ms, url)), ms)
  })
  try {
    const response = await Promise.race([
      fetchWithTimeout(url, init, fetchFn, ms),
      budget,
    ])
    const body = await Promise.race([response.json(), budget])
    return { status: response.status, ok: response.ok, body }
  }
  finally {
    if (budgetTimer !== undefined)
      clearTimeout(budgetTimer)
  }
}
