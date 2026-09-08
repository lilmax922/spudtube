// Workers-safe fetch timeout: manual AbortController + setTimeout + clearTimeout.
// AbortSignal.timeout() is avoided on purpose: its timer cannot be cancelled
// early and keeps the request context alive for the whole duration on workerd.

export const TMDB_FETCH_TIMEOUT_MS = 10_000

export const DEFAULT_CACHE_WRAP_TIMEOUT_MS = 15_000

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  fetcher: FetchLike,
  ms: number = TMDB_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  let timedOut = false
  // A pre-aborted caller signal never re-fires, so forward it eagerly:
  // otherwise the fetch would proceed on a live signal despite the abort.
  if (init.signal?.aborted)
    controller.abort()
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, ms)
  // Forward a caller-provided abort (e.g. client disconnect) without
  // mistaking it for a timeout.
  const onCallerAbort = (): void => controller.abort()
  init.signal?.addEventListener('abort', onCallerAbort, { once: true })
  try {
    return await fetcher(url, { ...init, signal: controller.signal })
  }
  catch (error) {
    if (timedOut) {
      const timeoutError = new Error(`TMDB request timeout after ${ms}ms: ${url}`)
      timeoutError.name = 'TimeoutError'
      throw timeoutError
    }
    throw error
  }
  finally {
    init.signal?.removeEventListener('abort', onCallerAbort)
    clearTimeout(timer)
  }
}
