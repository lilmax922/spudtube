import type { VueWrapper } from '@vue/test-utils'
import type { TitleSummary } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import ExpandableTitleCard from './expandable-title-card.vue'
import TitleCard from './title-card.vue'
import TitleCarouselSection from './title-carousel-section.vue'

const items: TitleSummary[] = [
  {
    kind: 'MOVIE',
    tmdbId: 419430,
    name: '沙丘',
    posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
    backdropPath: null,
    releaseDate: '2021-10-22',
    voteAverage: 7.8,
    genreIds: [28],
  },
  {
    kind: 'MOVIE',
    tmdbId: 693134,
    name: '沙丘：第二部',
    posterPath: null,
    backdropPath: null,
    releaseDate: '2024-02-27',
    voteAverage: 8.1,
    genreIds: [878],
  },
]

const mountedWrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0))
    wrapper.unmount()
})

function findSeeMore(wrapper: VueWrapper) {
  return wrapper.findAll('button').find(button => button.text().includes('See more'))
}

describe('title-carousel-section', () => {
  it('shows See more by default when items are present', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, { props: { title: 'Horror', items, variant: 'standard' } })
    mountedWrappers.push(wrapper)

    expect(findSeeMore(wrapper)).toBeTruthy()
  })

  it('hides See more when showSeeMore is false even with items present', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, { props: { title: 'Horror', items, variant: 'standard', showSeeMore: false } })
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('Horror')
    expect(findSeeMore(wrapper)).toBeUndefined()
  })

  it('hides See more when there are no items even if showSeeMore is true', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, { props: { title: 'Horror', items: [], variant: 'standard', showSeeMore: true } })
    mountedWrappers.push(wrapper)

    expect(findSeeMore(wrapper)).toBeUndefined()
  })

  it('emits seeMore when the button is clicked', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, { props: { title: 'Horror', items, variant: 'standard' } })
    mountedWrappers.push(wrapper)

    await findSeeMore(wrapper)!.trigger('click')

    expect(wrapper.emitted('seeMore')).toHaveLength(1)
  })
})

function backdropTitle(tmdbId: number, name: string): TitleSummary {
  return {
    kind: 'MOVIE',
    tmdbId,
    name,
    posterPath: `/poster-${tmdbId}.jpg`,
    backdropPath: `/backdrop-${tmdbId}.jpg`,
    releaseDate: '2021-10-22',
    voteAverage: 7.8,
    genreIds: [27],
  }
}

const sixUsable = [1, 2, 3, 4, 5, 6].map(id => backdropTitle(id, `Usable ${id}`))

function expandableCards(wrapper: VueWrapper) {
  return wrapper.findAll('[data-testid="expandable-title-card"]')
}

describe('title-carousel-section expandable second row', () => {
  it('renders expandable cards on the expandable variant when enough backdrops exist', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Horror', items: sixUsable, variant: 'expandable' },
    })
    mountedWrappers.push(wrapper)

    expect(expandableCards(wrapper)).toHaveLength(6)
    expect(wrapper.findComponent(TitleCard).exists()).toBe(false)
  })

  it('renders standard cards for the standard variant even with backdrops present', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Trending', items: sixUsable, variant: 'standard' },
    })
    mountedWrappers.push(wrapper)

    expect(expandableCards(wrapper)).toHaveLength(0)
    expect(wrapper.findAllComponents(TitleCard)).toHaveLength(6)
  })

  it('renders standard cards for the standard variant', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Horror', items: sixUsable, variant: 'standard' },
    })
    mountedWrappers.push(wrapper)

    expect(expandableCards(wrapper)).toHaveLength(0)
    expect(wrapper.findAllComponents(TitleCard)).toHaveLength(6)
  })

  it('excludes titles without backdrop artwork from the expandable row', async () => {
    const mixed = [...sixUsable, { ...backdropTitle(7, 'No Backdrop'), backdropPath: null }]
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Horror', items: mixed, variant: 'expandable' },
    })
    mountedWrappers.push(wrapper)

    expect(expandableCards(wrapper)).toHaveLength(6)
    expect(wrapper.text()).not.toContain('No Backdrop')
  })

  it('falls back to standard cards when fewer than five usable backdrops remain', async () => {
    const sparse = [
      backdropTitle(1, 'Usable 1'),
      backdropTitle(2, 'Usable 2'),
      { ...backdropTitle(3, 'No Backdrop 3'), backdropPath: null },
      { ...backdropTitle(4, 'No Backdrop 4'), backdropPath: null },
    ]
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Horror', items: sparse, variant: 'expandable' },
    })
    mountedWrappers.push(wrapper)

    expect(expandableCards(wrapper)).toHaveLength(0)
    expect(wrapper.findAllComponents(TitleCard)).toHaveLength(4)
  })

  it('shows the poster at rest and carries the backdrop plus overlay fields without overview', async () => {
    const withOverview = sixUsable.map(item => ({ ...item, overview: '不該出現在卡片上的簡介。' }))
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Horror', items: withOverview, variant: 'expandable' },
    })
    mountedWrappers.push(wrapper)

    const card = expandableCards(wrapper)[0]!
    expect(card.find('[data-testid="expandable-poster"]').attributes('src')).toBe(
      'https://image.tmdb.org/t/p/w500/poster-1.jpg',
    )
    expect(card.find('[data-testid="expandable-backdrop"]').attributes('src')).toBe(
      'https://image.tmdb.org/t/p/w1280/backdrop-1.jpg',
    )
    expect(card.text()).toContain('Usable 1')
    expect(card.text()).toContain('2021')
    expect(card.text()).toContain('7.8')
    expect(card.find('p').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('不該出現在卡片上的簡介。')
  })

  it('navigates an expandable card to the same detail route as a title card', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Horror', items: sixUsable, variant: 'expandable' },
    })
    mountedWrappers.push(wrapper)

    expect(expandableCards(wrapper)[0]!.attributes('href')).toBe('/movie/1')
  })

  it('keeps SeeMore working on the expandable row', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Horror', items: sixUsable, variant: 'expandable' },
    })
    mountedWrappers.push(wrapper)

    expect(findSeeMore(wrapper)).toBeTruthy()
    await findSeeMore(wrapper)!.trigger('click')

    expect(wrapper.emitted('seeMore')).toHaveLength(1)
  })
})

describe('title-carousel-section item widths', () => {
  it('renders wide items on the expandable variant', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Horror', items: sixUsable, variant: 'expandable' },
    })
    mountedWrappers.push(wrapper)

    const items = wrapper.findAll('[data-slot="carousel-item"]')
    expect(items.length).toBeGreaterThan(0)
    for (const item of items)
      expect(item.classes()).toContain('w-[240px]')
  })

  it('renders narrow items on the standard variant', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Trending', items: sixUsable, variant: 'standard' },
    })
    mountedWrappers.push(wrapper)

    const items = wrapper.findAll('[data-slot="carousel-item"]')
    expect(items.length).toBeGreaterThan(0)
    for (const item of items)
      expect(item.classes()).toContain('w-[180px]')
  })
})

describe('title-carousel-section card feeds', () => {
  it('feeds each standard card its row data', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Trending', items: sixUsable, variant: 'standard' },
    })
    mountedWrappers.push(wrapper)

    const cards = wrapper.findAllComponents(TitleCard)
    expect(cards.length).toBe(6)
    for (const card of cards) {
      const feed = card.props('feed') as { region?: unknown, loadCatalog?: unknown, badges?: unknown } | undefined
      expect(feed).toBeDefined()
      expect(typeof feed?.region).toBe('string')
      expect(typeof feed?.loadCatalog).toBe('function')
    }
  })

  it('feeds each expandable card its row data', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Horror', items: sixUsable, variant: 'expandable' },
    })
    mountedWrappers.push(wrapper)

    const cards = wrapper.findAllComponents(ExpandableTitleCard)
    expect(cards.length).toBe(6)
    for (const card of cards) {
      const feed = card.props('feed') as { region?: unknown, loadCatalog?: unknown } | undefined
      expect(feed).toBeDefined()
      expect(typeof feed?.region).toBe('string')
      expect(typeof feed?.loadCatalog).toBe('function')
    }
  })
})
