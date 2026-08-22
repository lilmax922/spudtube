import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import SearchField from './search-field.vue'

describe('search-field', () => {
  it('renders an input with the search placeholder', async () => {
    const wrapper = await mountSuspended(SearchField, { props: { query: '' } })

    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('placeholder')).toBe('Search movies and TV shows')
  })

  it('emits update:query as the user types', async () => {
    const wrapper = await mountSuspended(SearchField, { props: { query: '' } })

    await wrapper.find('input').setValue('dune')
    expect(wrapper.emitted('update:query')).toEqual([['dune']])
  })

  it('emits search when the form is submitted', async () => {
    const wrapper = await mountSuspended(SearchField, { props: { query: 'dune' } })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('search')).toHaveLength(1)
  })

  it('reveals a clear button once a query is present and emits clear', async () => {
    const wrapper = await mountSuspended(SearchField, { props: { query: '' } })
    expect(wrapper.find('button').exists()).toBe(false)

    await wrapper.setProps({ query: 'dune' })
    const clear = wrapper.find('button')
    expect(clear.exists()).toBe(true)

    await clear.trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })
})
