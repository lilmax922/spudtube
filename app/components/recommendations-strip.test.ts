import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { RECOMMENDATIONS_PAGE } from '../lib/title-detail-fixtures'
import RecommendationsStrip from './recommendations-strip.vue'

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
})
