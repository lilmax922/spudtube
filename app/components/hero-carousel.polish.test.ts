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
    overview: 'Paul Atreides...',
    runtimeMinutes: 155,
    contentRating: 'PG-13',
    genres: [{ id: 878, name: 'Sci-Fi' }],
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
    overview: 'Paul unites...',
    runtimeMinutes: 166,
    contentRating: 'PG-13',
    genres: [{ id: 878, name: 'Sci-Fi' }],
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

async function mountCarousel(titles: HeroTitle[]) {
  registerEndpoint('https://image.tmdb.org/t/p/**', () => ({ body: '' }))
  const wrapper = await mountSuspended(HeroCarousel, {
    props: { titles },
    route: '/',
    attachTo: document.body,
  })
  return wrapper
}

describe('hero-carousel polish', () => {
  it('uses 100dvh with origin aspect ratio and handles wide viewports (not 100dvh when wider than backdrop)', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const vueFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/hero-carousel.vue'), 'utf-8')
    // must use dynamic viewport unit
    expect(vueFile).toMatch(/100dvh/)
    // must preserve original aspect ratio (~16:9) via 56.25vw or aspect-ratio or calc with 16/9
    const hasAspectHandling = /56\.25vw/.test(vueFile) || /aspect-ratio/.test(vueFile) || /16\s*\/\s*9/.test(vueFile)
    expect(hasAspectHandling).toBe(true)
    // must have handling for wide viewport where height is constrained by width, not viewport height
    // via min(100dvh, ...) or @media (min-aspect-ratio) or max-height with vw
    const hasWideHandling = /min\s*\(\s*100dvh/.test(vueFile) || /min-aspect-ratio/.test(vueFile) || /max-height.*vw/.test(vueFile)
    expect(hasWideHandling).toBe(true)
  })

  it('hero arrows are hidden by default and only visible on hover/focus', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const vueFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/hero-carousel.vue'), 'utf-8')
    // default hidden: opacity 0
    expect(vueFile).toMatch(/\.heroArrow[\s\S]*?opacity:\s*0/)
    // hover visible: .heroCarousel:hover .heroArrow or group-hover or :hover
    const hasHoverReveal = /\.heroCarousel:hover\s+\.heroArrow/.test(vueFile) || /group-hover/.test(vueFile) || /\.heroCarousel:.*hover/.test(vueFile) || /:hover.*\.heroArrow/.test(vueFile)
    expect(hasHoverReveal).toBe(true)
  })

  it('supports trackpad/magic mouse horizontal scroll via wheel handler', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const vueFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/hero-carousel.vue'), 'utf-8')
    const hasWheelBinding = /@wheel/.test(vueFile) || /handleWheel/.test(vueFile) || /wheel/.test(vueFile)
    expect(hasWheelBinding).toBe(true)
    // must reference deltaX or deltaY to distinguish horizontal scroll
    expect(vueFile).toMatch(/deltaX|deltaY/)
  })

  it('advances slide on horizontal wheel/trackpad swipe', async () => {
    const wrapper = await mountCarousel(sampleTitles)
    const root = wrapper.element as HTMLElement
    // mountSuspended root is the component's heroCarousel itself when trending >0
    const carousel = (root.matches?.('.heroCarousel') ? root : root.querySelector('.heroCarousel')) as HTMLElement
    expect(carousel).toBeTruthy()
    const getActiveIndex = () => {
      // query inside carousel instead of root to handle both cases
      const active = carousel.querySelector('.heroSlide.active') ?? root.querySelector('.heroSlide.active')
      return (active as HTMLElement | null)?.getAttribute('data-index')
    }
    expect(getActiveIndex()).toBe('0')
    // simulate horizontal wheel to next
    carousel.dispatchEvent(new WheelEvent('wheel', { deltaX: 80, deltaY: 0, bubbles: true, cancelable: true }))
    await flushPromises()
    vi.advanceTimersByTime(100)
    await flushPromises()
    // should have moved to next slide
    expect(getActiveIndex()).toBe('1')
    // wait for cooldown (400ms) before swipe back
    vi.advanceTimersByTime(400)
    await flushPromises()
    carousel.dispatchEvent(new WheelEvent('wheel', { deltaX: -80, deltaY: 0, bubbles: true, cancelable: true }))
    await flushPromises()
    vi.advanceTimersByTime(100)
    await flushPromises()
    expect(getActiveIndex()).toBe('0')
    wrapper.unmount()
  })
})
