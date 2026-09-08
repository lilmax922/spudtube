import { describe, expect, it, vi } from 'vitest'
import { fetchWithTimeout, TMDB_FETCH_TIMEOUT_MS } from './fetch-timeout'

describe('fetchWithTimeout', () => {
  it('resolves the response when fetch settles in time', async () => {
    const response = new Response('{"ok":true}', { status: 200 })
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => response)

    await expect(
      fetchWithTimeout('https://example.test/a', {}, fetchMock, 1_000),
    ).resolves.toBe(response)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('aborts a hung fetch and rejects with a timeout error', async () => {
    vi.useFakeTimers()
    try {
      let observedSignal: AbortSignal | undefined
      // Faithful double: like real fetch, it rejects once aborted.
      const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
        observedSignal = init?.signal as AbortSignal | undefined
        return new Promise<Response>((_, reject) => {
          observedSignal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
        })
      })

      const pending = fetchWithTimeout('https://example.test/hung', {}, fetchMock, 1_000)
      const assertion = expect(pending).rejects.toThrow(/timeout/i)
      await vi.advanceTimersByTimeAsync(1_001)
      await assertion

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(observedSignal?.aborted).toBe(true)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('aborts immediately when the caller signal is already aborted', async () => {
    const caller = new AbortController()
    caller.abort()
    let observedSignal: AbortSignal | undefined
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      observedSignal = init?.signal as AbortSignal | undefined
      return new Response('{"ok":true}', { status: 200 })
    })

    // A faithful double must see an already-aborted signal: the entry check
    // forwards the caller abort instead of letting the fetch proceed.
    await fetchWithTimeout('https://example.test/pre-aborted', { signal: caller.signal }, fetchMock, 1_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(observedSignal?.aborted).toBe(true)
  })

  it('exposes a sane default timeout budget', () => {
    expect(TMDB_FETCH_TIMEOUT_MS).toBeGreaterThan(0)
    expect(TMDB_FETCH_TIMEOUT_MS).toBeLessThanOrEqual(15_000)
  })
})
