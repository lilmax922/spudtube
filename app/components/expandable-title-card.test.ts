import type { TitleSummary } from '#server/tmdb/types'
import type { TitleCardFeed } from '../composables/use-title-card-data'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { PROVIDER_CATALOG } from '../lib/availability-fixtures'
import { EXPANDABLE_SHIFT_KEY } from './constants'
import ExpandableTitleCard from './expandable-title-card.vue'

const baseTitle: TitleSummary = {
  kind: 'MOVIE',
  tmdbId: 419430,
  name: '沙丘',
  posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
  backdropPath: '/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
  releaseDate: '2021-10-22',
  voteAverage: 7.8,
  overview: '亞崔迪家族接受沙丘星的統治權。',
}

async function render(
  title: TitleSummary = baseTitle,
  showKind = false,
  overrides: Partial<TitleCardFeed> = {},
) {
  const loadCatalog = vi.fn(async () => {})
  const wrapper = await mountSuspended(ExpandableTitleCard, {
    route: '/?probe=1',
    props: {
      title,
      showKind,
      feed: {
        badges: undefined,
        catalog: undefined,
        region: 'TW',
        loadCatalog,
        ...overrides,
      },
    },
  })
  return { wrapper, loadCatalog }
}

describe('expandable-title-card', () => {
  it('links the card to the same title detail page as a title card', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('a').attributes('href')).toBe('/movie/419430')
  })

  it('links tv titles to their tv detail page', async () => {
    const { wrapper } = await render({ ...baseTitle, kind: 'TV_SHOW', tmdbId: 1396 })

    expect(wrapper.find('a').attributes('href')).toBe('/tv/1396')
  })

  it('shows the poster at rest from the TMDB image CDN', async () => {
    const { wrapper } = await render()

    const poster = wrapper.find('[data-testid="expandable-poster"]')
    expect(poster.exists()).toBe(true)
    expect(poster.attributes('src')).toBe(
      'https://image.tmdb.org/t/p/w500/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
    )
    expect(poster.attributes('alt')).toBe('沙丘')
  })

  it('carries the backdrop artwork for the expanded state', async () => {
    const { wrapper } = await render()

    const backdrop = wrapper.find('[data-testid="expandable-backdrop"]')
    expect(backdrop.exists()).toBe(true)
    expect(backdrop.attributes('src')).toBe(
      'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
    )
    expect(backdrop.attributes('alt')).toBe('沙丘')
  })

  it('renders name, year, rating, and kind label in the overlay', async () => {
    const { wrapper } = await render(baseTitle, true)

    const overlay = wrapper.find('.expandable-overlay-content')
    expect(overlay.text()).toContain('沙丘')
    expect(overlay.text()).toContain('2021')
    expect(overlay.text()).toContain('7.8')
    expect(overlay.text()).toContain('Movie')
  })

  it('never renders overview text on the expanded card', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('.expandable-overlay-content p').exists()).toBe(false)
    expect(wrapper.find('.expandable-title-card-art p').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('亞崔迪家族接受沙丘星的統治權。')
  })

  it('degrades gracefully to a placeholder when both artworks are missing', async () => {
    const { wrapper } = await render({ ...baseTitle, posterPath: null, backdropPath: null })

    expect(wrapper.find('[data-testid="expandable-poster"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="expandable-backdrop"]').exists()).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.text()).toContain('沙丘')
  })

  it('labels the kind on the poster when showKind is set', async () => {
    const { wrapper } = await render(baseTitle, true)

    expect(wrapper.find('[data-testid="kind-badge"]').text()).toBe('Movie')
  })

  it('hides the kind badge by default', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('[data-testid="kind-badge"]').exists()).toBe(false)
  })

  it('marks titles present in the weekly trending list', async () => {
    const { wrapper } = await render(
      baseTitle,
      false,
      { badges: { trendingIds: [419430], topRatedIds: [] } },
    )

    expect(wrapper.find('[data-testid="discovery-badge"]').text()).toBe('Trending')
  })

  it('never derives a badge from the rating alone', async () => {
    const { wrapper } = await render(
      { ...baseTitle, voteAverage: 9.2 },
      false,
      { badges: { trendingIds: [], topRatedIds: [] } },
    )

    expect(wrapper.find('[data-testid="discovery-badge"]').exists()).toBe(false)
  })

  it('reports inspection and renders the fed catalog logos', async () => {
    const { wrapper, loadCatalog } = await render(baseTitle, false, { catalog: PROVIDER_CATALOG })

    await wrapper.find('a').trigger('mouseenter')
    expect(loadCatalog).toHaveBeenCalledTimes(1)

    const strip = wrapper.find('[data-testid="provider-strip"]')
    expect(strip.exists()).toBe(true)
    const logos = strip.findAll('img')
    expect(logos.map(img => img.attributes('alt'))).toEqual(['CATCHPLAY+', 'Netflix'])
  })

  async function mountWithShift(setShift: ReturnType<typeof vi.fn>) {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: !query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
    const wrapper = await mountSuspended(ExpandableTitleCard, {
      route: '/?probe=1',
      props: { title: baseTitle },
      global: { provide: { [EXPANDABLE_SHIFT_KEY]: setShift } },
    })
    function restore(): void {
      window.matchMedia = originalMatchMedia
    }
    return { wrapper, restore }
  }

  it('reports its row-glide need 500ms after hover and clears it on leave', async () => {
    vi.useFakeTimers()
    try {
      const setShift = vi.fn()
      const { wrapper, restore } = await mountWithShift(setShift)
      try {
        // happy-dom reports no layout, so the unmeasured card needs no glide.
        await wrapper.find('a').trigger('mouseenter')
        expect(setShift).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(499)
        expect(setShift).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(setShift).toHaveBeenCalledWith(0)
        await wrapper.find('a').trigger('mouseleave')
        expect(setShift).toHaveBeenLastCalledWith(null)
      }
      finally {
        restore()
      }
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('never reports a glide when leaving before the hover delay elapses', async () => {
    vi.useFakeTimers()
    try {
      const setShift = vi.fn()
      const { wrapper, restore } = await mountWithShift(setShift)
      try {
        await wrapper.find('a').trigger('mouseenter')
        await vi.advanceTimersByTimeAsync(300)
        await wrapper.find('a').trigger('mouseleave')
        await vi.advanceTimersByTimeAsync(1000)
        expect(setShift).toHaveBeenCalledTimes(1)
        expect(setShift).toHaveBeenCalledWith(null)
      }
      finally {
        restore()
      }
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('reports its row-glide need immediately on keyboard focus', async () => {
    vi.useFakeTimers()
    try {
      const setShift = vi.fn()
      const { wrapper, restore } = await mountWithShift(setShift)
      try {
        await wrapper.find('a').trigger('focusin')
        expect(setShift).toHaveBeenCalledWith(0)
      }
      finally {
        restore()
      }
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('triggers the provider load at most once per card', async () => {
    const { wrapper, loadCatalog } = await render()

    await wrapper.find('a').trigger('mouseenter')
    await wrapper.find('a').trigger('mouseenter')
    await wrapper.find('a').trigger('focusin')

    expect(loadCatalog).toHaveBeenCalledTimes(1)
  })
})
