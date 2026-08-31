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

  it('renders recommendations via BrowseCarousel + TitleCard with responsive card widths', async () => {
    const wrapper = await mountSuspended(RecommendationsStrip, {
      props: { titles: RECOMMENDATIONS_PAGE.results },
      route: '/?probe=3',
    })

    // No longer a manual flex overflow strip
    expect(wrapper.html()).not.toContain('overflow-x-auto')
    // Uses BrowseCarousel
    expect(wrapper.find('.browse-carousel-outer').exists()).toBe(true)
    expect(wrapper.find('.browse-carousel-viewport').exists()).toBe(true)
    expect(wrapper.find('[data-carousel-state]').exists()).toBe(true)
    // TitleCard renders via NuxtLink to detail routes
    const hrefs = wrapper.findAll('a').map(link => link.attributes('href'))
    expect(hrefs).toContain('/movie/693134')
    expect(hrefs).toContain('/tv/135431')
    // Each card sits in a CarouselItem with responsive widths 180/168/152
    const items = wrapper.findAll('[data-slot="carousel-item"]')
    expect(items).toHaveLength(2)
    for (const item of items) {
      const cls = item.classes().join(' ')
      expect(cls).toContain('w-[180px]')
      expect(cls).toContain('max-[880px]:w-[168px]')
      expect(cls).toContain('max-[560px]:w-[152px]')
      expect(cls).toContain('shrink-0')
      expect(cls).toContain('snap-start')
    }
    // Posters keep 2:3 shape via TitleCard rounded-xl art
    const arts = wrapper.findAll('.title-card-art')
    expect(arts).toHaveLength(2)
    for (const art of arts) {
      expect(art.classes().join(' ')).toContain('aspect-[2/3]')
      expect(art.classes().join(' ')).toContain('rounded-xl')
    }
  })

  it('keeps section heading at heading-lg 20/700 foreground', async () => {
    const wrapper = await mountSuspended(RecommendationsStrip, {
      props: { titles: RECOMMENDATIONS_PAGE.results },
      route: '/?probe=4',
    })

    const heading = wrapper.find('h2')
    expect(heading.exists()).toBe(true)
    expect(heading.classes().join(' ')).toContain('text-heading-lg')
    expect(heading.classes().join(' ')).toContain('text-foreground')
    expect(heading.text()).toContain('你可能也會喜歡')
  })
})
