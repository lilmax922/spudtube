import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RECOMMENDATIONS_PAGE } from '../lib/title-detail-fixtures'
import RecommendationsStrip from './recommendations-strip.vue'

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('recommendations strip', () => {
  it('links each recommended title to its own detail route', async () => {
    const wrapper = await mountSuspended(RecommendationsStrip, {
      props: { titles: RECOMMENDATIONS_PAGE.results },
    })

    const links = wrapper.findAll('a').map(link => link.attributes('href'))
    expect(links).toContain('/movie/693134')
    expect(links).toContain('/tv/135431')
  })

  it('renders nothing for an empty list', async () => {
    const wrapper = await mountSuspended(RecommendationsStrip, { props: { titles: [] } })

    expect(wrapper.text()).toBe('')
    expect(wrapper.findAll('a')).toHaveLength(0)
  })

  it('keeps poster shape at 2:3 / var(--radius) and Title→Title routing', async () => {
    const wrapper = await mountSuspended(RecommendationsStrip, {
      props: { titles: RECOMMENDATIONS_PAGE.results },
      route: '/?probe=3',
    })

    const cards = wrapper.findAll('a')
    expect(cards.length).toBe(2)
    for (const card of cards) {
      expect(card.classes().join(' ')).toContain('rounded-[var(--radius)]')
      const poster = card.find('div.aspect-\\[2\\/3\\]')
      expect(poster.exists()).toBe(true)
      expect(poster.classes().join(' ')).toContain('rounded-[var(--radius)]')
    }
    const hrefs = cards.map(link => link.attributes('href'))
    expect(hrefs).toContain('/movie/693134')
    expect(hrefs).toContain('/tv/135431')
  })

  it('keeps section heading at Outfit 700 with tight tracking and body at 14/400/1.7', async () => {
    const wrapper = await mountSuspended(RecommendationsStrip, {
      props: { titles: RECOMMENDATIONS_PAGE.results },
      route: '/?probe=4',
    })

    const heading = wrapper.find('h2')
    expect(heading.classes().join(' ')).toContain('font-bold')
    expect(heading.classes().join(' ')).toContain('tracking-tight')
    const body = wrapper.find('p.truncate')
    expect(body.classes().join(' ')).toContain('font-normal')
    expect(body.classes().join(' ')).toContain('leading-[1.7]')
  })
})
