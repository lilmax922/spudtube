import type { DOMWrapper } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PROVIDER_CATALOG } from '../../lib/availability-fixtures'
import { RECOMMENDATIONS_PAGE, TV_DETAIL } from '../../lib/title-detail-fixtures'
import TvPage from './[id].vue'

function detailUrl(tmdbId: number): string {
  return `/api/catalog/tv/${tmdbId}`
}

function recommendationsUrl(tmdbId: number): string {
  return `/api/catalog/tv/${tmdbId}/recommendations`
}

function providersUrl(tmdbId: number): string {
  return `/api/catalog/tv/${tmdbId}/providers`
}

function registerEndpoints(tmdbId: number): void {
  registerEndpoint(detailUrl(tmdbId), () => TV_DETAIL)
  registerEndpoint(recommendationsUrl(tmdbId), () => RECOMMENDATIONS_PAGE)
  registerEndpoint(providersUrl(tmdbId), () => PROVIDER_CATALOG)
}

async function renderPage(route: string): Promise<ReturnType<typeof mountSuspended>> {
  return await mountSuspended(TvPage, { route })
}

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('tv detail route', () => {
  it('renders the identity block for a known tv show', async () => {
    registerEndpoints(94605)

    const wrapper = await renderPage('/tv/94605')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('奧術')
    })

    expect(wrapper.text()).toContain('在烏托邦皮爾特沃夫…')
    expect(wrapper.text()).toContain('動畫')
    expect(wrapper.text()).toContain('科幻與奇幻')
    expect(wrapper.text()).toContain('2021')
    expect(wrapper.text()).toContain('42 分鐘')
    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('預告片')
  })

  it('renders the availability panel with providers for the default region', async () => {
    registerEndpoints(94605)

    const wrapper = await renderPage('/tv/94605')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('提供平台')
    })
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('訂閱')
    })

    const providerAlts = wrapper.findAll('img').map((image: DOMWrapper<Element>) => image.attributes('alt'))
    expect(providerAlts).toEqual(expect.arrayContaining(['CATCHPLAY+', 'Netflix']))
  })

  it('renders a friendly not-found state for a removed show', async () => {
    registerEndpoint(detailUrl(404404), () => null)
    registerEndpoint(recommendationsUrl(404404), () => RECOMMENDATIONS_PAGE)

    const wrapper = await renderPage('/tv/404404')
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('找不到這部作品')
    })
  })

  it('renders cast and tv-only facts (no budget / revenue)', async () => {
    registerEndpoints(94605)

    const wrapper = await renderPage('/tv/94605')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Hailee Steinfeld')
    })

    expect(wrapper.text()).toContain('主要演員')
    expect(wrapper.text()).toContain('Vi')
    // keywords section is removed from the detail page
    expect(wrapper.text()).not.toContain('關鍵字')
    expect(wrapper.text()).not.toContain('steampunk')
    expect(wrapper.text()).toContain('TV-MA')
    // tv detail must not render movie-only rows
    expect(wrapper.text()).not.toContain('預算')
    expect(wrapper.text()).not.toContain('票房')
  })
})
