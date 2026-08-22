import type { TitleSummary } from '#server/tmdb/types'
import { mount } from '@vue/test-utils'
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

describe('title-card', () => {
  it('renders the localized name and release year', () => {
    const wrapper = mount(TitleCard, { props: { title: baseTitle } })

    expect(wrapper.text()).toContain('沙丘')
    expect(wrapper.text()).toContain('2021')
  })

  it('renders the poster from the TMDB image CDN when artwork exists', () => {
    const wrapper = mount(TitleCard, { props: { title: baseTitle } })

    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(
      'https://image.tmdb.org/t/p/w500/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
    )
    expect(img.attributes('alt')).toBe('沙丘')
  })

  it('degrades gracefully to a placeholder when artwork is missing', () => {
    const wrapper = mount(TitleCard, {
      props: { title: { ...baseTitle, posterPath: null } },
    })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.text()).toContain('沙丘')
  })

  it('degrades to the placeholder when the poster fails to load', async () => {
    const wrapper = mount(TitleCard, { props: { title: baseTitle } })

    await wrapper.find('img').trigger('error')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
