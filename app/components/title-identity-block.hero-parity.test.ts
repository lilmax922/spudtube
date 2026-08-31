import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MOVIE_DETAIL } from '../lib/title-detail-fixtures'
import TitleIdentityBlock from './title-identity-block.vue'

beforeEach(() => {
  document.cookie = 'spudtube-locale=en; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

async function render(detail = MOVIE_DETAIL) {
  return await mountSuspended(TitleIdentityBlock, { route: '/movie/419430?probe=hero-parity', props: { detail } })
}

function readVue(): string {
  return readFileSync(resolve(process.cwd(), 'app/components/title-identity-block.vue'), 'utf-8')
}

describe('title-identity-block hero parity with home hero', () => {
  it('has same height as home hero (600px / dvh / 56.25vw)', async () => {
    const src = readVue()
    expect(src).toContain('min-height: 600px')
    expect(src).toContain('height: min(100dvh, 56.25vw)')
    expect(src).toContain('max-height: 100dvh')
  })

  it('has same full-bleed breakout as home hero (100vw + 50% -50vw + -header-h)', async () => {
    const src = readVue()
    expect(src).toContain('width: 100vw')
    expect(src).toContain('margin-left: calc(50% - 50vw)')
    expect(src).toContain('margin-right: calc(50% - 50vw)')
    expect(src).toContain('margin-top: calc(var(--header-h) * -1)')
  })

  it('has same content position (flex-end bottom anchor with home padding)', async () => {
    const src = readVue()
    expect(src).toContain('align-items: flex-end')
    expect(src).toContain('padding: calc(var(--header-h) + 28px) 64px 80px')
  })

  it('has heroInner constrained to max-content-width and heroInfo 640px gap 14', async () => {
    const src = readVue()
    expect(src).toContain('max-width: var(--max-content-width)')
    expect(src).toContain('max-width: 640px')
    expect(src).toContain('gap: 14px')
  })

  it('renders same 5-row stack as home: heroTitle, heroMeta, heroOverview, heroStrip, heroActions', async () => {
    const wrapper = await render()
    const el = wrapper.element as HTMLElement
    expect(el.querySelector('.heroTitle')).toBeTruthy()
    expect(el.querySelector('.heroMeta')).toBeTruthy()
    expect(el.querySelector('.heroOverview')).toBeTruthy()
    expect(el.querySelector('.heroStrip')).toBeTruthy()
    expect(el.querySelector('.heroActions')).toBeTruthy()
  })

  it('overview uses home sizing (max-width 60ch, clamped 3)', async () => {
    const src = readVue()
    expect(src).toContain('max-width: 60ch')
    expect(src).toContain('-webkit-line-clamp: 3')
    expect(src).not.toContain('max-w-[30vw]')
  })

  it('heroMeta places gold star rating before kind (★ + kind in same row)', async () => {
    const wrapper = await render()
    const meta = (wrapper.element as HTMLElement).querySelector('.heroMeta')?.textContent ?? ''
    expect(meta).toMatch(/★/)
    expect(meta).toContain('Movie')
    // rating score should be in meta, not in strip
    const strip = (wrapper.element as HTMLElement).querySelector('.heroStrip')?.textContent ?? ''
    expect(strip).not.toMatch(/★/)
  })

  it('heroStrip shows year and runtime without provider/streaming text', async () => {
    const wrapper = await render()
    const strip = (wrapper.element as HTMLElement).querySelector('.heroStrip')?.textContent ?? ''
    expect(strip).toContain('2021')
    expect(strip).toContain('155')
    expect(strip).not.toMatch(/Streaming/i)
    expect(strip).not.toMatch(/providers?/i)
  })

  it('is not a carousel (no aria-roledescription, no dots, no arrows, no data-index)', async () => {
    const wrapper = await render()
    const el = wrapper.element as HTMLElement
    expect(el.querySelector('[aria-roledescription="carousel"]')).toBeFalsy()
    expect(el.querySelectorAll('[data-index]').length).toBe(0)
    expect(el.querySelector('.heroDots')).toBeFalsy()
    expect(el.querySelector('.heroArrow')).toBeFalsy()
    expect(el.querySelector('.heroDot')).toBeFalsy()
    const src = readVue()
    expect(src).not.toMatch(/setInterval/)
    expect(src).not.toMatch(/heroIdx/)
  })

  it('has Play Trailer button styled as heroBtnPrimary white pill (not bg-primary) and emits playTrailer', async () => {
    const wrapper = await render()
    const btn = (wrapper.element as HTMLElement).querySelector('.heroBtnPrimary') as HTMLElement | null
    expect(btn).toBeTruthy()
    expect(btn?.textContent).toContain('Play trailer')
    expect(btn?.tagName.toLowerCase()).toBe('button')
    const src = readVue()
    // home button uses #fff bg, not bg-primary (oklch) - ensure parity uses same heroBtnPrimary class
    expect(src).toContain('.heroBtnPrimary')
    // should still have aria-label and Play icon
    expect(btn?.getAttribute('aria-label')).toContain('Play trailer')
    await btn!.click()
    expect(wrapper.emitted('playTrailer')).toHaveLength(1)
  })

  it('does not render View Details link', async () => {
    const wrapper = await render()
    const el = wrapper.element as HTMLElement
    expect(el.textContent).not.toContain('View details')
    expect(el.querySelector('a.heroBtnPrimary')).toBeFalsy()
  })

  it('uses same overlay layering as home (backdrop z -2, gradient overlay z -1, fallback -3)', async () => {
    const src = readVue()
    expect(src).toContain('z-index: -2')
    expect(src).toContain('z-index: -1')
    expect(src).toContain('z-index: -3')
    // gradients from home
    expect(src).toContain('linear-gradient(to right, rgba(0, 0, 0, 0.85)')
    expect(src).toContain('linear-gradient(to top, rgba(0, 0, 0, 0.85)')
    // should not use old bg-black/35 single overlay
    expect(src).not.toContain('bg-black/35')
  })

  it('backdrop image uses heroBackdrop class with object-cover and 100vw sizes', async () => {
    const wrapper = await render()
    const img = (wrapper.element as HTMLElement).querySelector('.heroBackdrop') as HTMLImageElement | null
    expect(img).toBeTruthy()
    expect(img?.getAttribute('sizes')).toBe('100vw')
    const src = readVue()
    expect(src).toContain('.heroBackdrop')
    expect(src).toContain('object-fit: cover')
  })

  it('matches home responsive breakpoints (880px min-height 540px, 560px padding)', async () => {
    const src = readVue()
    expect(src).toContain('@media (max-width: 880px)')
    expect(src).toContain('min-height: 540px')
    expect(src).toContain('@media (max-width: 560px)')
    expect(src).toContain('padding: calc(var(--header-h) + 20px) 20px 56px')
  })
})
