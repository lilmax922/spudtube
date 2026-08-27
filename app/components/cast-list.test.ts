import type { CastMember } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import CastList from './cast-list.vue'

const CAST: CastMember[] = [
  { id: 1, name: 'Timothée Chalamet', character: 'Paul Atreides', profilePath: '/BE2sdjpgsa2rNTFa66f7upkaxuI.jpg' },
  { id: 2, name: 'Rebecca Ferguson', character: null, profilePath: null },
]

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('cast list', () => {
  it('renders cast members with name, character and avatar URL', async () => {
    const wrapper = await mountSuspended(CastList, { route: '/?probe=1', props: { cast: CAST } })

    expect(wrapper.text()).toContain('主要演員')
    expect(wrapper.text()).toContain('Timothée Chalamet')
    expect(wrapper.text()).toContain('Paul Atreides')
    expect(wrapper.text()).toContain('Rebecca Ferguson')

    const imgs = wrapper.findAll('img').map(img => img.attributes('src'))
    expect(imgs).toContain('https://image.tmdb.org/t/p/w185/BE2sdjpgsa2rNTFa66f7upkaxuI.jpg')

    wrapper.unmount()
  })

  it('falls back to a User icon when the profile photo is missing', async () => {
    const wrapper = await mountSuspended(CastList, { route: '/?probe=2', props: { cast: CAST } })

    const cards = wrapper.findAll('div.flex.w-28')
    expect(cards[1]?.find('svg').exists()).toBe(true)
    // no character means no role line at all
    expect(cards[1]?.text()).not.toContain('Paul Atreides')

    wrapper.unmount()
  })

  it('hides the section entirely when no cast is provided', async () => {
    const wrapper = await mountSuspended(CastList, { route: '/?probe=3', props: { cast: [] } })

    expect(wrapper.find('section').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('caps the visible strip at twelve cast members', async () => {
    const bigCast: CastMember[] = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Cast ${i + 1}`,
      character: `Role ${i + 1}`,
      profilePath: null,
    }))
    const wrapper = await mountSuspended(CastList, { route: '/?probe=4', props: { cast: bigCast } })

    const cards = wrapper.findAll('div.flex.w-28')
    expect(cards).toHaveLength(12)
    expect(wrapper.text()).not.toContain('Cast 13')

    wrapper.unmount()
  })
})
