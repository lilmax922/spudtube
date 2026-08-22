import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import type { ProviderCatalog } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CATCHPLAY_PLUS,
  PROVIDER_CATALOG,
  PROVIDER_CATALOG_MULTI_GROUP,
  PROVIDER_CATALOG_WITHOUT_TW,
} from '../lib/availability-fixtures'
import AvailabilityPanel from './availability-panel.vue'

const availabilityMock = vi.hoisted(() => ({
  catalog: {
    data: { value: null as ProviderCatalog | null | undefined },
    pending: { value: false },
    error: { value: null as Error | null },
  },
}))

vi.mock('../composables/use-availability', () => ({
  useAvailability: () => ({ catalog: availabilityMock.catalog }),
}))

function setCatalog(catalog: ProviderCatalog): void {
  availabilityMock.catalog.data.value = catalog
  availabilityMock.catalog.pending.value = false
  availabilityMock.catalog.error.value = null
}

async function renderPanel(): Promise<VueWrapper<InstanceType<typeof AvailabilityPanel>>> {
  return await mountSuspended(AvailabilityPanel, {
    route: '/?probe=1',
    props: { kind: 'MOVIE', tmdbId: 419430 },
  })
}

function groupLabels(wrapper: VueWrapper<InstanceType<typeof AvailabilityPanel>>): string[] {
  return wrapper
    .findAll('span')
    .map((span: DOMWrapper<Element>) => span.text())
    .filter((label: string) => ['訂閱', '免費', '租借', '購買'].includes(label))
}

function providerAlts(wrapper: VueWrapper<InstanceType<typeof AvailabilityPanel>>): Array<string | undefined> {
  return wrapper.findAll('img').map((image: DOMWrapper<Element>) => image.attributes('alt'))
}

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
  document.cookie = 'spudtube-region=; Max-Age=0; Path=/'
})

describe('availability panel', () => {
  it('renders groups in fixed subscription → free → rent → buy order', async () => {
    setCatalog(PROVIDER_CATALOG_MULTI_GROUP)
    const wrapper = await renderPanel()

    expect(groupLabels(wrapper)).toEqual(['訂閱', '免費', '租借', '購買'])
  })

  it('renders provider logo chips with names and CDN urls', async () => {
    setCatalog(PROVIDER_CATALOG_MULTI_GROUP)
    const wrapper = await renderPanel()

    expect(providerAlts(wrapper)).toEqual(
      expect.arrayContaining(['Netflix', 'Disney+', 'Apple TV', 'Google Play Movies']),
    )

    const images = wrapper.findAll('img')
    expect(images.map((image: DOMWrapper<Element>) => image.attributes('src'))).toContain(
      'https://image.tmdb.org/t/p/w92/t2yyOv40HZeVlLjMcCsANnTv9FW.jpg',
    )
  })

  it('shows an explicit unavailable state when the region has zero providers', async () => {
    setCatalog(PROVIDER_CATALOG_WITHOUT_TW)
    const wrapper = await renderPanel()

    expect(wrapper.text()).toContain('此區域暫無串流資訊')
    expect(wrapper.text()).toContain('作品仍會正常出現在所有列表，不會被隱藏。')
    expect(wrapper.text()).not.toContain('Netflix')
    expect(wrapper.findAll('img')).toHaveLength(0)
  })

  it('renders TMDB and JustWatch attributions alongside provider data', async () => {
    setCatalog(PROVIDER_CATALOG_MULTI_GROUP)
    const wrapper = await renderPanel()

    expect(wrapper.text()).toContain('JustWatch')
    expect(wrapper.text()).toContain('TMDB API')
  })

  it('lists the 14 curated regions in the switcher', async () => {
    setCatalog(PROVIDER_CATALOG_MULTI_GROUP)
    const wrapper = await renderPanel()

    const options = wrapper.findAll('option')
    expect(options).toHaveLength(14)
    expect(options[0]!.text()).toBe('台灣')
    expect(options[1]!.text()).toBe('香港')
    expect(options[13]!.text()).toBe('墨西哥')
  })

  it('defaults to the detected/persisted region and switches availability only', async () => {
    document.cookie = 'spudtube-region=US; Path=/'
    setCatalog(PROVIDER_CATALOG)
    const wrapper = await renderPanel()

    expect(providerAlts(wrapper)).toEqual(expect.arrayContaining(['Netflix', 'Apple TV']))
    expect(providerAlts(wrapper)).not.toEqual(expect.arrayContaining(['CATCHPLAY+']))

    const select = wrapper.find('select')
    await select.setValue('TW')

    expect(providerAlts(wrapper)).toEqual(expect.arrayContaining(['CATCHPLAY+']))
    expect(providerAlts(wrapper)).not.toEqual(expect.arrayContaining(['Apple TV']))
    expect(document.cookie).toContain('spudtube-region=TW')
    expect(select.element.value).toBe('TW')
  })

  it('falls back to the default region without any signal and switches availability only', async () => {
    setCatalog(PROVIDER_CATALOG)
    const wrapper = await renderPanel()

    expect(providerAlts(wrapper)).toEqual(expect.arrayContaining(['CATCHPLAY+']))
    expect(providerAlts(wrapper)).not.toEqual(expect.arrayContaining(['Apple TV']))

    await wrapper.find('select').setValue('US')

    expect(providerAlts(wrapper)).toEqual(expect.arrayContaining(['Apple TV', 'Netflix']))
    expect(providerAlts(wrapper)).not.toEqual(expect.arrayContaining(['CATCHPLAY+']))
  })

  it('renders the loading state while the catalog is pending', async () => {
    availabilityMock.catalog.data.value = null
    availabilityMock.catalog.pending.value = true
    availabilityMock.catalog.error.value = null
    const wrapper = await renderPanel()

    expect(wrapper.text()).toContain('載入串流資訊中…')
  })

  it('renders the error state when the catalog fails to load', async () => {
    availabilityMock.catalog.data.value = undefined
    availabilityMock.catalog.pending.value = false
    availabilityMock.catalog.error.value = new Error('boom')
    const wrapper = await renderPanel()

    expect(wrapper.text()).toContain('暫時無法取得串流資訊。')
  })

  it('falls back to a text label when a provider has no logo', async () => {
    const logoLess: ProviderCatalog = {
      TW: {
        link: null,
        groups: {
          subscription: [{ ...CATCHPLAY_PLUS, logoPath: null }],
          free: [],
          rent: [],
          buy: [],
        },
      },
    }
    setCatalog(logoLess)
    const wrapper = await renderPanel()

    expect(wrapper.text()).toContain('CATCHPLAY+')
    expect(providerAlts(wrapper)).not.toContain('CATCHPLAY+')
  })
})
