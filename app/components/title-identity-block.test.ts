import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MOVIE_DETAIL, MOVIE_WITHOUT_ARTWORK } from '../lib/title-detail-fixtures'
import TitleIdentityBlock from './title-identity-block.vue'

async function render(detail = MOVIE_DETAIL, route = '/?probe=1'): Promise<VueWrapper<InstanceType<typeof TitleIdentityBlock>>> {
  return await mountSuspended(TitleIdentityBlock, { route, props: { detail } })
}

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('title identity block', () => {
  it('renders the title with year inline, plus overview, genres and runtime', async () => {
    const wrapper = await render()

    expect(wrapper.text()).toContain('沙丘')
    expect(wrapper.text()).toContain('(2021)')
    expect(wrapper.text()).toContain('天賦異稟的保羅·亞崔迪…')
    expect(wrapper.text()).toContain('科幻')
    expect(wrapper.text()).toContain('冒險')
    expect(wrapper.text()).toContain('155 分鐘')
  })

  it('renders backdrop and poster images from the TMDB CDN', async () => {
    const wrapper = await render(MOVIE_DETAIL, '/?probe=2')

    const images = wrapper.findAll('img').map(img => img.attributes('src'))
    expect(images).toContain('https://image.tmdb.org/t/p/w1280/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg')
    expect(images).toContain('https://image.tmdb.org/t/p/w500/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg')
  })

  it('hides the tagline when absent', async () => {
    const wrapper = await render(MOVIE_WITHOUT_ARTWORK, '/?probe=3')

    expect(wrapper.text()).toContain('Untranslated Film')
    expect(wrapper.text()).toContain('An English overview for an untranslated film.')
    expect(wrapper.text()).not.toContain('超越即將來臨')
  })

  it('omits year, runtime and genre chips when the data is missing', async () => {
    const noMeta = { ...MOVIE_WITHOUT_ARTWORK, releaseDate: null, runtimeMinutes: null, genres: [] }
    const wrapper = await render(noMeta, '/?probe=4')

    expect(wrapper.text()).not.toContain('(2021)')
    expect(wrapper.text()).not.toContain('155 分鐘')
    expect(wrapper.findAll('span.rounded-full')).toHaveLength(0)
  })

  it('forwards rating actions from the trio to the page', async () => {
    const wrapper = await mountSuspended(TitleIdentityBlock, {
      route: '/?probe=5',
      props: { detail: MOVIE_DETAIL, signedIn: true },
    })

    const rateButton = wrapper.findAll('button').find(button => button.attributes('aria-label') === '評價這部片')
    expect(rateButton).toBeDefined()
    await rateButton!.trigger('click')
    await wrapper.findAll('button').find(button => button.attributes('aria-label') === '超棒')!.trigger('click')

    expect(wrapper.emitted('selectRating')).toEqual([['AWESOME']])
  })

  it('renders the persisted rating when signed in and clears on demand', async () => {
    const wrapper = await mountSuspended(TitleIdentityBlock, {
      route: '/?probe=6',
      props: { detail: MOVIE_DETAIL, rating: 'GOOD', signedIn: true },
    })

    const ratedButton = wrapper.findAll('button').find(button => button.attributes('aria-label') === '已評價：不錯')
    expect(ratedButton).toBeDefined()
    await ratedButton!.trigger('click')
    const good = wrapper.findAll('button').find(button => button.attributes('aria-label') === '不錯')
    expect(good?.attributes('aria-pressed')).toBe('true')
    await good!.trigger('click')

    expect(wrapper.emitted('clearRating')).toHaveLength(1)
  })

  it('emits signInRequested when an anonymous visitor clicks the trio', async () => {
    const wrapper = await render(MOVIE_DETAIL, '/?probe=7')

    await wrapper.findAll('button').find(button => button.attributes('aria-label') === '評價這部片')!.trigger('click')

    expect(wrapper.emitted('signInRequested')).toHaveLength(1)
  })

  it('forwards watch status actions from the toggle to the page', async () => {
    const wrapper = await mountSuspended(TitleIdentityBlock, {
      route: '/?probe=8',
      props: { detail: MOVIE_DETAIL, signedIn: true },
    })

    const watchlistButton = wrapper.findAll('button').find(button => button.attributes('aria-label') === '加入待看清單')
    expect(watchlistButton).toBeDefined()
    await watchlistButton!.trigger('click')

    expect(wrapper.emitted('setStatus')).toEqual([['WATCHLISTED']])
  })

  it('renders the persisted status when signed in and clears on demand', async () => {
    const wrapper = await mountSuspended(TitleIdentityBlock, {
      route: '/?probe=9',
      props: { detail: MOVIE_DETAIL, status: 'WATCHED', signedIn: true },
    })

    const watchedButton = wrapper.findAll('button').find(button => button.attributes('aria-label') === '已看過 — 點擊清除')
    expect(watchedButton).toBeDefined()
    expect(watchedButton!.attributes('aria-pressed')).toBe('true')
    await watchedButton!.trigger('click')

    expect(wrapper.emitted('clearStatus')).toHaveLength(1)
  })

  it('emits signInRequested when an anonymous visitor clicks the toggle', async () => {
    const wrapper = await render(MOVIE_DETAIL, '/?probe=10')

    await wrapper.findAll('button').find(button => button.attributes('aria-label') === '加入待看清單')!.trigger('click')

    expect(wrapper.emitted('signInRequested')).toHaveLength(1)
  })
})
