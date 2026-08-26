import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import SearchOverlay from './search-overlay.vue'

const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateTo)

vi.mock('../composables/use-keyword-search', () => ({
  useKeywordSearch: () => ({
    query: shallowRef(''),
    searchedQuery: shallowRef(''),
    items: shallowRef([]),
    page: shallowRef(0),
    totalPages: shallowRef(0),
    loading: shallowRef(false),
    loadingMore: shallowRef(false),
    error: shallowRef(false),
    hasMore: shallowRef(false),
    search: vi.fn(),
    loadMore: vi.fn(),
    clear: vi.fn(),
  }),
}))

describe('search-overlay', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  it('hides the dialog when closed and shows it when open', async () => {
    const hidden = await mountSuspended(SearchOverlay, { props: { query: '', open: false } })
    expect(hidden.find('[role="dialog"]').exists()).toBe(false)

    const shown = await mountSuspended(SearchOverlay, { props: { query: '', open: true } })
    expect(shown.find('[role="dialog"]').exists()).toBe(true)
    expect(shown.find('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(shown.find('input').attributes('placeholder')).toBe('Search movies and TV shows')
  })

  it('emits update:query as the user types inside the overlay', async () => {
    const wrapper = await mountSuspended(SearchOverlay, { props: { query: '', open: true } })
    await wrapper.find('input').setValue('dune')
    expect(wrapper.emitted('update:query')).toEqual([['dune']])
  })

  it('navigates to /search and closes on submit with a query (Enter)', async () => {
    navigateTo.mockClear()
    const wrapper = await mountSuspended(SearchOverlay, { props: { query: 'dune', open: true } })
    await wrapper.find('form').trigger('submit')
    expect(navigateTo).toHaveBeenCalledWith({ path: '/search', query: { q: 'dune' } })
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('search')).toBeUndefined()
  })

  it('emits clear when the inner clear button is pressed', async () => {
    const wrapper = await mountSuspended(SearchOverlay, { props: { query: 'dune', open: true } })
    const clear = wrapper.find('button[aria-label="Clear search"]')
    expect(clear.exists()).toBe(true)
    await clear.trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('respects clearable to keep the clear button even with an empty query', async () => {
    const wrapper = await mountSuspended(SearchOverlay, { props: { query: '', open: true, clearable: true } })
    expect(wrapper.find('button[aria-label="Clear search"]').exists()).toBe(true)

    const without = await mountSuspended(SearchOverlay, { props: { query: '', open: true, clearable: false } })
    expect(without.find('button[aria-label="Clear search"]').exists()).toBe(false)
  })

  it('emits close when the close button is pressed', async () => {
    const wrapper = await mountSuspended(SearchOverlay, { props: { query: '', open: true } })
    await wrapper.find('button[aria-label="Close search"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when the backdrop is clicked', async () => {
    const wrapper = await mountSuspended(SearchOverlay, { props: { query: '', open: true } })
    await wrapper.find('[role="presentation"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close on Escape key without trapping', async () => {
    const wrapper = await mountSuspended(SearchOverlay, { props: { query: '', open: true } })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('applies popover surface with border and shadow per Contract and input md shape', async () => {
    const wrapper = await mountSuspended(SearchOverlay, { props: { query: '', open: true } })
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.classes().join(' ')).toContain('bg-popover')
    expect(dialog.classes().join(' ')).toContain('border')
    expect(dialog.classes().join(' ')).toContain('shadow-')
    const form = wrapper.find('form')
    expect(form.classes().join(' ')).toContain('rounded-md')
    expect(form.classes().join(' ')).toContain('bg-card')
    expect(form.classes().join(' ')).toContain('border-input')
  })

  it('does not highlight any item on open even when recents exist', async () => {
    localStorage.setItem('spudtube:recent', JSON.stringify(['dune', 'toy story']))
    const wrapper = await mountSuspended(SearchOverlay, { props: { query: '', open: true } })
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(wrapper.find('.recentItem').exists()).toBe(true)
    expect(wrapper.findAll('[data-highlighted]')).toHaveLength(0)
  })

  it('highlights the first recent when the user presses ArrowDown', async () => {
    localStorage.setItem('spudtube:recent', JSON.stringify(['dune', 'toy story']))
    const wrapper = await mountSuspended(SearchOverlay, { props: { query: '', open: true } })
    await new Promise(resolve => setTimeout(resolve, 50))
    await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' })
    await new Promise(resolve => setTimeout(resolve, 50))
    const highlighted = wrapper.findAll('[data-highlighted]')
    expect(highlighted).toHaveLength(1)
    expect(highlighted[0]?.text()).toContain('dune')
  })
})
