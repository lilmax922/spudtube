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
    // Popover trigger should be shadcn primitive (data-slot) and not rely on manual open logic
    const vueFile = await import('node:fs').then(fs => fs.readFileSync(`${process.cwd()}/app/components/home-filter-bar.vue`, 'utf-8'))
    expect(vueFile).toMatch(/PopoverTrigger/)
  })

  it('expands the provider logo scroller when the cluster button is clicked', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, { props: props() })
    mounted.push(wrapper)

    const trigger = wrapper.find('button[aria-controls="home-filter-bar-detail"]')
    await trigger.trigger('click')
    await wrapper.vm.$nextTick()

    // PopoverContent is teleported to body via reka-ui PopoverPortal — check document
    const detail = document.getElementById('home-filter-bar-detail')
      ?? document.querySelector('[data-slot="popover-content"]')
    expect(detail).toBeTruthy()
    // Radix/reka adds data-state attributes on trigger/content
    expect(document.body.innerHTML).toMatch(/popover-content|data-radix|data-slot="popover"/i)

    const root = document.body as unknown as HTMLElement
    // logos render inside teleported content or inline cluster
    expect(root.querySelector('[title="Netflix"]') ?? wrapper.element.querySelector('[title="Netflix"]')).toBeTruthy()
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
    await wrapper.vm.$nextTick()
    // content is teleported — query document body fallback
    const netflixBtn = document.querySelector('[title="Netflix"]') as HTMLElement | null
      ?? wrapper.find('[title="Netflix"]').element as unknown as HTMLElement
    expect(netflixBtn).toBeTruthy()
    ;(netflixBtn as HTMLElement).click()

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

  it('keeps genre chips in a single scroll row (no wrap bulk)', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const vueFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/home-filter-bar.vue'), 'utf-8')
    // bulk came from flex-wrap; compact uses nowrap + overflow-x-auto + hidden scrollbar
    expect(vueFile).toMatch(/overflow-x-auto/)
    expect(vueFile).toMatch(/scrollbar-width:\s*none/)
    // should not rely on flex-wrap for genre layout to create 2-3 rows
    const genreSection = vueFile.slice(vueFile.indexOf('homeFilterBarGenres'))
    expect(genreSection).not.toMatch(/flex-wrap/)
  })

  it('renders provider filter as anchored popover (no layout shift)', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const vueFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/home-filter-bar.vue'), 'utf-8')
    // popover should be overlay via shadcn Popover primitives, not a full-width bar that pushes grid
    expect(vueFile).toMatch(/Popover/)
    expect(vueFile).toMatch(/PopoverContent/)
    expect(vueFile).toMatch(/from\s+['"]@\/components\/ui\/popover['"]/)
    expect(vueFile).toMatch(/bg-popover|background:\s*var\(--popover\)/)
  })

  it('uses shadcn Popover primitives from ui/popover instead of hand-rolled absolute + onClickOutside', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const vueFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/home-filter-bar.vue'), 'utf-8')
    expect(vueFile).toMatch(/from\s+['"]@\/components\/ui\/popover['"]/)
    expect(vueFile).toMatch(/<Popover/)
    expect(vueFile).toMatch(/<PopoverTrigger/)
    expect(vueFile).toMatch(/<PopoverContent/)
    expect(vueFile).not.toMatch(/onClickOutside/)
    expect(vueFile).not.toMatch(/AnimatePresence/)
  })

  it('shows active genre count on the toolbar when genres are selected', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, {
      props: props({ selectedGenreIds: [28, 878] }),
    })
    mounted.push(wrapper)

    const root = wrapper.element as HTMLElement
    // genre trigger or badge should reflect 2 selected
    expect(root.textContent).toMatch(/2/)
  })

  it('keeps the toolbar on a single line without wrapping to 2-3 rows', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const vueFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/home-filter-bar.vue'), 'utf-8')
    // inner toolbar should not wrap into multiple rows; genres flex and scroll instead
    expect(vueFile).not.toMatch(/\.homeFilterBarInner\s*\{[^}]*flex-wrap:\s*wrap/)
  })

  it('shows a provider search input inside the popover', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, { props: props() })
    mounted.push(wrapper)
    await wrapper.find('button[aria-controls="home-filter-bar-detail"]').trigger('click')
    await wrapper.vm.$nextTick()
    const input = (document.querySelector('input[type="search"]') ?? wrapper.element.querySelector('input[type="search"]')) as HTMLInputElement | null
    expect(input).toBeTruthy()
    expect(input?.placeholder).toMatch(/Search providers|搜尋平台/)
  })

  it('emits searchProviders when typing in the provider search input', async () => {
    const wrapper = await mountSuspended(HomeFilterBar, { props: props() })
    mounted.push(wrapper)
    await wrapper.find('button[aria-controls="home-filter-bar-detail"]').trigger('click')
    await wrapper.vm.$nextTick()
    const inputEl = (document.querySelector('input[type="search"]') ?? wrapper.element.querySelector('input[type="search"]')) as HTMLInputElement | null
    expect(inputEl).toBeTruthy()
    inputEl!.value = 'net'
    inputEl!.dispatchEvent(new Event('input', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('searchProviders')?.at(-1)?.[0]).toBe('net')
  })

  it('renders popular providers by default instead of the full 805 list', async () => {
    const popular = [{ id: 8, name: 'Netflix', logoPath: '/netflix.jpg' }]
    const full = [
      { id: 8, name: 'Netflix', logoPath: '/netflix.jpg' },
      { id: 119, name: 'Amazon Prime Video', logoPath: '/prime.jpg' },
      { id: 337, name: 'Disney Plus', logoPath: '/disney.jpg' },
    ]
    const wrapper = await mountSuspended(HomeFilterBar, {
      props: props({ availableProviders: full, popularProviders: popular }),
    })
    mounted.push(wrapper)
    await wrapper.find('button[aria-controls="home-filter-bar-detail"]').trigger('click')
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 0))
    // PopoverContent is teleported to body via reka-ui portal
    const bodyRoot = document.body as unknown as HTMLElement
    expect(bodyRoot.querySelector('[title="Netflix"]')).toBeTruthy()
    expect(bodyRoot.querySelector('[title="Amazon Prime Video"]')).toBeFalsy()
  })

  it('renders search results dynamically when providerSearchResults are provided', async () => {
    const popular = [{ id: 8, name: 'Netflix', logoPath: '/netflix.jpg' }]
    const results = [{ id: 119, name: 'Amazon Prime Video', logoPath: '/prime.jpg' }]
    const wrapper = await mountSuspended(HomeFilterBar, {
      props: props({
        availableProviders: popular,
        popularProviders: popular,
        providerSearchResults: results,
      }),
    })
    mounted.push(wrapper)
    await wrapper.find('button[aria-controls="home-filter-bar-detail"]').trigger('click')
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 0))
    // simulate user typing so component switches to search mode
    const inputEl = (document.querySelector('input[type="search"]') ?? wrapper.element.querySelector('input[type="search"]')) as HTMLInputElement | null
    expect(inputEl).toBeTruthy()
    inputEl!.value = 'prime'
    inputEl!.dispatchEvent(new Event('input', { bubbles: true }))
    await wrapper.vm.$nextTick()
    // swap in results
    await wrapper.setProps({ providerSearchResults: results } as never)
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 0))
    const bodyRoot = document.body as unknown as HTMLElement
    expect(bodyRoot.querySelector('[title="Amazon Prime Video"]')).toBeTruthy()
  })

  it('shows an empty state when provider search returns no results', async () => {
    const popular = [{ id: 8, name: 'Netflix', logoPath: '/netflix.jpg' }]
    const wrapper = await mountSuspended(HomeFilterBar, {
      props: props({
        availableProviders: popular,
        popularProviders: popular,
        providerSearchResults: [],
      }),
    })
    mounted.push(wrapper)
    await wrapper.find('button[aria-controls="home-filter-bar-detail"]').trigger('click')
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 50))
    const inputEl = document.querySelector('input[type="search"]') as HTMLInputElement | null
    expect(inputEl).toBeTruthy()
    // use Vue Test Utils setValue to properly trigger v-model
    const inputWrapper = wrapper.find('input[type="search"]')
    // teleported input lives in document, not wrapper — set via direct DOM then dispatch
    inputEl!.focus()
    inputEl!.value = 'zzz'
    inputEl!.dispatchEvent(new Event('input', { bubbles: true }))
    // also trigger Vue's v-model update via wrapper if available
    if (inputWrapper.exists())
      await inputWrapper.setValue('zzz')
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 50))
    const detailEl = document.querySelector('[data-testid="home-filter-bar-detail"]') as HTMLElement | null
      ?? document.getElementById('home-filter-bar-detail') as HTMLElement | null
      ?? document.querySelector('[data-slot="popover-content"]') as HTMLElement | null
    expect(detailEl).toBeTruthy()
    expect(detailEl!.textContent).toMatch(/No providers found|找不到相符平台/)
  })
})
