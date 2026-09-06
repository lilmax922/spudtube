import type { DiscoveryBadges, ProviderCatalog, TitleSummary } from '#server/tmdb/types'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PROVIDER_CATALOG } from '../lib/availability-fixtures'
import { EXPANDABLE_SHIFT_KEY } from './constants'
import ExpandableTitleCard from './expandable-title-card.vue'

const badgesMock = vi.hoisted(() => ({
  badges: {
    data: { value: null as DiscoveryBadges | null | undefined },
  },
}))

vi.mock('../composables/use-discovery-badges', () => ({
  useDiscoveryBadges: () => ({ badges: badgesMock.badges }),
}))

const availabilityMock = vi.hoisted(() => ({
  catalog: {
    data: { value: null as ProviderCatalog | null | undefined },
    pending: { value: false },
    error: { value: null as Error | null },
  },
  loadCatalog: vi.fn(),
}))

vi.mock('../composables/use-availability', () => ({
  useAvailability: () => availabilityMock,
}))

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

async function render(title: TitleSummary = baseTitle, showKind = false) {
  return await mountSuspended(ExpandableTitleCard, { route: '/?probe=1', props: { title, showKind } })
}

function resetMocks(): void {
  badgesMock.badges.data.value = undefined
  availabilityMock.catalog.data.value = undefined
  availabilityMock.loadCatalog.mockClear()
}

beforeEach(resetMocks)

describe('expandable-title-card', () => {
  afterEach(() => {
    document.cookie = 'spudtube-region=; Max-Age=0; Path=/'
  })

  it('links the card to the same title detail page as a title card', async () => {
    const wrapper = await render()

    expect(wrapper.find('a').attributes('href')).toBe('/movie/419430')
  })

  it('links tv titles to their tv detail page', async () => {
    const wrapper = await render({ ...baseTitle, kind: 'TV_SHOW', tmdbId: 1396 })

    expect(wrapper.find('a').attributes('href')).toBe('/tv/1396')
  })

  it('shows the poster at rest from the TMDB image CDN', async () => {
    const wrapper = await render()

    const poster = wrapper.find('[data-testid="expandable-poster"]')
    expect(poster.exists()).toBe(true)
    expect(poster.attributes('src')).toBe(
      'https://image.tmdb.org/t/p/w500/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
    )
    expect(poster.attributes('alt')).toBe('沙丘')
  })

  it('carries the backdrop artwork for the expanded state', async () => {
    const wrapper = await render()

    const backdrop = wrapper.find('[data-testid="expandable-backdrop"]')
    expect(backdrop.exists()).toBe(true)
    expect(backdrop.attributes('src')).toBe(
      'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
    )
    expect(backdrop.attributes('alt')).toBe('沙丘')
  })

  it('renders name, year, rating, and kind label in the overlay', async () => {
    const wrapper = await render(baseTitle, true)

    const overlay = wrapper.find('.expandable-overlay-content')
    expect(overlay.text()).toContain('沙丘')
    expect(overlay.text()).toContain('2021')
    expect(overlay.text()).toContain('7.8')
    expect(overlay.text()).toContain('Movie')
  })

  it('never renders overview text on the expanded card', async () => {
    const wrapper = await render()

    expect(wrapper.find('.expandable-overlay-content p').exists()).toBe(false)
    expect(wrapper.find('.expandable-title-card-art p').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('亞崔迪家族接受沙丘星的統治權。')
  })

  it('degrades gracefully to a placeholder when both artworks are missing', async () => {
    const wrapper = await render({ ...baseTitle, posterPath: null, backdropPath: null })

    expect(wrapper.find('[data-testid="expandable-poster"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="expandable-backdrop"]').exists()).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.text()).toContain('沙丘')
  })

  it('labels the kind on the poster when showKind is set', async () => {
    const wrapper = await render(baseTitle, true)

    expect(wrapper.find('[data-testid="kind-badge"]').text()).toBe('Movie')
  })

  it('hides the kind badge by default', async () => {
    const wrapper = await render()

    expect(wrapper.find('[data-testid="kind-badge"]').exists()).toBe(false)
  })

  it('marks titles present in the weekly trending list', async () => {
    badgesMock.badges.data.value = { trendingIds: [419430], topRatedIds: [] }
    const wrapper = await render()

    expect(wrapper.find('[data-testid="discovery-badge"]').text()).toBe('Trending')
  })

  it('never derives a badge from the rating alone', async () => {
    badgesMock.badges.data.value = { trendingIds: [], topRatedIds: [] }
    const wrapper = await render({ ...baseTitle, voteAverage: 9.2 })

    expect(wrapper.find('[data-testid="discovery-badge"]').exists()).toBe(false)
  })

  it('loads streaming providers on inspection and renders their real logos', async () => {
    const wrapper = await render()
    await wrapper.find('a').trigger('mouseenter')
    expect(availabilityMock.loadCatalog).toHaveBeenCalledTimes(1)

    availabilityMock.catalog.data.value = PROVIDER_CATALOG
    const loaded = await render()

    const strip = loaded.find('[data-testid="provider-strip"]')
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
    const wrapper = await render()

    await wrapper.find('a').trigger('mouseenter')
    await wrapper.find('a').trigger('mouseenter')
    await wrapper.find('a').trigger('focusin')

    expect(availabilityMock.loadCatalog).toHaveBeenCalledTimes(1)
  })
})

describe('expandable-title-card interaction feel — inspira adaptation', () => {
  const source = readFileSync(resolve(import.meta.dirname, './expandable-title-card.vue'), 'utf8')

  it('animates the poster/backdrop swap with a half-second ease', () => {
    expect(source).toMatch(/transition:\s*opacity\s+0\.5s\s+ease-in-out/)
  })

  it('delays the swap on hover only; focus swaps immediately', () => {
    expect(source).toMatch(/\.group\\\/expandable-card:hover[^{]*\{[\s\S]*?transition-delay:\s*0\.5s/)
    // The hover rule is the single place allowed to delay; focus rules
    // and the base transitions must not carry one.
    expect(source.match(/transition-delay/g)?.length ?? 0).toBe(1)
  })

  it('reveals the overlay on hover and on keyboard focus alike', () => {
    expect(source).toMatch(/\.group\\\/expandable-card:hover\s+\.expandable-overlay-content/)
    expect(source).toMatch(/:focus-within\s+\.expandable-overlay-content|:focus-visible\s+\.expandable-overlay-content/)
  })

  it('disables the swap below the tablet breakpoint and on touch pointers', () => {
    expect(source).toMatch(/@media\s*\(max-width:\s*880px\)/)
    expect(source).toMatch(/@media\s*\(hover:\s*none\)/)
    expect(source).toMatch(/@media\s*\(pointer:\s*coarse\)/)
  })

  it('rests as a 2:3 portrait poster and expands horizontally at the same height', () => {
    expect(source).toMatch(/aspect-\[2\/3\]/)
    expect(source).toMatch(/height:\s*360px/)
    expect(source).not.toMatch(/height:\s*135px/)
    expect(source).not.toMatch(/transition:\s*height/)
    expect(source).toMatch(/text-heading-sm/)
    expect(source).toMatch(/text-body-sm-strong/)
  })
})
