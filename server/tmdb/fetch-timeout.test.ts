import { describe, expect, it, vi } from 'vitest'
import { fetchJsonWithTimeout, fetchWithTimeout, TMDB_FETCH_TIMEOUT_MS } from './fetch-timeout'

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

describe('fetchJsonWithTimeout', () => {
  // Tarpit shapes from the production incident, with real timers and small
  // budgets so the suite stays fast: silent socket (fetch never settles)
  // and dripping body (headers fast, json() never settles because abort
  // does not cancel body reading in every runtime).
  it('rejects on a silent socket within budget without abort propagation', async () => {
    // Hostile double: ignores the abort signal entirely, like a hung
    // socket in runtimes where abort does not settle the fetch.
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}))
    const startedAt = Date.now()
    await expect(
      fetchJsonWithTimeout('https://example.test/silent', {}, fetchMock, 150),
    ).rejects.toThrow(/timeout/i)
    expect(Date.now() - startedAt).toBeLessThan(5_000)
  })

  it('rejects on a dripping body within budget', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: () => new Promise<unknown>(() => {}),
    } as Response))
    const startedAt = Date.now()
    await expect(
      fetchJsonWithTimeout('https://example.test/drip', {}, fetchMock, 150),
    ).rejects.toThrow(/timeout/i)
    expect(Date.now() - startedAt).toBeLessThan(5_000)
  })

  it('returns status, ok and body on the happy path', async () => {
    const fetchMock = vi.fn(async () => new Response('{"page":1}', { status: 200 }))
    await expect(
      fetchJsonWithTimeout('https://example.test/ok', {}, fetchMock, 1_000),
    ).resolves.toEqual({ status: 200, ok: true, body: { page: 1 } })
  })

  it('best-effort cancels a stalled body on timeout without masking it', async () => {
    const cancel = vi.fn(async () => {})
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: { cancel },
      json: () => new Promise<unknown>(() => {}),
    } as unknown as Response))
    await expect(
      fetchJsonWithTimeout('https://example.test/drip', {}, fetchMock, 150),
    ).rejects.toThrow(/timeout/i)
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it('surfaces non-ok statuses without treating them as timeouts', async () => {
    const fetchMock = vi.fn(async () => new Response('{"e":1}', { status: 429 }))
    const result = await fetchJsonWithTimeout('https://example.test/rl', {}, fetchMock, 1_000)
    expect(result).toEqual({ status: 429, ok: false, body: { e: 1 } })
  })
})
