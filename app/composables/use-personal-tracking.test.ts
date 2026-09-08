import type { RatingLabel, WatchStatus } from '#shared/personal-tracking/personal-tracking'
import type { PersonalTrackingFetcher } from './use-personal-tracking'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { usePersonalTracking } from './use-personal-tracking'

function createFakeFetcher() {
  const getRating = vi.fn<PersonalTrackingFetcher['getRating']>()
  const putRating = vi.fn<PersonalTrackingFetcher['putRating']>()
  const deleteRating = vi.fn<PersonalTrackingFetcher['deleteRating']>()
  const getStatus = vi.fn<PersonalTrackingFetcher['getStatus']>()
  const putStatus = vi.fn<PersonalTrackingFetcher['putStatus']>()
  const deleteStatus = vi.fn<PersonalTrackingFetcher['deleteStatus']>()
  getRating.mockResolvedValue(null)
  getStatus.mockResolvedValue(null)
  return {
    fetcher: { getRating, putRating, deleteRating, getStatus, putStatus, deleteStatus },
    getRating,
    putRating,
    deleteRating,
    getStatus,
    putStatus,
    deleteStatus,
  }
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

describe('use-personal-tracking', () => {
  it('loads the persisted rating and status for a signed-in user', async () => {
    const { fetcher, getRating, getStatus } = createFakeFetcher()
    getRating.mockResolvedValue('GOOD')
    getStatus.mockResolvedValue('WATCHLISTED')

    const tracking = usePersonalTracking('MOVIE', ref('424'), ref(true), fetcher)

    await vi.waitFor(() => expect(tracking.state.value).toEqual({ rating: 'GOOD', status: 'WATCHLISTED' }))
    expect(tracking.pending.value).toBe(false)
  })

  it('keeps the snapshot empty for signed-out visitors and resets on sign-out', async () => {
    const { fetcher, getRating } = createFakeFetcher()
    getRating.mockResolvedValue('GOOD')
    const signedIn = ref(false)

    const tracking = usePersonalTracking('MOVIE', ref('424'), signedIn, fetcher)

    expect(tracking.state.value).toEqual({ rating: null, status: null })
    expect(getRating).not.toHaveBeenCalled()

    signedIn.value = true
    await vi.waitFor(() => expect(tracking.state.value.rating).toBe('GOOD'))

    signedIn.value = false
    expect(tracking.state.value).toEqual({ rating: null, status: null })
    expect(tracking.pending.value).toBe(false)
  })

  it('rate() flips the rating immediately and keeps pending while persisting', async () => {
    const { fetcher, putRating } = createFakeFetcher()
    const flight = deferred<RatingLabel>()
    putRating.mockReturnValueOnce(flight.promise)
    const tracking = usePersonalTracking('MOVIE', ref('424'), ref(true), fetcher)

    const rating = tracking.rate('AWESOME')

    expect(tracking.state.value.rating).toBe('AWESOME')
    expect(tracking.state.value.status).toBeNull()
    expect(tracking.pending.value).toBe(true)
    expect(putRating).toHaveBeenCalledWith('AWESOME')

    flight.resolve('AWESOME')
    await rating
    expect(tracking.state.value.rating).toBe('AWESOME')
    expect(tracking.pending.value).toBe(false)
  })

  it('setStatus() flips the status immediately and keeps pending while persisting', async () => {
    const { fetcher, putStatus } = createFakeFetcher()
    const flight = deferred<WatchStatus>()
    putStatus.mockReturnValueOnce(flight.promise)
    const tracking = usePersonalTracking('MOVIE', ref('424'), ref(true), fetcher)

    const change = tracking.setStatus('WATCHED')

    expect(tracking.state.value.status).toBe('WATCHED')
    expect(tracking.state.value.rating).toBeNull()
    expect(tracking.pending.value).toBe(true)
    expect(putStatus).toHaveBeenCalledWith('WATCHED')

    flight.resolve('WATCHED')
    await change
    expect(tracking.state.value.status).toBe('WATCHED')
    expect(tracking.pending.value).toBe(false)
  })

  it('rate() reverts to the previous rating when persisting fails', async () => {
    const { fetcher, getRating, putRating } = createFakeFetcher()
    getRating.mockResolvedValue('GOOD')
    putRating.mockRejectedValue(new Error('boom'))
    const tracking = usePersonalTracking('MOVIE', ref('424'), ref(true), fetcher)
    await vi.waitFor(() => expect(tracking.state.value.rating).toBe('GOOD'))

    await tracking.rate('AWESOME')

    expect(tracking.state.value.rating).toBe('GOOD')
    expect(tracking.pending.value).toBe(false)
  })

  it('setStatus() reverts to the previous status when persisting fails', async () => {
    const { fetcher, getStatus, putStatus } = createFakeFetcher()
    getStatus.mockResolvedValue('WATCHLISTED')
    putStatus.mockRejectedValue(new Error('boom'))
    const tracking = usePersonalTracking('MOVIE', ref('424'), ref(true), fetcher)
    await vi.waitFor(() => expect(tracking.state.value.status).toBe('WATCHLISTED'))

    await tracking.setStatus('WATCHED')

    expect(tracking.state.value.status).toBe('WATCHLISTED')
    expect(tracking.pending.value).toBe(false)
  })

  it('clear() removes the field immediately and reverts when removal fails', async () => {
    const { fetcher, getRating, deleteRating } = createFakeFetcher()
    getRating.mockResolvedValue('GOOD')
    deleteRating.mockRejectedValueOnce(new Error('boom'))
    const tracking = usePersonalTracking('MOVIE', ref('424'), ref(true), fetcher)
    await vi.waitFor(() => expect(tracking.state.value.rating).toBe('GOOD'))

    await tracking.clear('rating')
    expect(tracking.state.value.rating).toBe('GOOD')

    deleteRating.mockResolvedValueOnce(null)
    await tracking.clear('rating')
    expect(tracking.state.value.rating).toBeNull()
    expect(deleteRating).toHaveBeenCalledTimes(2)
  })

  it('clear() on the status field leaves the rating untouched', async () => {
    const { fetcher, getRating, getStatus, deleteStatus } = createFakeFetcher()
    getRating.mockResolvedValue('GOOD')
    getStatus.mockResolvedValue('WATCHED')
    deleteStatus.mockResolvedValue(null)
    const tracking = usePersonalTracking('MOVIE', ref('424'), ref(true), fetcher)
    await vi.waitFor(() => expect(tracking.state.value).toEqual({ rating: 'GOOD', status: 'WATCHED' }))

    await tracking.clear('status')

    expect(tracking.state.value).toEqual({ rating: 'GOOD', status: null })
    expect(deleteStatus).toHaveBeenCalledTimes(1)
  })

  it('lets rating and status mutate concurrently', async () => {
    const { fetcher, putRating, putStatus } = createFakeFetcher()
    const flight = deferred<RatingLabel>()
    putRating.mockReturnValueOnce(flight.promise)
    putStatus.mockResolvedValue('WATCHED')
    const tracking = usePersonalTracking('MOVIE', ref('424'), ref(true), fetcher)

    const rating = tracking.rate('GOOD')
    await tracking.setStatus('WATCHED')

    expect(putRating).toHaveBeenCalledTimes(1)
    expect(putStatus).toHaveBeenCalledWith('WATCHED')
    expect(tracking.pending.value).toBe(true)

    flight.resolve('GOOD')
    await rating

    expect(tracking.state.value).toEqual({ rating: 'GOOD', status: 'WATCHED' })
    expect(tracking.pending.value).toBe(false)
  })

  it('drops a second rating issued while the first is still in flight', async () => {
    const { fetcher, putRating } = createFakeFetcher()
    const flight = deferred<RatingLabel>()
    putRating.mockReturnValueOnce(flight.promise)
    const tracking = usePersonalTracking('MOVIE', ref('424'), ref(true), fetcher)

    const rating = tracking.rate('GOOD')
    await tracking.rate('AWESOME')

    expect(putRating).toHaveBeenCalledTimes(1)
    expect(tracking.state.value.rating).toBe('GOOD')

    flight.resolve('GOOD')
    await rating

    expect(tracking.state.value.rating).toBe('GOOD')
    expect(tracking.pending.value).toBe(false)
  })

  it('mutations are no-ops for signed-out visitors', async () => {
    const { fetcher, putRating, putStatus, deleteRating, deleteStatus } = createFakeFetcher()
    const tracking = usePersonalTracking('MOVIE', ref('424'), ref(false), fetcher)

    await tracking.rate('GOOD')
    await tracking.setStatus('WATCHED')
    await tracking.clear('rating')
    await tracking.clear('status')

    expect(putRating).not.toHaveBeenCalled()
    expect(putStatus).not.toHaveBeenCalled()
    expect(deleteRating).not.toHaveBeenCalled()
    expect(deleteStatus).not.toHaveBeenCalled()
    expect(tracking.state.value).toEqual({ rating: null, status: null })
  })

  it('refetches and resets the snapshot when the title id changes', async () => {
    const { fetcher, getRating, getStatus } = createFakeFetcher()
    getRating.mockResolvedValueOnce('GOOD').mockResolvedValueOnce('AWESOME')
    getStatus.mockResolvedValueOnce('WATCHLISTED').mockResolvedValueOnce(null)
    const id = ref('424')

    const tracking = usePersonalTracking('MOVIE', id, ref(true), fetcher)
    await vi.waitFor(() => expect(tracking.state.value).toEqual({ rating: 'GOOD', status: 'WATCHLISTED' }))

    id.value = '425'

    expect(tracking.state.value).toEqual({ rating: null, status: null })
    await vi.waitFor(() => expect(tracking.state.value).toEqual({ rating: 'AWESOME', status: null }))
    expect(getRating).toHaveBeenCalledTimes(2)
    expect(getStatus).toHaveBeenCalledTimes(2)
  })

  it('drops a stale refresh that resolves after the title id changes', async () => {
    const { fetcher, getRating } = createFakeFetcher()
    const stale = deferred<RatingLabel | null>()
    getRating.mockReturnValueOnce(stale.promise).mockResolvedValue('AWESOME')
    const id = ref('424')

    const tracking = usePersonalTracking('MOVIE', id, ref(true), fetcher)
    id.value = '425'
    await vi.waitFor(() => expect(tracking.state.value.rating).toBe('AWESOME'))

    stale.resolve('GOOD')
    await stale.promise.catch(() => {})
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(tracking.state.value.rating).toBe('AWESOME')
  })

  it('never lets an in-flight mutation overwrite the next title', async () => {
    const { fetcher, getRating, putRating } = createFakeFetcher()
    const staleRefresh = deferred<RatingLabel | null>()
    getRating.mockReturnValueOnce(staleRefresh.promise).mockResolvedValue('AWESOME')
    const flight = deferred<RatingLabel>()
    putRating.mockReturnValueOnce(flight.promise)
    const id = ref('424')

    const tracking = usePersonalTracking('MOVIE', id, ref(true), fetcher)
    const rating = tracking.rate('GOOD')
    expect(tracking.state.value.rating).toBe('GOOD')

    id.value = '425'
    expect(tracking.state.value.rating).toBeNull()
    await vi.waitFor(() => expect(tracking.state.value.rating).toBe('AWESOME'))

    flight.resolve('GOOD')
    await rating

    expect(tracking.state.value.rating).toBe('AWESOME')
    expect(tracking.pending.value).toBe(false)
  })

  it('signing out mid-refresh leaves the snapshot empty', async () => {
    const { fetcher, getRating } = createFakeFetcher()
    const flight = deferred<RatingLabel | null>()
    getRating.mockReturnValueOnce(flight.promise)
    const signedIn = ref(true)

    const tracking = usePersonalTracking('MOVIE', ref('424'), signedIn, fetcher)
    signedIn.value = false
    expect(tracking.state.value).toEqual({ rating: null, status: null })

    flight.resolve('GOOD')
    await flight.promise.catch(() => {})
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(tracking.state.value).toEqual({ rating: null, status: null })
  })

  it('keeps the current snapshot when a refresh fails', async () => {
    const { fetcher, getRating } = createFakeFetcher()
    getRating.mockResolvedValueOnce('GOOD').mockRejectedValueOnce(new Error('boom'))
    const id = ref('424')

    const tracking = usePersonalTracking('MOVIE', id, ref(true), fetcher)
    await vi.waitFor(() => expect(tracking.state.value.rating).toBe('GOOD'))

    id.value = '425'
    expect(tracking.state.value.rating).toBeNull()
    await vi.waitFor(() => expect(getRating).toHaveBeenCalledTimes(2))
    expect(tracking.state.value.rating).toBeNull()
    expect(tracking.pending.value).toBe(false)
  })
})
