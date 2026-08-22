import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import KindToggle from './kind-toggle.vue'

describe('kind-toggle', () => {
  it('renders both kinds with localized labels', async () => {
    const wrapper = await mountSuspended(KindToggle, { props: { modelValue: 'MOVIE' } })

    const labels = wrapper.findAll('button').map(button => button.text())
    expect(labels).toEqual(['Movies', 'TV Shows'])
  })

  it('marks the active kind with aria-pressed', async () => {
    const wrapper = await mountSuspended(KindToggle, { props: { modelValue: 'TV_SHOW' } })

    const buttons = wrapper.findAll('button')
    expect(buttons[0]!.attributes('aria-pressed')).toBe('false')
    expect(buttons[1]!.attributes('aria-pressed')).toBe('true')
  })

  it('emits the newly selected kind on click', async () => {
    const wrapper = await mountSuspended(KindToggle, { props: { modelValue: 'MOVIE' } })

    await wrapper.findAll('button')[1]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['TV_SHOW']])
  })
})
