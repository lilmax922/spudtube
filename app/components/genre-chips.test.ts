import type { Genre } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import GenreChips from './genre-chips.vue'

const genres: Genre[] = [
  { id: 28, name: '動作' },
  { id: 878, name: '科幻' },
  { id: 35, name: '喜劇' },
]

describe('genre-chips', () => {
  it('renders a chip per genre', async () => {
    const wrapper = await mountSuspended(GenreChips, {
      props: { genres, modelValue: [] },
    })

    const labels = wrapper.findAll('button').map(button => button.text())
    expect(labels).toEqual(['動作', '科幻', '喜劇'])
  })

  it('marks selected genres with aria-pressed', async () => {
    const wrapper = await mountSuspended(GenreChips, {
      props: { genres, modelValue: [878] },
    })

    const pressed = wrapper
      .findAll('button')
      .map(button => button.attributes('aria-pressed'))
    expect(pressed).toEqual(['false', 'true', 'false'])
  })

  it('emits toggle with the genre id on click', async () => {
    const wrapper = await mountSuspended(GenreChips, {
      props: { genres, modelValue: [] },
    })

    await wrapper.findAll('button')[2]!.trigger('click')

    expect(wrapper.emitted('toggle')).toEqual([[35]])
  })
})
