import { describe, expect, it, vi } from 'vitest'
import { createTtlCache } from './cache'
import { TmdbApiError } from './errors'

function createClock(start = 1_000_000) {
  let t = start
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms
    },
  }
}

describe('tmdb TTL cache anti-hang', () => {
  it('releases a stalled same-key slot on timeout so later calls retry', async () => {
    vi.useFakeTimers()
    try {
      const clock = createClock()
      const cache = createTtlCache({ now: clock.now })
      // Never-settling loader: the production TMDB stall shape.
      const stalled = vi.fn(() => new Promise<string>(() => {}))

      const first = cache.wrap('poisoned', 60_000, stalled, { timeoutMs: 1_000 })
      const second = cache.wrap('poisoned', 60_000, stalled, { timeoutMs: 1_000 })
      expect(stalled).toHaveBeenCalledTimes(1)

      const assertion = Promise.all([
        expect(first).rejects.toThrow(/timeout/i),
        expect(second).rejects.toThrow(/timeout/i),
      ])
      await vi.advanceTimersByTimeAsync(1_001)
      await assertion

      // The slot must be evicted: a later call re-runs the loader instead of
      // hanging on the dead in-flight promise forever.
      const recovered = vi.fn(async () => 'recovered')
      const retry = cache.wrap('poisoned', 60_000, recovered, { timeoutMs: 1_000 })
      await expect(retry).resolves.toBe('recovered')
      expect(recovered).toHaveBeenCalledTimes(1)
    }
    finally {
      vi.useRealTimers()
    }
  }, 8_000)

  it('surfaces the stall timeout as TmdbApiError 504 so routes map it to 502', async () => {
    vi.useFakeTimers()
    try {
      const clock = createClock()
      const cache = createTtlCache({ now: clock.now })
      const stalled = vi.fn(() => new Promise<string>(() => {}))

      const pending = cache.wrap('stall-504', 60_000, stalled, { timeoutMs: 1_000 })
      const assertion = expect(pending).rejects.toSatisfy((error: unknown) => {
        return error instanceof TmdbApiError && error.status === 504
      })
      await vi.advanceTimersByTimeAsync(1_001)
      await assertion
    }
    finally {
      vi.useRealTimers()
    }
  }, 8_000)

  it('keeps deduplicating concurrent loads that settle in time', async () => {
    const clock = createClock()
    const cache = createTtlCache({ now: clock.now })
    const loader = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 5))
      return 'fast'
    })

    const [first, second] = await Promise.all([
      cache.wrap('fast-key', 60_000, loader, { timeoutMs: 1_000 }),
      cache.wrap('fast-key', 60_000, loader, { timeoutMs: 1_000 }),
    ])

    expect(loader).toHaveBeenCalledTimes(1)
    expect(first).toBe('fast')
    expect(second).toBe('fast')
  }, 8_000)
})
