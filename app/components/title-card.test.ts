import type { TitleSummary } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import TitleCard from './title-card.vue'

const baseTitle: TitleSummary = {
  kind: 'MOVIE',
  tmdbId: 419430,
  name: '沙丘',
  posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
  backdropPath: null,
  releaseDate: '2021-10-22',
  voteAverage: 7.8,
}

async function render(title: TitleSummary = baseTitle) {
  return await mountSuspended(TitleCard, { route: '/?probe=1', props: { title } })
}

describe('title-card', () => {
  it('links the card to its own title detail page', async () => {
    const wrapper = await render()

    expect(wrapper.find('a').attributes('href')).toBe('/movie/419430')
  })

  it('renders the localized name and release year', async () => {
    const wrapper = await render()

    expect(wrapper.text()).toContain('沙丘')
    expect(wrapper.text()).toContain('2021')
  })

  it('renders the poster from the TMDB image CDN when artwork exists', async () => {
    const wrapper = await render()

    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(
      'https://image.tmdb.org/t/p/w500/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
    )
    expect(img.attributes('alt')).toBe('沙丘')
  })

  it('degrades gracefully to a placeholder when artwork is missing', async () => {
    const wrapper = await render({ ...baseTitle, posterPath: null })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.text()).toContain('沙丘')
  })

  it('degrades to the placeholder when the poster fails to load', async () => {
    const wrapper = await render()

    await wrapper.find('img').trigger('error')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
