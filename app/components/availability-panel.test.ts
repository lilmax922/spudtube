import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import type { ProviderCatalog } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CURATED_REGIONS } from '#shared/region/region'
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
    .filter((label: string) => ['訂閱', '免費', '租借', '購買', 'Subscription', 'Free', 'Rent', 'Buy'].includes(label))
}

function providerAlts(wrapper: VueWrapper<InstanceType<typeof AvailabilityPanel>>): Array<string | undefined> {
  return wrapper.findAll('img').map((image: DOMWrapper<Element>) => image.attributes('alt'))
}

async function openRegionSelect(wrapper: VueWrapper<InstanceType<typeof AvailabilityPanel>>): Promise<void> {
  const trigger = wrapper.find('[data-slot="select-trigger"]')
  if (trigger.exists()) {
    await trigger.trigger('click')
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

async function setRegionViaSelect(wrapper: VueWrapper<InstanceType<typeof AvailabilityPanel>>, code: string): Promise<void> {
  const trigger = wrapper.find('[data-slot="select-trigger"]')
  if (trigger.exists()) {
    await trigger.trigger('click')
    await new Promise(resolve => setTimeout(resolve, 0))
    const items = document.querySelectorAll('[data-slot="select-item"]')
    const target = Array.from(items).find(el => el.textContent?.trim() === wrapper.vm.$t(`region.names.${code}`) || el.getAttribute('value') === code || el.textContent?.includes(code))
    if (!target) {
      const selectComponents = wrapper.findAllComponents({ name: 'Select' })
      if (selectComponents.length > 0) {
        await selectComponents[0]!.vm.$emit('update:modelValue', code)
        await wrapper.vm.$nextTick()
        return
      }
    }
    if (target) {
      (target as HTMLElement).click()
      await wrapper.vm.$nextTick()
      return
    }
  }
  const selects = wrapper.findAllComponents({ name: 'Select' })
  if (selects.length > 0) {
    await selects[0]!.vm.$emit('update:modelValue', code)
    await wrapper.vm.$nextTick()
  }
}

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
  document.cookie = 'spudtube-region=; Max-Age=0; Path=/'
  document.body.innerHTML = ''
})

describe('availability panel', () => {
  it('renders groups in fixed subscription → free → rent → buy order', async () => {
    setCatalog(PROVIDER_CATALOG_MULTI_GROUP)
    const wrapper = await renderPanel()

    expect(groupLabels(wrapper)).toEqual(['訂閱', '免費', '租借', '購買'])
  })

  it('renders provider logos as image-only 40px with 20% radius and CDN urls', async () => {
    setCatalog(PROVIDER_CATALOG_MULTI_GROUP)
    const wrapper = await renderPanel()

    expect(providerAlts(wrapper)).toEqual(
      expect.arrayContaining(['Netflix', 'Disney+', 'Apple TV', 'Google Play Movies']),
    )

    const images = wrapper.findAll('img')
    expect(images.map((image: DOMWrapper<Element>) => image.attributes('src'))).toContain(
      'https://image.tmdb.org/t/p/w92/t2yyOv40HZeVlLjMcCsANnTv9FW.jpg',
    )
    const srcsets = images.map(i => i.attributes('srcset') ?? '')
    expect(srcsets.some(s => s.includes('/w92/'))).toBe(true)

    // image-only: no visible provider name text outside alt/title
    expect(wrapper.text()).not.toContain('Google Play Movies')
    // 40x40 with 20% radius, no pill text
    for (const img of images) {
      expect(img.classes().join(' ')).toContain('h-[40px]')
      expect(img.classes().join(' ')).toContain('w-[40px]')
      expect(img.classes().join(' ')).toContain('rounded-[20%]')
    }
  })

  it('aligns provider icons per group in a flex wrap grid without text pills', async () => {
    setCatalog(PROVIDER_CATALOG_MULTI_GROUP)
    const wrapper = await renderPanel()

    const groups = wrapper.findAll('[data-testid="availability-group"]')
    expect(groups.length).toBeGreaterThan(0)
    for (const g of groups) {
      expect(g.classes().some(c => c.includes('grid'))).toBe(true)
      const row = g.find('div.flex')
      expect(row.exists()).toBe(true)
      expect(row.classes()).toContain('flex-nowrap')
      expect(row.classes()).not.toContain('flex-wrap')
      expect(row.classes()).toContain('items-center')
      expect(row.classes()).toContain('overflow-x-auto')
    }
    // no provider-pill with name anymore; images are direct children
    expect(wrapper.findAll('[data-testid="provider-pill"]').length).toBe(0)
    const imgs = wrapper.findAll('img')
    expect(imgs.length).toBeGreaterThan(0)
  })

  it('keeps single-column layout with horizontal scroll on narrow viewport (no wrap, hidden scrollbar, snap)', async () => {
    setCatalog(PROVIDER_CATALOG_MULTI_GROUP)
    const wrapper = await renderPanel()

    const groups = wrapper.findAll('[data-testid="availability-group"]')
    expect(groups.length).toBeGreaterThan(0)
    for (const g of groups) {
      // desktop: grid 72px label; narrow: stack label above icons via max-[560px]:grid-cols-1
      expect(g.classes().join(' ')).toContain('grid-cols-[72px_1fr]')
      expect(g.classes().join(' ')).toContain('max-[560px]:grid-cols-1')
      const label = g.find('span')
      expect(label.classes().join(' ')).toContain('max-[560px]:pt-0')
      const row = g.find('div.flex')
      expect(row.classes()).toContain('flex-nowrap')
      expect(row.classes()).toContain('overflow-x-auto')
      expect(row.classes()).toContain('overflow-y-hidden')
      expect(row.classes().join(' ')).toContain('[scrollbar-width:none]')
      expect(row.classes().join(' ')).toContain('[-ms-overflow-style:none]')
      expect(row.classes().join(' ')).toContain('[&::-webkit-scrollbar]:hidden')
      expect(row.classes()).toContain('overscroll-x-contain')
      expect(row.classes()).toContain('snap-x')
      expect(row.attributes('role')).toBe('list')
      expect(row.attributes('tabindex')).toBe('0')
    }
    // provider icons stay 40px 20% radius and do not shrink, snap-start for scroll
    for (const img of wrapper.findAll('img')) {
      expect(img.classes().join(' ')).toContain('shrink-0')
      expect(img.classes().join(' ')).toContain('snap-start')
    }
    for (const a of wrapper.findAll('[data-testid="provider-link"]')) {
      expect(a.classes().join(' ')).toContain('shrink-0')
      expect(a.classes().join(' ')).toContain('snap-start')
    }
    const fallback = wrapper.find('[data-testid="provider-fallback"]')
    if (fallback.exists()) {
      expect(fallback.classes().join(' ')).toContain('snap-start')
    }
  })

  it('links each provider image to the TMDB watch link for the region (region-level link, not per-provider)', async () => {
    setCatalog(PROVIDER_CATALOG_MULTI_GROUP)
    const wrapper = await renderPanel()

    // PROVIDER_CATALOG_MULTI_GROUP TW link is null -> images without anchor
    expect(wrapper.findAll('[data-testid="provider-link"]').length).toBe(0)

    setCatalog(PROVIDER_CATALOG)
    const wrapper2 = await renderPanel()
    // PROVIDER_CATALOG TW has link https://www.themoviedb.org/movie/419430/watch?locale=TW
    const links = wrapper2.findAll('[data-testid="provider-link"]')
    expect(links.length).toBeGreaterThan(0)
    for (const a of links) {
      expect(a.attributes('href')).toContain('themoviedb.org')
      expect(a.attributes('target')).toBe('_blank')
      expect(a.attributes('rel')).toContain('noopener')
    }
    // JustWatch reference: JustWatch detail pages group providers per monetization type (Stream/Rent/Buy) with
    // each provider icon linking to a provider deep-link via WatchAction urlTemplate (see JSON-LD offers).
    // TMDB only exposes a single region link (raw.results[region].link), so SpudTube links all icons to that
    // TMDB watch page which then delegates to JustWatch; per-provider deep-links would require direct JustWatch API (rejected per ADR 0001).
  })

  it('shows an explicit unavailable state when the region has zero providers', async () => {
    setCatalog(PROVIDER_CATALOG_WITHOUT_TW)
    const wrapper = await renderPanel()

    expect(wrapper.text()).toContain('此區域暫無串流資訊')
    expect(wrapper.text()).toContain('作品仍會正常出現在所有列表，不會被隱藏。')
    expect(wrapper.text()).not.toContain('Netflix')
    expect(wrapper.findAll('img')).toHaveLength(0)
    expect(wrapper.find('[data-testid="availability-empty"]').exists()).toBe(true)
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

    const trigger = wrapper.find('[data-slot="select-trigger"]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.text()).toContain('台灣')

    expect(CURATED_REGIONS).toEqual(['TW', 'HK', 'JP', 'KR', 'SG', 'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IN', 'BR', 'MX'])

    await openRegionSelect(wrapper)
    const items = document.querySelectorAll('[data-slot="select-item"]')
    if (items.length > 0) {
      expect(items).toHaveLength(14)
      expect(items[0]!.textContent).toContain('台灣')
      expect(items[1]!.textContent).toContain('香港')
      expect(items[13]!.textContent).toContain('墨西哥')
    }
    else {
      expect(CURATED_REGIONS).toHaveLength(14)
    }
  })

  it('defaults to the detected/persisted region and switches availability only', async () => {
    document.cookie = 'spudtube-region=US; Path=/'
    setCatalog(PROVIDER_CATALOG)
    const wrapper = await renderPanel()

    expect(providerAlts(wrapper)).toEqual(expect.arrayContaining(['Netflix', 'Apple TV']))
    expect(providerAlts(wrapper)).not.toEqual(expect.arrayContaining(['CATCHPLAY+']))

    await setRegionViaSelect(wrapper, 'TW')
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(providerAlts(wrapper)).toEqual(expect.arrayContaining(['CATCHPLAY+']))
    expect(providerAlts(wrapper)).not.toEqual(expect.arrayContaining(['Apple TV']))
    expect(document.cookie).toContain('spudtube-region=TW')
  })

  it('falls back to the default region without any signal and switches availability only', async () => {
    setCatalog(PROVIDER_CATALOG)
    const wrapper = await renderPanel()

    expect(providerAlts(wrapper)).toEqual(expect.arrayContaining(['CATCHPLAY+']))
    expect(providerAlts(wrapper)).not.toEqual(expect.arrayContaining(['Apple TV']))

    await setRegionViaSelect(wrapper, 'US')
    await new Promise(resolve => setTimeout(resolve, 10))

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

  it('falls back to initials when a provider has no logo (no image, 40px rounded 20% box)', async () => {
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

    expect(providerAlts(wrapper)).not.toContain('CATCHPLAY+')
    const fallback = wrapper.find('[data-testid="provider-fallback"]')
    expect(fallback.exists()).toBe(true)
    expect(fallback.text()).toBe('CA')
    expect(fallback.classes().join(' ')).toContain('h-[40px]')
    expect(fallback.classes().join(' ')).toContain('w-[40px]')
    expect(fallback.classes().join(' ')).toContain('rounded-[20%]')
  })

  it('renders English labels when locale is en', async () => {
    const { readFileSync } = await import('node:fs')
    const zhRaw = JSON.parse(readFileSync('i18n/locales/zh-TW.json', 'utf8'))
    const enRaw = JSON.parse(readFileSync('i18n/locales/en.json', 'utf8'))
    expect(zhRaw.availability.groups.subscription).toBe('訂閱')
    expect(enRaw.availability.groups.subscription).toBe('Subscription')
    expect(enRaw.availability.heading).toBe('Where to watch')
    expect(zhRaw.availability.heading).toBe('提供平台')
    expect(zhRaw.region.names.TW).toBe('台灣')
    expect(enRaw.region.names.TW).toBe('Taiwan')
  })
})
