import type { VueWrapper } from '@vue/test-utils'
import type { Page, TitleSummary } from '#server/tmdb/types'
import type { SearchFetcher } from '../composables/use-keyword-search'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetBrowseListingForTest, useBrowseListing } from '../composables/use-browse-listing'
import SearchOverlay from './search-overlay.vue'

const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateTo)

const fakes = vi.hoisted(() => ({
  fetchSearch: vi.fn(),
}))

function duneResults(): Page<TitleSummary> {
  return {
    page: 1,
    results: [
      {
        kind: 'MOVIE',
        tmdbId: 419430,
        name: '沙丘',
        posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
        backdropPath: null,
        releaseDate: '2021-10-22',
        voteAverage: 7.8,
      },
    ],
    totalPages: 1,
    totalResults: 1,
  }
}

function seedListing() {
  fakes.fetchSearch.mockResolvedValue(duneResults())
  return useBrowseListing({
    search: { fetchSearch: fakes.fetchSearch } as unknown as SearchFetcher,
  })
}

const mountedWrappers: VueWrapper[] = []

beforeEach(() => {
  localStorage.clear()
  resetBrowseListingForTest()
  navigateTo.mockClear()
  vi.clearAllMocks()
})

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0))
    wrapper.unmount()
  resetBrowseListingForTest()
  vi.useRealTimers()
})

function track(wrapper: VueWrapper): VueWrapper {
  mountedWrappers.push(wrapper)
  return wrapper
}

describe('search-overlay', () => {
  it('hides the dialog when closed and shows it when open', async () => {
    seedListing()
    const hidden = track(await mountSuspended(SearchOverlay, { props: { query: '', open: false } }))
    expect(hidden.find('[role="dialog"]').exists()).toBe(false)

    const shown = track(await mountSuspended(SearchOverlay, { props: { query: '', open: true } }))
    expect(shown.find('[role="dialog"]').exists()).toBe(true)
    expect(shown.find('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(shown.find('input').attributes('placeholder')).toBe('Search movies and TV shows')
  })

  it('emits update:query as the user types inside the overlay', async () => {
    seedListing()
    const wrapper = track(await mountSuspended(SearchOverlay, { props: { query: '', open: true } }))
    await wrapper.find('input').setValue('dune')
    expect(wrapper.emitted('update:query')).toEqual([['dune']])
  })

  it('drives the shared session while typing and keeps it for the page on submit', async () => {
    vi.useFakeTimers()
    try {
      const listing = seedListing()
      const wrapper = track(await mountSuspended(SearchOverlay, { props: { query: '', open: true } }))
      await wrapper.setProps({ query: 'dune' })
      await vi.advanceTimersByTimeAsync(400)

      expect(fakes.fetchSearch).toHaveBeenCalledWith('dune', 1, 'en')
      expect(listing.searchedQuery.value).toBe('dune')

      await wrapper.find('form').trigger('submit')
      expect(navigateTo).toHaveBeenCalledWith({ path: '/search', query: { q: 'dune' } })
      expect(wrapper.emitted('close')).toHaveLength(1)
      expect(wrapper.emitted('search')).toBeUndefined()

      // navigating keeps the session: the page reuses the results as-is
      await wrapper.setProps({ open: false })
      expect(listing.searchedQuery.value).toBe('dune')
      expect(fakes.fetchSearch).toHaveBeenCalledTimes(1)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('restores the prior session when dismissed without navigating', async () => {
    vi.useFakeTimers()
    try {
      const listing = seedListing()
      const wrapper = track(await mountSuspended(SearchOverlay, { props: { query: '', open: true } }))
      await wrapper.setProps({ query: 'dune' })
      await vi.advanceTimersByTimeAsync(400)
      expect(listing.searchedQuery.value).toBe('dune')

      await wrapper.find('[role="presentation"]').trigger('click')
      await wrapper.setProps({ open: false })

      expect(listing.searchedQuery.value).toBe('')
      expect(listing.mode.value).toBe('browse')
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('emits clear when the inner clear button is pressed', async () => {
    seedListing()
    const wrapper = track(await mountSuspended(SearchOverlay, { props: { query: 'dune', open: true } }))
    const clear = wrapper.find('button[aria-label="Clear search"]')
    expect(clear.exists()).toBe(true)
    await clear.trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('respects clearable to keep the clear button even with an empty query', async () => {
    seedListing()
    const wrapper = track(await mountSuspended(SearchOverlay, { props: { query: '', open: true, clearable: true } }))
    expect(wrapper.find('button[aria-label="Clear search"]').exists()).toBe(true)

    const without = track(await mountSuspended(SearchOverlay, { props: { query: '', open: true, clearable: false } }))
    expect(without.find('button[aria-label="Clear search"]').exists()).toBe(false)
  })

  it('emits close when the close button is pressed', async () => {
    seedListing()
    const wrapper = track(await mountSuspended(SearchOverlay, { props: { query: '', open: true } }))
    await wrapper.find('button[aria-label="Close search"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when the backdrop is clicked', async () => {
    seedListing()
    const wrapper = track(await mountSuspended(SearchOverlay, { props: { query: '', open: true } }))
    await wrapper.find('[role="presentation"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close on Escape key without trapping', async () => {
    seedListing()
    const wrapper = track(await mountSuspended(SearchOverlay, { props: { query: '', open: true } }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('applies popover surface with border and shadow per Contract and input md shape', async () => {
    seedListing()
    const wrapper = track(await mountSuspended(SearchOverlay, { props: { query: '', open: true } }))
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.classes().join(' ')).toContain('bg-popover')
    expect(dialog.classes().join(' ')).toContain('border')
    expect(dialog.classes().join(' ')).toContain('shadow-')
    const form = wrapper.find('form')
    expect(form.classes().join(' ')).toContain('rounded-md')
    expect(form.classes().join(' ')).toContain('bg-card')
    expect(form.classes().join(' ')).toContain('border-input')
  })

  it('highlights the most recent search on open', async () => {
    seedListing()
    localStorage.setItem('spudtube:recent', JSON.stringify(['dune', 'toy story']))
    const wrapper = track(await mountSuspended(SearchOverlay, { props: { query: '', open: true } }))
    await new Promise(resolve => setTimeout(resolve, 50))
    const highlighted = wrapper.findAll('[data-highlighted]')
    expect(highlighted).toHaveLength(1)
    expect(highlighted[0]?.text()).toContain('dune')
  })

  it('moves the highlight to the next recent on ArrowDown', async () => {
    seedListing()
    localStorage.setItem('spudtube:recent', JSON.stringify(['dune', 'toy story']))
    const wrapper = track(await mountSuspended(SearchOverlay, { props: { query: '', open: true } }))
    await new Promise(resolve => setTimeout(resolve, 50))
    await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' })
    await new Promise(resolve => setTimeout(resolve, 50))
    const highlighted = wrapper.findAll('[data-highlighted]')
    expect(highlighted).toHaveLength(1)
    expect(highlighted[0]?.text()).toContain('toy story')
  })
})
