import type { CastMember, CrewMember } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CastList from './cast-list.vue'

const CAST: CastMember[] = [
  { id: 1, name: 'Timothée Chalamet', character: 'Paul Atreides', profilePath: '/BE2sdjpgsa2rNTFa66f7upkaxuI.jpg' },
  { id: 2, name: 'Rebecca Ferguson', character: null, profilePath: null },
]

const CREW: CrewMember[] = [
  { id: 12538, name: 'Denis Villeneuve', job: 'Director', department: 'Directing' },
  { id: 578, name: 'Jon Spaihts', job: 'Writer', department: 'Writing' },
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

  it('falls back to a User icon and an em dash when character is missing', async () => {
    const wrapper = await mountSuspended(CastList, { route: '/?probe=2', props: { cast: CAST } })

    const cards = wrapper.findAll('div.flex.w-24')
    const rebecca = cards[1]
    expect(rebecca?.find('svg').exists()).toBe(true)
    expect(rebecca?.text()).toContain('—')

    wrapper.unmount()
  })

  it('hides the section entirely when no cast is provided', async () => {
    const wrapper = await mountSuspended(CastList, { route: '/?probe=3', props: { cast: [] } })

    expect(wrapper.find('section').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('caps visible cast at twelve and shows a Full cast & crew trigger', async () => {
    const bigCast: CastMember[] = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Cast ${i + 1}`,
      character: `Role ${i + 1}`,
      profilePath: null,
    }))
    const wrapper = await mountSuspended(CastList, { route: '/?probe=4', props: { cast: bigCast } })

    const cards = wrapper.findAll('div.flex.w-24')
    expect(cards).toHaveLength(12)
    expect(wrapper.text()).toContain('完整演員與工作人員')

    wrapper.unmount()
  })

  it('opens a full cast & crew dialog listing every cast member grouped crew', async () => {
    const bigCast: CastMember[] = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `Cast ${i + 1}`,
      character: `Role ${i + 1}`,
      profilePath: null,
    }))
    const wrapper = await mountSuspended(CastList, {
      route: '/?probe=5',
      props: { cast: bigCast, crew: CREW },
    })

    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull()

    const trigger = wrapper.findAll('button').find(button => button.text().includes('完整演員與工作人員'))
    expect(trigger).toBeDefined()
    await trigger!.trigger('click')

    await vi.waitFor(() => {
      expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull()
    })
    const bodyText = document.body.textContent ?? ''
    expect(bodyText).toContain('完整演員與工作人員')
    expect(bodyText).toContain('演員')
    // every cast member appears in the dialog, beyond the capped twelve
    expect(bodyText).toContain('Cast 13')
    expect(bodyText).toContain('Cast 15')
    // crew renders grouped by department
    expect(bodyText).toContain('工作人員')
    expect(bodyText).toContain('Directing')
    expect(bodyText).toContain('Denis Villeneuve')
    expect(bodyText).toContain('Director')
    expect(bodyText).toContain('Writing')
    expect(bodyText).toContain('Jon Spaihts')

    wrapper.unmount()
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull()
  })
})
