import type { DiscoveryBadges, ProviderCatalog, TitleSummary } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PROVIDER_CATALOG } from '../lib/availability-fixtures'
import TitleCard from './title-card.vue'

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
  backdropPath: null,
  releaseDate: '2021-10-22',
  voteAverage: 7.8,
}

async function render(title: TitleSummary = baseTitle, showKind = false) {
  return await mountSuspended(TitleCard, { route: '/?probe=1', props: { title, showKind } })
}

function resetMocks(): void {
  badgesMock.badges.data.value = undefined
  availabilityMock.catalog.data.value = undefined
  availabilityMock.loadCatalog.mockClear()
}

beforeEach(resetMocks)

describe('title-card', () => {
  afterEach(() => {
    document.cookie = 'spudtube-region=; Max-Age=0; Path=/'
  })

  it('links the card to its own title detail page', async () => {
    const wrapper = await render()

    expect(wrapper.find('a').attributes('href')).toBe('/movie/419430')
  })

  it('renders the localized name and release year', async () => {
    const wrapper = await render()

    expect(wrapper.text()).toContain('沙丘')
    expect(wrapper.text()).toContain('2021')
  })

  it('renders the poster from the TMDB image CDN when artwork exists', async () => {
    const wrapper = await render()

    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(
      'https://image.tmdb.org/t/p/w500/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
    )
    expect(img.attributes('alt')).toBe('沙丘')
  })

  it('degrades gracefully to a placeholder when artwork is missing', async () => {
    const wrapper = await render({ ...baseTitle, posterPath: null })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.text()).toContain('沙丘')
  })

  it('degrades to the placeholder when the poster fails to load', async () => {
    const wrapper = await render()

    await wrapper.find('img').trigger('error')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('labels the kind on the poster when showKind is set', async () => {
    const wrapper = await render(baseTitle, true)

    const badge = wrapper.find('[data-testid="kind-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('Movie')
  })

  it('shows the TV show label for TV_SHOW titles', async () => {
    const wrapper = await render({ ...baseTitle, kind: 'TV_SHOW' }, true)

    expect(wrapper.find('[data-testid="kind-badge"]').text()).toBe('TV Show')
  })

  it('hides the kind badge by default', async () => {
    const wrapper = await render()

    expect(wrapper.find('[data-testid="kind-badge"]').exists()).toBe(false)
  })
})

describe('title-card discovery badge — real TMDB list membership only', () => {
  it('renders no badge while the membership sets are missing', async () => {
    badgesMock.badges.data.value = undefined
    const wrapper = await render({ ...baseTitle, voteAverage: 9.2 })

    expect(wrapper.find('[data-testid="discovery-badge"]').exists()).toBe(false)
  })

  it('never derives a badge from the rating alone', async () => {
    badgesMock.badges.data.value = { trendingIds: [], topRatedIds: [] }
    const wrapper = await render({ ...baseTitle, voteAverage: 9.2 })

    expect(wrapper.find('[data-testid="discovery-badge"]').exists()).toBe(false)
  })

  it('marks titles present in the weekly trending list', async () => {
    badgesMock.badges.data.value = { trendingIds: [419430], topRatedIds: [] }
    const wrapper = await render()

    expect(wrapper.find('[data-testid="discovery-badge"]').text()).toBe('Trending')
  })

  it('marks top-rated list members and lets trending win on overlap', async () => {
    badgesMock.badges.data.value = { trendingIds: [], topRatedIds: [419430] }
    const topRated = await render()
    expect(topRated.find('[data-testid="discovery-badge"]').text()).toBe('Top rated')

    badgesMock.badges.data.value = { trendingIds: [419430], topRatedIds: [419430] }
    const both = await render()
    expect(both.find('[data-testid="discovery-badge"]').text()).toBe('Trending')
  })
})

describe('title-card hover content', () => {
  it('shows no fabricated maturity chip or watch-option claim', async () => {
    const wrapper = await render({ ...baseTitle, voteAverage: 9.4 })

    expect(wrapper.text()).not.toContain('16+')
    expect(wrapper.text()).not.toContain('ALL')
    expect(wrapper.text()).not.toContain('Watch options available')
  })

  it('renders the real overview and hides the paragraph when none exists', async () => {
    const withOverview = await render({ ...baseTitle, overview: '亞崔迪家族接受沙丘星的統治權。' })
    expect(withOverview.text()).toContain('亞崔迪家族接受沙丘星的統治權。')

    const withoutOverview = await render()
    expect(withoutOverview.find('.hover-card-desc').exists()).toBe(false)
    expect(withoutOverview.text()).not.toContain('它可能已從目錄中移除')
  })

  it('renders no provider strip before availability resolves', async () => {
    const wrapper = await render()

    await wrapper.find('a').trigger('mouseenter')
    expect(availabilityMock.loadCatalog).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="provider-strip"]').exists()).toBe(false)
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
    expect(logos[0]?.attributes('src')).toBe('https://image.tmdb.org/t/p/w92/o6B5W5Yb2DwmJwqVjknSxqVtLxJ.jpg')
  })

  it('triggers the provider load at most once per card', async () => {
    const wrapper = await render()

    await wrapper.find('a').trigger('mouseenter')
    await wrapper.find('a').trigger('mouseenter')
    await wrapper.find('a').trigger('focusin')

    expect(availabilityMock.loadCatalog).toHaveBeenCalledTimes(1)
  })
})
