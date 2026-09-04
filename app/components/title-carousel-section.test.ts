import type { VueWrapper } from '@vue/test-utils'
import type { TitleSummary } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
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
