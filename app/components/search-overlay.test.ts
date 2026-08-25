import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import SearchOverlay from './search-overlay.vue'

describe('search-overlay', () => {
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

  it('emits search when the inner form is submitted', async () => {
    const wrapper = await mountSuspended(SearchOverlay, { props: { query: 'dune', open: true } })
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('search')).toHaveLength(1)
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
})
