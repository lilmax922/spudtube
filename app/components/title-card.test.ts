import type { TitleSummary } from '#server/tmdb/types'
import type { TitleCardFeed } from '../composables/use-title-card-data'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { PROVIDER_CATALOG } from '../lib/availability-fixtures'
import TitleCard from './title-card.vue'

const baseTitle: TitleSummary = {
  kind: 'MOVIE',
  tmdbId: 419430,
  name: '沙丘',
  posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
  backdropPath: null,
  releaseDate: '2021-10-22',
  voteAverage: 7.8,
}

async function render(
  title: TitleSummary = baseTitle,
  showKind = false,
  overrides: Partial<TitleCardFeed> = {},
) {
  const loadCatalog = vi.fn(async () => {})
  const wrapper = await mountSuspended(TitleCard, {
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

describe('title-card', () => {
  it('links the card to its own title detail page', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('a').attributes('href')).toBe('/movie/419430')
  })

  it('renders the localized name and release year', async () => {
    const { wrapper } = await render()

    expect(wrapper.text()).toContain('沙丘')
    expect(wrapper.text()).toContain('2021')
  })

  it('renders the poster from the TMDB image CDN when artwork exists', async () => {
    const { wrapper } = await render()

    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(
      'https://image.tmdb.org/t/p/w500/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
    )
    expect(img.attributes('alt')).toBe('沙丘')
  })

  it('degrades gracefully to a placeholder when artwork is missing', async () => {
    const { wrapper } = await render({ ...baseTitle, posterPath: null })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.text()).toContain('沙丘')
  })

  it('degrades to the placeholder when the poster fails to load', async () => {
    const { wrapper } = await render()

    await wrapper.find('img').trigger('error')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('labels the kind on the poster when showKind is set', async () => {
    const { wrapper } = await render(baseTitle, true)

    const badge = wrapper.find('[data-testid="kind-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('Movie')
  })

  it('shows the TV show label for TV_SHOW titles', async () => {
    const { wrapper } = await render({ ...baseTitle, kind: 'TV_SHOW' }, true)

    expect(wrapper.find('[data-testid="kind-badge"]').text()).toBe('TV Show')
  })

  it('hides the kind badge by default', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('[data-testid="kind-badge"]').exists()).toBe(false)
  })
})

describe('title-card discovery badge from real TMDB list membership', () => {
  it('renders no badge while the membership sets are missing', async () => {
    const { wrapper } = await render({ ...baseTitle, voteAverage: 9.2 })

    expect(wrapper.find('[data-testid="discovery-badge"]').exists()).toBe(false)
  })

  it('never derives a badge from the rating alone', async () => {
    const { wrapper } = await render(
      { ...baseTitle, voteAverage: 9.2 },
      false,
      { badges: { trendingIds: [], topRatedIds: [] } },
    )

    expect(wrapper.find('[data-testid="discovery-badge"]').exists()).toBe(false)
  })

  it('marks titles present in the weekly trending list', async () => {
    const { wrapper } = await render(
      baseTitle,
      false,
      { badges: { trendingIds: [419430], topRatedIds: [] } },
    )

    expect(wrapper.find('[data-testid="discovery-badge"]').text()).toBe('Trending')
  })

  it('marks top-rated list members and lets trending win on overlap', async () => {
    const topRated = await render(
      baseTitle,
      false,
      { badges: { trendingIds: [], topRatedIds: [419430] } },
    )
    expect(topRated.wrapper.find('[data-testid="discovery-badge"]').text()).toBe('Top rated')

    const both = await render(
      baseTitle,
      false,
      { badges: { trendingIds: [419430], topRatedIds: [419430] } },
    )
    expect(both.wrapper.find('[data-testid="discovery-badge"]').text()).toBe('Trending')
  })
})

describe('title-card hover content', () => {
  it('shows no fabricated maturity chip or watch-option claim', async () => {
    const { wrapper } = await render({ ...baseTitle, voteAverage: 9.4 })

    expect(wrapper.text()).not.toContain('16+')
    expect(wrapper.text()).not.toContain('ALL')
    expect(wrapper.text()).not.toContain('Watch options available')
  })

  it('renders the title overview and hides the paragraph when none exists', async () => {
    const withOverview = await render({ ...baseTitle, overview: '亞崔迪家族接受沙丘星的統治權。' })
    expect(withOverview.wrapper.text()).toContain('亞崔迪家族接受沙丘星的統治權。')

    const withoutOverview = await render()
    expect(withoutOverview.wrapper.find('.hover-overlay-content p').exists()).toBe(false)
  })

  it('reports inspection and renders no strip before the catalog resolves', async () => {
    const { wrapper, loadCatalog } = await render()

    await wrapper.find('a').trigger('mouseenter')
    expect(loadCatalog).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="provider-strip"]').exists()).toBe(false)
  })

  it('renders the fed catalog logos once they resolve', async () => {
    const { wrapper, loadCatalog } = await render(baseTitle, false, { catalog: PROVIDER_CATALOG })

    await wrapper.find('a').trigger('mouseenter')
    expect(loadCatalog).toHaveBeenCalledTimes(1)

    const strip = wrapper.find('[data-testid="provider-strip"]')
    expect(strip.exists()).toBe(true)
    const logos = strip.findAll('img')
    expect(logos.map(img => img.attributes('alt'))).toEqual(['CATCHPLAY+', 'Netflix'])
    expect(logos[0]?.attributes('src')).toBe('https://image.tmdb.org/t/p/w92/o6B5W5Yb2DwmJwqVjknSxqVtLxJ.jpg')
  })

  it('triggers the provider load at most once per card', async () => {
    const { wrapper, loadCatalog } = await render()

    await wrapper.find('a').trigger('mouseenter')
    await wrapper.find('a').trigger('mouseenter')
    await wrapper.find('a').trigger('focusin')

    expect(loadCatalog).toHaveBeenCalledTimes(1)
  })
})
