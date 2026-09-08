import { describe, expect, it, vi } from 'vitest'
import { createTtlCache } from './cache'

function createClock(start = 1_000_000) {
  let t = start
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms
    },
  }
}

describe('tmdb TTL cache', () => {
  it('returns the cached value within TTL without re-running the loader', async () => {
    const clock = createClock()
    const cache = createTtlCache({ now: clock.now })
    const loader = vi.fn(async () => 'value')

    await expect(cache.wrap('key', 60_000, loader)).resolves.toBe('value')
    await expect(cache.wrap('key', 60_000, loader)).resolves.toBe('value')

    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('re-runs the loader once the entry expires', async () => {
    const clock = createClock()
    const cache = createTtlCache({ now: clock.now })
    const loader = vi.fn(async () => 'value')

    await cache.wrap('key', 1_000, loader)
    clock.advance(1_001)
    await cache.wrap('key', 1_000, loader)

    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('selects the TTL per value when given a function', async () => {
    const clock = createClock()
    const cache = createTtlCache({ now: clock.now })
    const ttlFor = (value: string) => value === 'long' ? 3_600_000 : 1_000
    const loader = vi.fn(async () => 'long')

    await cache.wrap('key', ttlFor, loader)
    clock.advance(2_000)
    // Still within the long TTL — no reload.
    await cache.wrap('key', ttlFor, loader)
    expect(loader).toHaveBeenCalledTimes(1)

    loader.mockResolvedValueOnce('short')
    clock.advance(3_600_000)
    // Long TTL elapsed — reload picks the short TTL this time.
    await cache.wrap('key', ttlFor, loader)
    clock.advance(1_001)
    await cache.wrap('key', ttlFor, loader)
    expect(loader).toHaveBeenCalledTimes(3)
  })

  it('does not cache a failed loader', async () => {
    const clock = createClock()
    const cache = createTtlCache({ now: clock.now })
    const loader = vi.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue('recovered')

    await expect(cache.wrap('key', 60_000, loader)).rejects.toThrow('boom')
    await expect(cache.wrap('key', 60_000, loader)).resolves.toBe('recovered')

    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('runs concurrent same-key loads through a single loader call', async () => {
    const clock = createClock()
    const cache = createTtlCache({ now: clock.now })
    let calls = 0
    const loader = vi.fn(async () => {
      calls += 1
      await new Promise(resolve => setTimeout(resolve, 10))
      return `loaded-${calls}`
    })

    const [first, second] = await Promise.all([
      cache.wrap('key', 60_000, loader),
      cache.wrap('key', 60_000, loader),
    ])

    expect(loader).toHaveBeenCalledTimes(1)
    expect(first).toBe('loaded-1')
    expect(second).toBe('loaded-1')
    // A later call within TTL still hits the settled cache entry.
    await expect(cache.wrap('key', 60_000, loader)).resolves.toBe('loaded-1')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('evicts the oldest entry when inserting past the cap', async () => {
    const clock = createClock()
    const cache = createTtlCache({ now: clock.now })
    const loader = vi.fn(async (key: string) => `value-for-${key}`)

    for (let index = 0; index < 1000; index += 1)
      await cache.wrap(`key-${index}`, 60_000, () => loader(`key-${index}`))
    expect(loader).toHaveBeenCalledTimes(1000)

    // One more insert pushes the cache past the cap and evicts key-0.
    await cache.wrap('key-1000', 60_000, () => loader('key-1000'))
    // key-999 survives; key-0 must reload.
    await cache.wrap('key-999', 60_000, () => loader('key-999'))
    await cache.wrap('key-0', 60_000, () => loader('key-0'))
    expect(loader).toHaveBeenCalledTimes(1002)
  })
})
