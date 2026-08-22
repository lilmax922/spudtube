import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MOVIE_DETAIL, MOVIE_DETAIL_NO_TRAILER, RECOMMENDATIONS_PAGE } from '../../lib/title-detail-fixtures'
import MoviePage from './[id].vue'

function detailUrl(tmdbId: number): string {
  return `/api/catalog/movie/${tmdbId}`
}

function recommendationsUrl(tmdbId: number): string {
  return `/api/catalog/movie/${tmdbId}/recommendations`
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
    registerEndpoint(detailUrl(419430), () => MOVIE_DETAIL)
    registerEndpoint(recommendationsUrl(419430), () => RECOMMENDATIONS_PAGE)

    const wrapper = await renderPage('/movie/419430')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('沙丘')
    })

    expect(wrapper.text()).toContain('天賦異稟的保羅·亞崔迪…')
    expect(wrapper.text()).toContain('科幻')
    expect(wrapper.text()).toContain('冒險')
    expect(wrapper.text()).toContain('2021')
    expect(wrapper.text()).toContain('155 分鐘')
  })

  it('embeds the trailer iframe when a trailer key exists', async () => {
    registerEndpoint(detailUrl(419431), () => MOVIE_DETAIL)
    registerEndpoint(recommendationsUrl(419431), () => RECOMMENDATIONS_PAGE)

    const wrapper = await renderPage('/movie/419431')
    await vi.waitFor(() => {
      expect(wrapper.html()).toContain('zhTrailerKey')
    })

    expect(wrapper.find('iframe').attributes('src')).toContain('zhTrailerKey')
  })

  it('renders no trailer iframe when the title has no trailer', async () => {
    registerEndpoint(detailUrl(419432), () => MOVIE_DETAIL_NO_TRAILER)
    registerEndpoint(recommendationsUrl(419432), () => RECOMMENDATIONS_PAGE)

    const wrapper = await renderPage('/movie/419432')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('沙丘')
    })

    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('預告片')
  })

  it('links recommended titles to their own detail routes', async () => {
    registerEndpoint(detailUrl(419433), () => MOVIE_DETAIL)
    registerEndpoint(recommendationsUrl(419433), () => RECOMMENDATIONS_PAGE)

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
})
