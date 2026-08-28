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
      'counts': { total: 24, byMonetization: { subscription: 10, buy: 4, rent: 3, free: 7 } },
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
  it('renders collapsed by default and toggles detail on filter button click', async () => {
    const wrapper = await render()
    expect(wrapper.find('#my-list-filter-detail').exists()).toBe(false)

    const trigger = wrapper.find('button[aria-controls="my-list-filter-detail"]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.attributes('aria-expanded')).toBe('false')
    await trigger.trigger('click')

    expect(wrapper.find('#my-list-filter-detail').exists()).toBe(true)
    expect(trigger.attributes('aria-expanded')).toBe('true')
  })

  it('emits the expected v-model shape when the kind segment changes', async () => {
    const wrapper = await render()
    await wrapper.find('button[aria-controls="my-list-filter-detail"]').trigger('click')

    const movieButton = wrapper.findAll('button[aria-pressed]').find(b => b.text().includes('電影'))
    expect(movieButton).toBeTruthy()
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
        'counts': { total: 10, byMonetization: { subscription: 10, buy: 0, rent: 0, free: 0 } },
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

  it('renders the provider chip strip when providers are supplied', async () => {
    const wrapper = await render(undefined, [
      { id: 8, name: 'Netflix', logoPath: '/netflix.jpg' },
      { id: 119, name: 'Amazon Prime Video', logoPath: '/prime.jpg' },
    ])
    await wrapper.find('button[aria-controls="my-list-filter-detail"]').trigger('click')

    expect(wrapper.text()).toContain('Netflix')
    expect(wrapper.text()).toContain('Amazon Prime Video')
  })

  it('shows the clear affordance when any filter is active and emits a reset', async () => {
    const wrapper = await render({ kind: 'MOVIE' })
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
