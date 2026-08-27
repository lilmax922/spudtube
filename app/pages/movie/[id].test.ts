import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PROVIDER_CATALOG } from '../../lib/availability-fixtures'
import { MOVIE_DETAIL, MOVIE_DETAIL_NO_TRAILER, RECOMMENDATIONS_PAGE } from '../../lib/title-detail-fixtures'
import MoviePage from './[id].vue'

function detailUrl(tmdbId: number): string {
  return `/api/catalog/movie/${tmdbId}`
}

function recommendationsUrl(tmdbId: number): string {
  return `/api/catalog/movie/${tmdbId}/recommendations`
}

function providersUrl(tmdbId: number): string {
  return `/api/catalog/movie/${tmdbId}/providers`
}

function registerEndpoints(tmdbId: number, detail = MOVIE_DETAIL): void {
  registerEndpoint(detailUrl(tmdbId), () => detail)
  registerEndpoint(recommendationsUrl(tmdbId), () => RECOMMENDATIONS_PAGE)
  registerEndpoint(providersUrl(tmdbId), () => PROVIDER_CATALOG)
}

async function renderPage(route: string): Promise<VueWrapper<InstanceType<typeof MoviePage>>> {
  return await mountSuspended(MoviePage, { route })
}

function linkHrefs(wrapper: VueWrapper<InstanceType<typeof MoviePage>>): Array<string | undefined> {
  return wrapper.findAll('a').map((link: DOMWrapper<Element>) => link.attributes('href'))
}

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('movie detail route', () => {
  it('renders the identity block for a known movie', async () => {
    registerEndpoints(419430)

    const wrapper = await renderPage('/movie/419430')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('沙丘')
    })

    expect(wrapper.text()).toContain('天賦異稟的保羅·亞崔迪…')
    expect(wrapper.text()).toContain('科幻')
    expect(wrapper.text()).toContain('冒險')
    expect(wrapper.text()).toContain('2021')
    expect(wrapper.text()).toContain('155 分鐘')
    // the back-to-home button under the hero has been removed
    expect(wrapper.text()).not.toContain('返回首頁')
  })

  it('renders the availability panel with providers for the default region', async () => {
    registerEndpoints(419430)

    const wrapper = await renderPage('/movie/419430')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('提供平台')
    })
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('訂閱')
    })
    const providerAlts = wrapper.findAll('img').map(image => image.attributes('alt'))
    expect(providerAlts).toEqual(expect.arrayContaining(['CATCHPLAY+', 'Netflix']))
    expect(wrapper.text()).toContain('JustWatch')
  })

  it('opens the trailer modal with an autoplaying iframe from the hero play button', async () => {
    registerEndpoints(419431)

    const wrapper = await renderPage('/movie/419431')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('沙丘')
    })

    // no inline trailer section: iframe only appears after opening the modal
    expect(document.querySelector('iframe')).toBeNull()
    expect(wrapper.text()).not.toContain('預告片')

    const playButton = wrapper.findAll('button').find(button => button.attributes('aria-label') === '播放預告')
    expect(playButton).toBeDefined()
    await playButton!.trigger('click')

    await vi.waitFor(() => {
      expect(document.querySelector('iframe')).not.toBeNull()
    })
    expect((document.querySelector('iframe') as HTMLIFrameElement).getAttribute('src')).toContain('zhTrailerKey')

    wrapper.unmount()
  })

  it('renders no play-trailer button and no trailer copy when the title has no trailer', async () => {
    registerEndpoints(419432, MOVIE_DETAIL_NO_TRAILER)

    const wrapper = await renderPage('/movie/419432')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('沙丘')
    })

    expect(wrapper.findAll('button').find(button => button.attributes('aria-label') === '播放預告')).toBeUndefined()
    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('預告片')
  })

  it('links recommended titles to their own detail routes', async () => {
    registerEndpoints(419433)

    const wrapper = await renderPage('/movie/419433')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('沙丘：第二部')
    })

    const links = linkHrefs(wrapper)
    expect(links).toContain('/movie/693134')
    expect(links).toContain('/tv/135431')
  })

  it('renders a friendly not-found state for a removed title', async () => {
    registerEndpoint(detailUrl(404404), () => null)
    registerEndpoint(recommendationsUrl(404404), () => RECOMMENDATIONS_PAGE)

    const wrapper = await renderPage('/movie/404404')
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('找不到這部作品')
    })
    expect(wrapper.text()).not.toContain('預告片')
  })

  it('renders a friendly not-found state for a non-numeric id', async () => {
    registerEndpoint('/api/catalog/movie/not-a-number', () =>
      new Response('{}', { status: 400 }))

    const wrapper = await renderPage('/movie/not-a-number')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('找不到這部作品')
    })
  })

  it('renders the cast, media and extended facts', async () => {
    registerEndpoints(419430)

    const wrapper = await renderPage('/movie/419430')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Timothée Chalamet')
    })

    // cast list
    expect(wrapper.text()).toContain('主要演員')
    expect(wrapper.text()).toContain('Timothée Chalamet')
    expect(wrapper.text()).toContain('Paul Atreides')

    // media backdrops
    expect(wrapper.text()).toContain('劇照')
    const backdropImages = wrapper.findAll('img')
      .map(img => img.attributes('src'))
      .filter((src): src is string => src != null && src.includes('w1280'))
    expect(backdropImages.length).toBeGreaterThanOrEqual(2)

    // keywords section is removed from the detail page
    expect(wrapper.text()).not.toContain('關鍵字')

    // hero carries kind, genres, rating badge and the year/runtime meta row
    expect(wrapper.text()).toContain('電影')
    expect(wrapper.text()).toContain('PG-13')
    expect(wrapper.text()).toContain('2021')
    expect(wrapper.text()).toContain('155 分鐘')

    // facts panel extended fields
    expect(wrapper.text()).toContain('原名')
    expect(wrapper.text()).toContain('Dune')
    expect(wrapper.text()).toContain('狀態')
    expect(wrapper.text()).toContain('Released')

    // streaming providers live only in the availability section below the hero
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('訂閱')
    })
    const providerAlts = wrapper.findAll('img').map(image => image.attributes('alt'))
    expect(providerAlts).toEqual(expect.arrayContaining(['CATCHPLAY+', 'Netflix']))

    wrapper.unmount()
  })
})
