import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import HomeFilterBar from './home-filter-bar.vue'

const sampleGenres = [
  { id: 28, name: 'Action' },
  { id: 878, name: 'Sci-Fi' },
]

const sampleProviders = [
  { id: 8, name: 'Netflix', logoPath: '/netflix.jpg' },
  { id: 119, name: 'Amazon Prime Video', logoPath: '/prime.jpg' },
]

function props(overrides: Partial<InstanceType<typeof HomeFilterBar>['$props']> = {}) {
  return {
    selectedGenreIds: [],
    minRating: null,
    selectedProviderIds: [],
    genres: sampleGenres,
    availableProviders: sampleProviders,
    ...overrides,
  }
}

const mounted: VueWrapper[] = []

beforeEach(() => {
  document.cookie = 'spudtube-locale=en; Path=/'
})

afterEach(() => {
  for (const w of mounted.splice(0))
    w.unmount()
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('homeFilterBar', () => {
  it('renders the rating chips with the All / 7+ / 8+ labels', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, { props: props() })
    mounted.push(wrapper)

    const root = wrapper.element as HTMLElement
    const chips = [...root.querySelectorAll('[aria-pressed]')]
      .filter(el => el.textContent?.match(/All|7\+|8\+/))
    expect(chips.length).toBeGreaterThanOrEqual(3)
    expect(chips.some(c => c.textContent?.includes('All'))).toBe(true)
    expect(chips.some(c => c.textContent?.includes('7+'))).toBe(true)
    expect(chips.some(c => c.textContent?.includes('8+'))).toBe(true)
  })

  it('does not render the Kind toggle (header owns it)', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, { props: props() })
    mounted.push(wrapper)

    const root = wrapper.element as HTMLElement
    expect(root.textContent).not.toContain('Movies')
    expect(root.textContent).not.toContain('TV Shows')
  })

  it('emits setMinRating with 7 when the 7+ chip is clicked', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, { props: props() })
    mounted.push(wrapper)

    const root = wrapper.element as HTMLElement
    const sevenPlus = [...root.querySelectorAll('button')]
      .find(b => b.textContent?.includes('7+')) as HTMLButtonElement | undefined
    expect(sevenPlus).toBeTruthy()
    sevenPlus!.click()

    expect(wrapper.emitted('setMinRating')?.at(-1)?.[0]).toBe(7)
  })

  it('clears the rating filter when the active chip is clicked again', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, { props: props({ minRating: 7 }) })
    mounted.push(wrapper)

    const root = wrapper.element as HTMLElement
    const sevenPlus = [...root.querySelectorAll('button')]
      .find(b => b.textContent?.includes('7+')) as HTMLButtonElement | undefined
    sevenPlus!.click()

    expect(wrapper.emitted('setMinRating')?.at(-1)?.[0]).toBeNull()
  })

  it('renders the provider cluster button with a logo stack', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, { props: props() })
    mounted.push(wrapper)

    const trigger = wrapper.find('button[aria-controls="home-filter-bar-detail"]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.attributes('aria-expanded')).toBe('false')

    const root = wrapper.element as HTMLElement
    expect(root.querySelector('img[alt="Netflix"]')).toBeTruthy()
    expect(root.querySelector('img[alt="Amazon Prime Video"]')).toBeTruthy()
  })

  it('expands the provider logo scroller when the cluster button is clicked', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, { props: props() })
    mounted.push(wrapper)

    const trigger = wrapper.find('button[aria-controls="home-filter-bar-detail"]')
    await trigger.trigger('click')

    expect(wrapper.find('#home-filter-bar-detail').exists()).toBe(true)
    expect(trigger.attributes('aria-expanded')).toBe('true')

    const root = wrapper.element as HTMLElement
    expect(root.querySelector('img[alt="Netflix"]')).toBeTruthy()
    expect(root.querySelector('[title="Netflix"]')).toBeTruthy()
  })

  it('hides the provider cluster button when no providers are available', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, {
      props: props({ availableProviders: [] }),
    })
    mounted.push(wrapper)

    const trigger = wrapper.find('button[aria-controls="home-filter-bar-detail"]')
    expect(trigger.exists()).toBe(false)
  })

  it('emits toggleProvider when a provider logo is clicked', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, { props: props() })
    mounted.push(wrapper)

    await wrapper.find('button[aria-controls="home-filter-bar-detail"]').trigger('click')
    const netflixBtn = wrapper.find('[title="Netflix"]')
    expect(netflixBtn.exists()).toBe(true)
    await netflixBtn.trigger('click')

    expect(wrapper.emitted('toggleProvider')?.at(-1)?.[0]).toBe(8)
  })

  it('shows a provider count badge when providers are selected', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, {
      props: props({ selectedProviderIds: [8, 119] }),
    })
    mounted.push(wrapper)

    const trigger = wrapper.find('button[aria-controls="home-filter-bar-detail"]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.text()).toContain('2')
  })

  it('emits clearFilters when the clear-all affordance is clicked', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, {
      props: props({ selectedGenreIds: [28] }),
    })
    mounted.push(wrapper)

    const root = wrapper.element as HTMLElement
    const clearAll = [...root.querySelectorAll('button')]
      .find(b => b.textContent?.includes('Clear all')) as HTMLButtonElement | undefined
    expect(clearAll).toBeTruthy()
    clearAll!.click()

    expect(wrapper.emitted('clearFilters')).toBeTruthy()
  })

  it('hides clear-all when no filters are active', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, { props: props() })
    mounted.push(wrapper)

    const root = wrapper.element as HTMLElement
    const clearAll = [...root.querySelectorAll('button')]
      .find(b => b.textContent?.includes('Clear all'))
    expect(clearAll).toBeUndefined()
  })

  it('is sticky below header (like #filterBar prototype), not JS fixed at half-hero', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const vueFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/home-filter-bar.vue'), 'utf-8')
    expect(vueFile).toMatch(/position:\s*sticky/)
    expect(vueFile).toMatch(/top:\s*var\(--header-h\)/)
    expect(vueFile).not.toMatch(/\.homeFilterBar\.pinned/)
    expect(vueFile).not.toMatch(/position:\s*fixed/)
    // also ensure no pinned prop remains
    expect(vueFile).not.toMatch(/pinned:\s*boolean/)
  })

  it('does not rely on JS scroll threshold at 320 (prototype uses CSS sticky)', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const browseFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/browse-grid.vue'), 'utf-8')
    expect(browseFile).not.toMatch(/y\s*>\s*320/)
    expect(browseFile).not.toMatch(/isPinned/)
    expect(browseFile).not.toMatch(/onScroll/)
  })

  it('emits toggleGenre when a genre chip is clicked', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, { props: props() })
    mounted.push(wrapper)

    const sciFi = wrapper.findAll('button').find(b => b.text()?.includes('Sci-Fi'))
    expect(sciFi).toBeTruthy()
    await sciFi!.trigger('click')

    expect(wrapper.emitted('toggleGenre')?.at(-1)?.[0]).toBe(878)
  })
})
