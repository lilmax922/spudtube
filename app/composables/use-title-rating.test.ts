import type { RatingLabel } from '#server/db/schema/rating'
import type { RatingFetcher } from './use-title-rating'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useTitleRating } from './use-title-rating'

function createFakeFetcher() {
  const getRating = vi.fn<RatingFetcher['getRating']>()
  const putRating = vi.fn<RatingFetcher['putRating']>()
  const deleteRating = vi.fn<RatingFetcher['deleteRating']>()
  return { fetcher: { getRating, putRating, deleteRating }, getRating, putRating, deleteRating }
}

function deferred<T>(): { promise: Promise<T>, resolve: (value: T) => void, reject: (reason: unknown) => void } {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('use-title-rating', () => {
  it('loads the persisted rating for a signed-in user', async () => {
    const { fetcher, getRating } = createFakeFetcher()
    getRating.mockResolvedValue('GOOD')

    const state = useTitleRating('MOVIE', ref('424'), ref(true), fetcher)

    await vi.waitFor(() => expect(state.label.value).toBe('GOOD'))
  })

  it('keeps the label null for signed-out visitors and resets on sign-out', async () => {
    const { fetcher, getRating } = createFakeFetcher()
    getRating.mockResolvedValue('GOOD')
    const signedIn = ref(false)

    const state = useTitleRating('MOVIE', ref('424'), signedIn, fetcher)

    expect(state.label.value).toBeNull()
    expect(getRating).not.toHaveBeenCalled()

    signedIn.value = true
    await vi.waitFor(() => expect(state.label.value).toBe('GOOD'))

    signedIn.value = false
    expect(state.label.value).toBeNull()
    expect(state.pending.value).toBe(false)
  })

  it('rate() applies the label immediately and keeps pending while persisting', async () => {
    const { fetcher, getRating, putRating } = createFakeFetcher()
    getRating.mockResolvedValue(null)
    const flight = deferred<RatingLabel>()
    putRating.mockReturnValueOnce(flight.promise)
    const state = useTitleRating('MOVIE', ref('424'), ref(true), fetcher)

    const rating = state.rate('AWESOME')

    expect(state.label.value).toBe('AWESOME')
    expect(state.pending.value).toBe(true)
    expect(putRating).toHaveBeenCalledWith('AWESOME')

    flight.resolve('AWESOME')
    await rating
    expect(state.label.value).toBe('AWESOME')
    expect(state.pending.value).toBe(false)
  })

  it('rate() reverts to the previous label when persisting fails', async () => {
    const { fetcher, getRating, putRating } = createFakeFetcher()
    getRating.mockResolvedValue('GOOD')
    putRating.mockRejectedValue(new Error('boom'))
    const state = useTitleRating('MOVIE', ref('424'), ref(true), fetcher)
    await vi.waitFor(() => expect(state.label.value).toBe('GOOD'))

    await state.rate('AWESOME')

    expect(state.label.value).toBe('GOOD')
    expect(state.pending.value).toBe(false)
  })

  it('clear() removes the label immediately and reverts when removal fails', async () => {
    const { fetcher, getRating, deleteRating } = createFakeFetcher()
    getRating.mockResolvedValue('GOOD')
    deleteRating.mockRejectedValueOnce(new Error('boom'))
    const state = useTitleRating('MOVIE', ref('424'), ref(true), fetcher)
    await vi.waitFor(() => expect(state.label.value).toBe('GOOD'))

    await state.clear()
    expect(state.label.value).toBe('GOOD')

    deleteRating.mockResolvedValueOnce(null)
    await state.clear()
    expect(state.label.value).toBeNull()
    expect(deleteRating).toHaveBeenCalledTimes(2)
  })

  it('ignores rate() and clear() while a change is pending', async () => {
    const { fetcher, getRating, putRating, deleteRating } = createFakeFetcher()
    getRating.mockResolvedValue(null)
    const flight = deferred<RatingLabel>()
    putRating.mockReturnValueOnce(flight.promise)
    const state = useTitleRating('MOVIE', ref('424'), ref(true), fetcher)

    const rating = state.rate('GOOD')
    await state.rate('AWESOME')
    await state.clear()

    expect(putRating).toHaveBeenCalledTimes(1)
    expect(deleteRating).not.toHaveBeenCalled()
    expect(state.label.value).toBe('GOOD')

    flight.resolve('GOOD')
    await rating
  })

  it('rate() and clear() are no-ops for signed-out visitors', async () => {
    const { fetcher, putRating, deleteRating } = createFakeFetcher()
    const state = useTitleRating('MOVIE', ref('424'), ref(false), fetcher)

    await state.rate('GOOD')
    await state.clear()

    expect(putRating).not.toHaveBeenCalled()
    expect(deleteRating).not.toHaveBeenCalled()
    expect(state.label.value).toBeNull()
  })

  it('refetches and resets the label when the title id changes', async () => {
    const { fetcher, getRating } = createFakeFetcher()
    getRating.mockResolvedValueOnce('GOOD').mockResolvedValueOnce('AWESOME')
    const id = ref('424')

    const state = useTitleRating('MOVIE', id, ref(true), fetcher)
    await vi.waitFor(() => expect(state.label.value).toBe('GOOD'))

    id.value = '425'

    expect(state.label.value).toBeNull()
    await vi.waitFor(() => expect(state.label.value).toBe('AWESOME'))
    expect(getRating).toHaveBeenCalledTimes(2)
  })

  it('keeps the current label when a refresh fails', async () => {
    const { fetcher, getRating } = createFakeFetcher()
    getRating.mockResolvedValueOnce('GOOD').mockRejectedValueOnce(new Error('boom'))
    const id = ref('424')

    const state = useTitleRating('MOVIE', id, ref(true), fetcher)
    await vi.waitFor(() => expect(state.label.value).toBe('GOOD'))

    id.value = '425'
    expect(state.label.value).toBeNull()
    await vi.waitFor(() => expect(getRating).toHaveBeenCalledTimes(2))
    expect(state.label.value).toBeNull()
    expect(state.pending.value).toBe(false)
  })
})
