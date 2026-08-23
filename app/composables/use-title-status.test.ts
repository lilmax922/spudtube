import type { WatchStatus } from '#server/db/schema/title-status'
import type { StatusFetcher } from './use-title-status'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useTitleStatus } from './use-title-status'

function createFakeFetcher() {
  const getStatus = vi.fn<StatusFetcher['getStatus']>()
  const putStatus = vi.fn<StatusFetcher['putStatus']>()
  const deleteStatus = vi.fn<StatusFetcher['deleteStatus']>()
  return { fetcher: { getStatus, putStatus, deleteStatus }, getStatus, putStatus, deleteStatus }
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

describe('use-title-status', () => {
  it('loads the persisted status for a signed-in user', async () => {
    const { fetcher, getStatus } = createFakeFetcher()
    getStatus.mockResolvedValue('WATCHLISTED')

    const state = useTitleStatus('MOVIE', ref('424'), ref(true), fetcher)

    await vi.waitFor(() => expect(state.status.value).toBe('WATCHLISTED'))
  })

  it('keeps the status null for signed-out visitors and resets on sign-out', async () => {
    const { fetcher, getStatus } = createFakeFetcher()
    getStatus.mockResolvedValue('WATCHED')
    const signedIn = ref(false)

    const state = useTitleStatus('MOVIE', ref('424'), signedIn, fetcher)

    expect(state.status.value).toBeNull()
    expect(getStatus).not.toHaveBeenCalled()

    signedIn.value = true
    await vi.waitFor(() => expect(state.status.value).toBe('WATCHED'))

    signedIn.value = false
    expect(state.status.value).toBeNull()
    expect(state.pending.value).toBe(false)
  })

  it('set() applies the status immediately and keeps pending while persisting', async () => {
    const { fetcher, getStatus, putStatus } = createFakeFetcher()
    getStatus.mockResolvedValue(null)
    const flight = deferred<WatchStatus>()
    putStatus.mockReturnValueOnce(flight.promise)
    const state = useTitleStatus('MOVIE', ref('424'), ref(true), fetcher)

    const setting = state.set('WATCHLISTED')

    expect(state.status.value).toBe('WATCHLISTED')
    expect(state.pending.value).toBe(true)
    expect(putStatus).toHaveBeenCalledWith('WATCHLISTED')

    flight.resolve('WATCHLISTED')
    await setting
    expect(state.status.value).toBe('WATCHLISTED')
    expect(state.pending.value).toBe(false)
  })

  it('set() reverts to the previous status when persisting fails', async () => {
    const { fetcher, getStatus, putStatus } = createFakeFetcher()
    getStatus.mockResolvedValue('WATCHED')
    putStatus.mockRejectedValue(new Error('boom'))
    const state = useTitleStatus('MOVIE', ref('424'), ref(true), fetcher)
    await vi.waitFor(() => expect(state.status.value).toBe('WATCHED'))

    await state.set('WATCHLISTED')

    expect(state.status.value).toBe('WATCHED')
    expect(state.pending.value).toBe(false)
  })

  it('clear() removes the status immediately and reverts when removal fails', async () => {
    const { fetcher, getStatus, deleteStatus } = createFakeFetcher()
    getStatus.mockResolvedValue('WATCHED')
    deleteStatus.mockRejectedValueOnce(new Error('boom'))
    const state = useTitleStatus('MOVIE', ref('424'), ref(true), fetcher)
    await vi.waitFor(() => expect(state.status.value).toBe('WATCHED'))

    await state.clear()
    expect(state.status.value).toBe('WATCHED')

    deleteStatus.mockResolvedValueOnce(null)
    await state.clear()
    expect(state.status.value).toBeNull()
    expect(deleteStatus).toHaveBeenCalledTimes(2)
  })

  it('ignores set() and clear() while a change is pending', async () => {
    const { fetcher, getStatus, putStatus, deleteStatus } = createFakeFetcher()
    getStatus.mockResolvedValue(null)
    const flight = deferred<WatchStatus>()
    putStatus.mockReturnValueOnce(flight.promise)
    const state = useTitleStatus('MOVIE', ref('424'), ref(true), fetcher)

    const setting = state.set('WATCHED')
    await state.set('WATCHLISTED')
    await state.clear()

    expect(putStatus).toHaveBeenCalledTimes(1)
    expect(deleteStatus).not.toHaveBeenCalled()
    expect(state.status.value).toBe('WATCHED')

    flight.resolve('WATCHED')
    await setting
  })

  it('set() and clear() are no-ops for signed-out visitors', async () => {
    const { fetcher, putStatus, deleteStatus } = createFakeFetcher()
    const state = useTitleStatus('MOVIE', ref('424'), ref(false), fetcher)

    await state.set('WATCHED')
    await state.clear()

    expect(putStatus).not.toHaveBeenCalled()
    expect(deleteStatus).not.toHaveBeenCalled()
    expect(state.status.value).toBeNull()
  })

  it('refetches and resets the status when the title id changes', async () => {
    const { fetcher, getStatus } = createFakeFetcher()
    getStatus.mockResolvedValueOnce('WATCHLISTED').mockResolvedValueOnce('WATCHED')
    const id = ref('424')

    const state = useTitleStatus('MOVIE', id, ref(true), fetcher)
    await vi.waitFor(() => expect(state.status.value).toBe('WATCHLISTED'))

    id.value = '425'

    expect(state.status.value).toBeNull()
    await vi.waitFor(() => expect(state.status.value).toBe('WATCHED'))
    expect(getStatus).toHaveBeenCalledTimes(2)
  })

  it('keeps the current status when a refresh fails', async () => {
    const { fetcher, getStatus } = createFakeFetcher()
    getStatus.mockResolvedValueOnce('WATCHED').mockRejectedValueOnce(new Error('boom'))
    const id = ref('424')

    const state = useTitleStatus('MOVIE', id, ref(true), fetcher)
    await vi.waitFor(() => expect(state.status.value).toBe('WATCHED'))

    id.value = '425'
    expect(state.status.value).toBeNull()
    await vi.waitFor(() => expect(getStatus).toHaveBeenCalledTimes(2))
    expect(state.status.value).toBeNull()
    expect(state.pending.value).toBe(false)
  })
})
