import type { HeroTitle } from '../composables/use-hero-titles'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HeroCarousel from './hero-carousel.vue'

const sampleTitles: HeroTitle[] = [
  {
    kind: 'MOVIE',
    tmdbId: 419430,
    name: 'Dune',
    posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
    backdropPath: '/iopYFB1b6Bh7FWZhjzonDEfMvZB.jpg',
    releaseDate: '2021-10-22',
    voteAverage: 7.8,
    overview: 'Paul Atreides, a brilliant and gifted young man...',
    runtimeMinutes: 155,
    contentRating: 'PG-13',
    genres: [{ id: 878, name: 'Sci-Fi' }, { id: 12, name: 'Adventure' }],
    providers: [],
  },
  {
    kind: 'MOVIE',
    tmdbId: 693134,
    name: 'Dune Part Two',
    posterPath: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdropPath: '/87FQUboshqcztBkz5wXRPlbMmyM.jpg',
    releaseDate: '2024-02-27',
    voteAverage: 8.3,
    overview: 'Paul Atreides unites with the Fremen...',
    runtimeMinutes: 166,
    contentRating: 'PG-13',
    genres: [{ id: 878, name: 'Sci-Fi' }],
    providers: [{ id: 8, name: 'Netflix', logoPath: '/netflix.jpg' }],
  },
  {
    kind: 'TV_SHOW',
    tmdbId: 1399,
    name: 'Game of Thrones',
    posterPath: null,
    backdropPath: '/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg',
    releaseDate: '2011-04-17',
    voteAverage: 8.4,
    overview: 'Seven noble families fight for control of the mythical land of Westeros.',
    runtimeMinutes: 60,
    contentRating: 'TV-MA',
    genres: [{ id: 10765, name: 'Sci-Fi & Fantasy' }],
    providers: [],
  },
]

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function mountCarousel(titles: HeroTitle[]): Promise<{ wrapper: Awaited<ReturnType<typeof mountSuspended>> }> {
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
    const manyTitles: HeroTitle[] = Array.from({ length: 8 }, (_, i) => ({
      kind: 'MOVIE' as const,
      tmdbId: 1000 + i,
      name: `Title ${i}`,
      posterPath: null,
      backdropPath: null,
      releaseDate: '2020-01-01',
      voteAverage: 5 + i * 0.3,
      overview: null,
      runtimeMinutes: null,
      contentRating: null,
      genres: [],
      providers: [],
    }))

    const { wrapper } = await mountCarousel(manyTitles)
    const r = root(wrapper)
    expect(r.querySelectorAll('[data-index]')).toHaveLength(5)

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

  it('exposes a view-details link to the active slide detail page', async () => {
    const { wrapper } = await mountCarousel(sampleTitles)
    const r = root(wrapper)
    const primaryLink = r.querySelector('.heroBtnPrimary') as HTMLAnchorElement | null
    expect(primaryLink).toBeTruthy()
    expect(primaryLink!.getAttribute('href')).toBe('/tv/1399')

    wrapper.unmount()
  })

  it('renders the five-row metadata stack (title, rating+genres, overview, provider+year+time, actions)', async () => {
    const { wrapper } = await mountCarousel(sampleTitles)
    const r = root(wrapper)
    const activeSlide = r.querySelector('.heroSlide.active')
    expect(activeSlide).toBeTruthy()

    expect(activeSlide!.querySelector('.heroTitle')).toBeTruthy()
    expect(activeSlide!.querySelector('.heroMeta')?.textContent).toContain('★')
    expect(activeSlide!.querySelector('.heroMeta')?.textContent).toContain('Sci-Fi & Fantasy')
    expect(activeSlide!.querySelector('.heroOverview')?.textContent).toContain('Westeros')
    expect(activeSlide!.querySelector('.heroStrip')?.textContent).toContain('2011')
    expect(activeSlide!.querySelector('.heroActions')).toBeTruthy()
    // Detail-parity: primary link + RatingTrio + TitleStatusToggle (3 interactive controls: 1 NuxtLink + 1 RatingTrio trigger + 2 status buttons)
    expect(activeSlide!.querySelector('.heroActions .heroBtnPrimary')).toBeTruthy()
    expect(activeSlide!.querySelectorAll('.heroActions button').length).toBeGreaterThanOrEqual(3)

    wrapper.unmount()
  })

  it('shows a provider logo for titles that have providers, alongside year', async () => {
    const { wrapper } = await mountCarousel(sampleTitles)
    const r = root(wrapper)
    const slides = [...r.querySelectorAll('.heroSlide')]
    const duneSlide = slides.find(s => s.querySelector('.heroTitle')?.textContent?.includes('Dune Part Two'))!
    expect(duneSlide.querySelector('.heroStripProviderLogo')).toBeTruthy()
    expect(duneSlide.querySelector('.heroStrip')!.textContent ?? '').toContain('2024')
    expect(duneSlide.querySelector('.heroStrip')!.textContent ?? '').not.toMatch(/Streaming/i)

    wrapper.unmount()
  })

  it('does not render a streaming fallback label when providers are empty (logo omitted, year still shown)', async () => {
    const { wrapper } = await mountCarousel(sampleTitles)
    const r = root(wrapper)
    const slides = [...r.querySelectorAll('.heroSlide')]
    const active = slides.find(s => s.classList.contains('active'))!
    expect(active.querySelector('.heroStripProvider')).toBeFalsy()
    const strip = active.querySelector('.heroStrip')!.textContent ?? ''
    expect(strip).not.toMatch(/Streaming/i)
    expect(strip).toContain('2011')
    wrapper.unmount()
  })

  it('places backdrop image above fallback solid (backdrop visible)', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const vueFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/hero-carousel.vue'), 'utf-8')
    const beforeIdx = vueFile.indexOf('.heroSlide::before')
    const beforeBlock = vueFile.slice(beforeIdx, beforeIdx + 800)
    const backdropIdx = vueFile.indexOf('.heroBackdrop')
    const backdropBlock = vueFile.slice(backdropIdx, backdropIdx + 600)
    const afterIdx = vueFile.indexOf('.heroSlide::after')
    const afterBlock = vueFile.slice(afterIdx, afterIdx + 900)
    expect(beforeBlock).toMatch(/z-index:\s*-3/)
    expect(backdropBlock).toMatch(/z-index:\s*-2/)
    expect(afterBlock).toMatch(/z-index:\s*-1/)
    // ordering ensures image covers fallback but sits under gradient
  })

  it('places kind immediately to the right of rating score in row2 (heroMeta)', async () => {
    const { wrapper } = await mountCarousel(sampleTitles)
    const r = root(wrapper)
    const active = r.querySelector('.heroSlide.active')!
    const meta = active.querySelector('.heroMeta')!.textContent ?? ''
    // rating ★ 8.4 then kind TV Show should appear in same row, adjacent
    expect(meta).toMatch(/★/)
    expect(meta).toContain('TV Show')
    // kind must not be in heroStrip after fix
    expect(active.querySelector('.heroStrip')!.textContent ?? '').not.toContain('TV Show')
    expect(active.querySelector('.heroStrip')!.textContent ?? '').not.toContain('Movie')
    wrapper.unmount()
  })

  it('heroStrip shows provider logo, year and runtime without streaming texts', async () => {
    const { wrapper } = await mountCarousel(sampleTitles)
    const r = root(wrapper)
    const slides = [...r.querySelectorAll('.heroSlide')]
    const active = slides.find(s => s.classList.contains('active'))!
    const strip = active.querySelector('.heroStrip')!.textContent ?? ''
    expect(strip).not.toMatch(/Streaming/i)
    expect(strip).not.toMatch(/providers?/i)
    expect(strip).toContain('2011')
    // provider logo should still render for titles that have providers (Dune Part Two)
    const duneSlide = slides.find(s => s.querySelector('.heroTitle')?.textContent?.includes('Dune Part Two'))!
    expect(duneSlide.querySelector('.heroStripProvider')).toBeTruthy()
    expect(duneSlide.querySelector('.heroStrip')!.textContent ?? '').toContain('2024')
    wrapper.unmount()
  })
})
