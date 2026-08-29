import type { VueWrapper } from '@vue/test-utils'
import type { Filters } from './my-list-filter.vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'
import MyListFilter from './my-list-filter.vue'

function defaultFilters(): Filters {
  return { kind: 'all', monetization: 'all', providerIds: [], sort: 'recent' }
}

async function render(initial?: Partial<Filters>, providers: Array<{ id: number, name: string, logoPath: string | null }> = []): Promise<VueWrapper<InstanceType<typeof MyListFilter>>> {
  const model = ref<Filters>({ ...defaultFilters(), ...initial })
  return await mountSuspended(MyListFilter, {
    route: '/my-list?probe=1',
    props: {
      'modelValue': model.value,
      'availableProviders': providers,
      'counts': {
        total: 24,
        byMonetization: { subscription: 10, buy: 4, rent: 3, free: 7 },
        byKind: { MOVIE: 14, TV_SHOW: 10 },
      },
      'onUpdate:modelValue': (next: Filters) => {
        model.value = next
      },
    },
  })
}

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('myListFilter', () => {
  it('renders collapsed by default and toggles detail on provider cluster click', async () => {
    const wrapper = await render(undefined, [
      { id: 8, name: 'Netflix', logoPath: '/netflix.jpg' },
    ])
    expect(wrapper.find('#my-list-filter-detail').exists()).toBe(false)

    const trigger = wrapper.find('button[aria-controls="my-list-filter-detail"]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.attributes('aria-expanded')).toBe('false')
    await trigger.trigger('click')

    expect(wrapper.find('#my-list-filter-detail').exists()).toBe(true)
    expect(trigger.attributes('aria-expanded')).toBe('true')
  })

  it('renders kind tabs with counts and emits the expected v-model shape when the kind segment changes', async () => {
    const wrapper = await render(undefined, [
      { id: 8, name: 'Netflix', logoPath: '/netflix.jpg' },
    ])
    // kind tab is on toolbar, not inside detail – no need to open
    const movieButton = wrapper.findAll('button[aria-pressed]').find(b => b.text().includes('電影'))
    expect(movieButton).toBeTruthy()
    // count should be visible e.g. 電影(14)
    expect(movieButton!.text()).toMatch(/電影/)
    expect(movieButton!.text()).toContain('(14)')
    await movieButton!.trigger('click')

    const events = wrapper.emitted('update:modelValue')
    expect(events).toBeTruthy()
    expect(events!.at(-1)![0]).toMatchObject({ kind: 'MOVIE' })
  })

  it('disables a monetization bucket when its count is zero', async () => {
    const model = ref<Filters>(defaultFilters())
    const wrapper = await mountSuspended(MyListFilter, {
      route: '/my-list?probe=zero',
      props: {
        'modelValue': model.value,
        'availableProviders': [],
        'counts': {
          total: 10,
          byMonetization: { subscription: 10, buy: 0, rent: 0, free: 0 },
          byKind: { MOVIE: 10, TV_SHOW: 0 },
        },
        'onUpdate:modelValue': (next: Filters) => {
          model.value = next
        },
      },
    })
    await wrapper.find('button[aria-controls="my-list-filter-detail"]').trigger('click')

    const buttons = wrapper.findAll('button[aria-pressed]')
    const buyRentButton = buttons.find(b => b.text().includes('購買／租借'))
    expect(buyRentButton).toBeTruthy()
    expect(buyRentButton!.attributes('disabled')).toBeDefined()
  })

  it('renders the provider logo strip when providers are supplied', async () => {
    const wrapper = await render(undefined, [
      { id: 8, name: 'Netflix', logoPath: '/netflix.jpg' },
      { id: 119, name: 'Amazon Prime Video', logoPath: '/prime.jpg' },
    ])
    await wrapper.find('button[aria-controls="my-list-filter-detail"]').trigger('click')

    // logo-only scroller: check via title attribute and img alt
    expect(wrapper.find('[title="Netflix"]').exists()).toBe(true)
    expect(wrapper.find('[title="Amazon Prime Video"]').exists()).toBe(true)
    // also img alt
    expect(wrapper.find('img[alt="Netflix"]').exists()).toBe(true)
    expect(wrapper.find('img[alt="Amazon Prime Video"]').exists()).toBe(true)
    // scroller provides horizontal scroll buttons
    expect(wrapper.find('[aria-label="Scroll providers left"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Scroll providers right"]').exists()).toBe(true)
  })

  it('applies muted state to unselected provider logos when a provider is active', async () => {
    const wrapper = await render({ providerIds: [8] }, [
      { id: 8, name: 'Netflix', logoPath: '/netflix.jpg' },
      { id: 119, name: 'Amazon Prime Video', logoPath: '/prime.jpg' },
    ])
    await wrapper.find('button[aria-controls="my-list-filter-detail"]').trigger('click')

    const netflixBtn = wrapper.find('[title="Netflix"]')
    const primeBtn = wrapper.find('[title="Amazon Prime Video"]')
    expect(netflixBtn.exists()).toBe(true)
    expect(primeBtn.exists()).toBe(true)
    // selected should be opaque, unselected muted with grayscale
    expect(netflixBtn.classes().join(' ')).not.toContain('grayscale')
    expect(primeBtn.classes().join(' ')).toContain('grayscale')
    expect(primeBtn.classes().join(' ')).toContain('opacity-40')
  })

  it('shows the clear affordance when any filter is active and emits a reset', async () => {
    const wrapper = await render({ kind: 'MOVIE' }, [
      { id: 8, name: 'Netflix', logoPath: '/netflix.jpg' },
    ])
    await wrapper.find('button[aria-controls="my-list-filter-detail"]').trigger('click')

    expect(wrapper.text()).toContain('清除篩選')

    const clearButton = wrapper.findAll('button').find(b => b.text().includes('清除篩選'))
    expect(clearButton).toBeTruthy()
    await clearButton!.trigger('click')

    const cleared = wrapper.emitted('update:modelValue')
    expect(cleared).toBeTruthy()
    const last = cleared!.at(-1)![0] as Filters
    expect(last.kind).toBe('all')
    expect(last.monetization).toBe('all')
    expect(last.providerIds).toEqual([])
    expect(wrapper.emitted('clear')).toBeTruthy()
  })
})
