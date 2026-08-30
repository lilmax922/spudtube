import type { TitleSummary } from '#server/tmdb/types'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HeroCarousel from './hero-carousel.vue'

const sampleTitles: TitleSummary[] = [
  {
    kind: 'MOVIE',
    tmdbId: 419430,
    name: 'Dune',
    posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
    backdropPath: '/iopYFB1b6Bh7FWZhjzonDEfMvZB.jpg',
    releaseDate: '2021-10-22',
    voteAverage: 7.8,
    genreIds: [878],
  },
  {
    kind: 'MOVIE',
    tmdbId: 693134,
    name: 'Dune Part Two',
    posterPath: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdropPath: '/87FQUboshqcztBkz5wXRPlbMmyM.jpg',
    releaseDate: '2024-02-27',
    voteAverage: 8.3,
    genreIds: [878],
  },
  {
    kind: 'TV_SHOW',
    tmdbId: 1399,
    name: 'Game of Thrones',
    posterPath: null,
    backdropPath: '/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg',
    releaseDate: '2011-04-17',
    voteAverage: 8.4,
    genreIds: [10765],
  },
]

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function mountCarousel(titles: TitleSummary[]): Promise<{ wrapper: Awaited<ReturnType<typeof mountSuspended>> }> {
  registerEndpoint('https://image.tmdb.org/t/p/**', () => ({ body: '' }))
  const wrapper = await mountSuspended(HeroCarousel, {
    props: { titles },
    route: '/',
    attachTo: document.body,
  })
  return { wrapper }
}

describe('hero-carousel', () => {
  const root = (wrapper: Awaited<ReturnType<typeof mountSuspended>>): HTMLElement => wrapper.element as HTMLElement

  it('renders nothing when given an empty title list', async () => {
    const { wrapper } = await mountCarousel([])
    const r = root(wrapper)
    const count = r.querySelectorAll?.('[data-index]').length ?? 0
    expect(count).toBe(0)
    wrapper.unmount()
  })

  it('picks the top 5 titles by voteAverage as trending slides', async () => {
    const manyTitles: TitleSummary[] = Array.from({ length: 8 }, (_, i) => ({
      kind: 'MOVIE' as const,
      tmdbId: 1000 + i,
      name: `Title ${i}`,
      posterPath: null,
      backdropPath: null,
      releaseDate: '2020-01-01',
      voteAverage: 5 + i * 0.3,
      genreIds: [],
    }))

    const { wrapper } = await mountCarousel(manyTitles)
    const r = root(wrapper)
    expect(r.querySelectorAll('[data-index]')).toHaveLength(5)

    // The first slide should be the highest-rated title
    const firstName = r.querySelector('[data-index="0"] .heroTitle')?.textContent?.trim()
    expect(firstName).toBe('Title 7')

    wrapper.unmount()
  })

  it('renders a backdrop image for the active slide using its backdropPath', async () => {
    const { wrapper } = await mountCarousel(sampleTitles)
    const r = root(wrapper)
    const activeSlide = r.querySelector('.heroSlide.active')
    expect(activeSlide).toBeTruthy()
    const img = activeSlide!.querySelector('img')
    expect(img).toBeTruthy()
    // Game of Thrones has the highest voteAverage so it leads the active slide
    expect(img!.getAttribute('src') ?? '').toContain('/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg')

    wrapper.unmount()
  })

  it('rotates slides when the next arrow is clicked', async () => {
    const { wrapper } = await mountCarousel(sampleTitles)
    const r = root(wrapper)
    const initialActive = r.querySelector('.heroSlide.active')
    expect(initialActive?.getAttribute('data-index')).toBe('0')

    const nextButton = r.querySelector('.heroArrow.next') as HTMLButtonElement | null
    expect(nextButton).toBeTruthy()
    nextButton!.click()
    await flushPromises()

    const newActive = r.querySelector('.heroSlide.active')
    expect(newActive?.getAttribute('data-index')).toBe('1')

    const activeDot = r.querySelector('.heroDot.active')
    expect(activeDot?.getAttribute('data-dot')).toBe('1')

    wrapper.unmount()
  })

  it('activates a slide when its dot is clicked', async () => {
    const { wrapper } = await mountCarousel(sampleTitles)
    const r = root(wrapper)
    const dots = r.querySelectorAll('.heroDot')
    expect(dots).toHaveLength(3)

    const thirdDot = dots[2] as HTMLButtonElement
    thirdDot.click()
    await flushPromises()

    const newActive = r.querySelector('.heroSlide.active')
    expect(newActive?.getAttribute('data-index')).toBe('2')

    wrapper.unmount()
  })

  it('exposes a CTA link to the active slide detail page', async () => {
    const { wrapper } = await mountCarousel(sampleTitles)
    const r = root(wrapper)
    const cta = r.querySelector('.heroInfo a') as HTMLAnchorElement | null
    expect(cta).toBeTruthy()
    // Active slide is the highest-rated title (Game of Thrones 8.4 > Dune Part Two 8.3)
    expect(cta!.getAttribute('href')).toBe('/tv/1399')

    wrapper.unmount()
  })
})
