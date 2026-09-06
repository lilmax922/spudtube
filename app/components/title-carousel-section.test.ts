import type { VueWrapper } from '@vue/test-utils'
import type { TitleSummary } from '#server/tmdb/types'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import { EXPANDABLE_SECTION_KEYS, MIN_EXPANDABLE_TITLES } from './constants'
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
    const wrapper = await mountSuspended(TitleCarouselSection, { props: { title: 'Horror', items } })
    mountedWrappers.push(wrapper)

    expect(findSeeMore(wrapper)).toBeTruthy()
  })

  it('hides See more when showSeeMore is false even with items present', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, { props: { title: 'Horror', items, showSeeMore: false } })
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('Horror')
    expect(findSeeMore(wrapper)).toBeUndefined()
  })

  it('hides See more when there are no items even if showSeeMore is true', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, { props: { title: 'Horror', items: [], showSeeMore: true } })
    mountedWrappers.push(wrapper)

    expect(findSeeMore(wrapper)).toBeUndefined()
  })

  it('emits seeMore when the button is clicked', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, { props: { title: 'Horror', items } })
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
  it('covers the horror and obsessed rows and needs five usable backdrops', () => {
    expect(EXPANDABLE_SECTION_KEYS).toContain('movie.horror')
    expect(EXPANDABLE_SECTION_KEYS).toContain('tv.obsessed')
    expect(MIN_EXPANDABLE_TITLES).toBe(5)
  })

  it('renders expandable cards on the horror row when enough backdrops exist', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Horror', items: sixUsable, sectionKey: 'movie.horror' },
    })
    mountedWrappers.push(wrapper)

    expect(expandableCards(wrapper)).toHaveLength(6)
    expect(wrapper.findComponent(TitleCard).exists()).toBe(false)
  })

  it('renders standard cards on other rows even with backdrops present', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Trending', items: sixUsable, sectionKey: 'movie.trending' },
    })
    mountedWrappers.push(wrapper)

    expect(expandableCards(wrapper)).toHaveLength(0)
    expect(wrapper.findAllComponents(TitleCard)).toHaveLength(6)
  })

  it('renders standard cards when no section key is given', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Horror', items: sixUsable },
    })
    mountedWrappers.push(wrapper)

    expect(expandableCards(wrapper)).toHaveLength(0)
    expect(wrapper.findAllComponents(TitleCard)).toHaveLength(6)
  })

  it('excludes titles without backdrop artwork from the expandable row', async () => {
    const mixed = [...sixUsable, { ...backdropTitle(7, 'No Backdrop'), backdropPath: null }]
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Horror', items: mixed, sectionKey: 'movie.horror' },
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
      props: { title: 'Horror', items: sparse, sectionKey: 'movie.horror' },
    })
    mountedWrappers.push(wrapper)

    expect(expandableCards(wrapper)).toHaveLength(0)
    expect(wrapper.findAllComponents(TitleCard)).toHaveLength(4)
  })

  it('shows the poster at rest and carries the backdrop plus overlay fields without overview', async () => {
    const withOverview = sixUsable.map(item => ({ ...item, overview: '不該出現在卡片上的簡介。' }))
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Horror', items: withOverview, sectionKey: 'movie.horror' },
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
      props: { title: 'Horror', items: sixUsable, sectionKey: 'movie.horror' },
    })
    mountedWrappers.push(wrapper)

    expect(expandableCards(wrapper)[0]!.attributes('href')).toBe('/movie/1')
  })

  it('keeps SeeMore working on the expandable row', async () => {
    const wrapper = await mountSuspended(TitleCarouselSection, {
      props: { title: 'Horror', items: sixUsable, sectionKey: 'movie.horror' },
    })
    mountedWrappers.push(wrapper)

    expect(findSeeMore(wrapper)).toBeTruthy()
    await findSeeMore(wrapper)!.trigger('click')

    expect(wrapper.emitted('seeMore')).toHaveLength(1)
  })
})

describe('title-carousel-section expandable styling', () => {
  it('grows the hovered item to push siblings and glides the row into view', () => {
    const source = readFileSync(resolve(import.meta.dirname, './title-carousel-section.vue'), 'utf8')
    expect(source).toMatch(/w-\[240px\]/)
    expect(source).toMatch(/\.expandable-carousel-item[\s\S]*?width:\s*540px/)
    expect(source).toMatch(/transition:\s*width\s+0\.5s/)
    expect(source).toMatch(/translateX\(var\(--expand-shift/)
    expect(source).toMatch(/:edge-margin="gutter"/)
  })

  it('keeps standard rows narrower than the expandable row', () => {
    const source = readFileSync(resolve(import.meta.dirname, './title-carousel-section.vue'), 'utf8')
    // Standard items render at 180px while the expandable row keeps 240px;
    // counts stay shared, only the width diverges.
    expect(source).toMatch(/w-\[180px\]/)
    expect(source).toMatch(/:item-width="useExpandableCards \? 240 : 180"/)
  })
})
