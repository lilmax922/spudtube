import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MOVIE_DETAIL, MOVIE_WITHOUT_ARTWORK } from '../lib/title-detail-fixtures'
import TitleIdentityBlock from './title-identity-block.vue'

async function render(detail = MOVIE_DETAIL, route = '/?probe=1') {
  return await mountSuspended(TitleIdentityBlock, { route, props: { detail } })
}

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('title identity block', () => {
  it('renders the title with meta row, overview, genres and runtime', async () => {
    const wrapper = await render()

    expect(wrapper.text()).toContain('沙丘')
    expect(wrapper.text()).toContain('2021')
    expect(wrapper.text()).toContain('天賦異稟的保羅·亞崔迪…')
    expect(wrapper.text()).toContain('科幻')
    expect(wrapper.text()).toContain('冒險')
    expect(wrapper.text()).toContain('155 分鐘')
  })

  it('renders backdrop images from the TMDB CDN', async () => {
    const wrapper = await render(MOVIE_DETAIL, '/?probe=2')

    const images = wrapper.findAll('img').map(img => img.attributes('src'))
    expect(images).toContain('https://image.tmdb.org/t/p/w1280/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg')
    expect(images).not.toContain('https://image.tmdb.org/t/p/w500/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg')
  })

  it('hides the tagline when absent', async () => {
    const wrapper = await render(MOVIE_WITHOUT_ARTWORK, '/?probe=3')

    expect(wrapper.text()).toContain('Untranslated Film')
    expect(wrapper.text()).toContain('An English overview for an untranslated film.')
    expect(wrapper.text()).not.toContain('超越即將來臨')
  })

  it('omits year, runtime and genre chips when the data is missing', async () => {
    const noMeta = { ...MOVIE_WITHOUT_ARTWORK, releaseDate: null, runtimeMinutes: null, genres: [] }
    const wrapper = await render(noMeta, '/?probe=4')

    expect(wrapper.text()).not.toContain('2021')
    expect(wrapper.text()).not.toContain('155 分鐘')
    expect(wrapper.text()).not.toContain('科幻')
    expect(wrapper.text()).not.toContain('冒險')
    const genrePills = wrapper.findAll('span.rounded-full').filter(node => ['科幻', '冒險'].includes(node.text()))
    expect(genrePills).toHaveLength(0)
  })

  it('forwards rating actions from the trio to the page', async () => {
    const wrapper = await mountSuspended(TitleIdentityBlock, {
      route: '/?probe=5',
      props: { detail: MOVIE_DETAIL, signedIn: true },
    })

    const rateButton = wrapper.findAll('button').find(button => button.attributes('aria-label') === '評價這部片')
    expect(rateButton).toBeDefined()
    await rateButton!.trigger('click')
    await wrapper.findAll('button').find(button => button.attributes('aria-label') === '超棒')!.trigger('click')
    await new Promise(resolve => setTimeout(resolve, 650))

    expect(wrapper.emitted('selectRating')).toEqual([['AWESOME']])
  })

  it('renders the persisted rating when signed in and clears on demand', async () => {
    const wrapper = await mountSuspended(TitleIdentityBlock, {
      route: '/?probe=6',
      props: { detail: MOVIE_DETAIL, rating: 'GOOD', signedIn: true },
    })

    const ratedButton = wrapper.findAll('button').find(button => button.attributes('aria-label') === '已評價：不錯')
    expect(ratedButton).toBeDefined()
    await ratedButton!.trigger('click')
    const good = wrapper.findAll('button').find(button => button.attributes('aria-label') === '不錯')
    expect(good?.attributes('aria-pressed')).toBe('true')
    await good!.trigger('click')
    await new Promise(resolve => setTimeout(resolve, 500))

    expect(wrapper.emitted('clearRating')).toHaveLength(1)
  })

  it('emits signInRequested when an anonymous visitor clicks the trio', async () => {
    const wrapper = await render(MOVIE_DETAIL, '/?probe=7')

    await wrapper.findAll('button').find(button => button.attributes('aria-label') === '評價這部片')!.trigger('click')

    expect(wrapper.emitted('signInRequested')).toHaveLength(1)
  })

  it('forwards watch status actions from the toggle to the page', async () => {
    const wrapper = await mountSuspended(TitleIdentityBlock, {
      route: '/?probe=8',
      props: { detail: MOVIE_DETAIL, signedIn: true },
    })

    const watchlistButton = wrapper.findAll('button').find(button => button.attributes('aria-label') === '加入待看清單')
    expect(watchlistButton).toBeDefined()
    await watchlistButton!.trigger('click')

    expect(wrapper.emitted('setStatus')).toEqual([['WATCHLISTED']])
  })

  it('renders the persisted status when signed in and clears on demand', async () => {
    const wrapper = await mountSuspended(TitleIdentityBlock, {
      route: '/?probe=9',
      props: { detail: MOVIE_DETAIL, status: 'WATCHED', signedIn: true },
    })

    const watchedButton = wrapper.findAll('button').find(button => button.attributes('aria-label') === '已看過 — 點擊清除')
    expect(watchedButton).toBeDefined()
    expect(watchedButton!.attributes('aria-pressed')).toBe('true')
    await watchedButton!.trigger('click')

    expect(wrapper.emitted('clearStatus')).toHaveLength(1)
  })

  it('emits signInRequested when an anonymous visitor clicks the toggle', async () => {
    const wrapper = await render(MOVIE_DETAIL, '/?probe=10')

    await wrapper.findAll('button').find(button => button.attributes('aria-label') === '加入待看清單')!.trigger('click')

    expect(wrapper.emitted('signInRequested')).toHaveLength(1)
  })

  it('applies Contract shape and typography tokens', async () => {
    const wrapper = await render(MOVIE_DETAIL, '/?probe=11')

    const title = wrapper.find('h1')
    expect(title.classes().join(' ')).toContain('text-display')
    expect(title.text()).toContain('沙丘')

    const metaRow = wrapper.find('div.tabular-nums')
    expect(metaRow.exists()).toBe(true)
    expect(metaRow.text()).toContain('2021')
    expect(metaRow.text()).toContain('155')

    const overview = wrapper.find('p[class*="max-w"]')
    expect(overview.classes().join(' ')).toContain('text-body-lg')
    expect(overview.classes().join(' ')).not.toContain('tabular-nums')
  })

  it('uses a functional black mask over the backdrop and hides it when absent', async () => {
    const withBackdrop = await render(MOVIE_DETAIL, '/?probe=12')
    const overlay = withBackdrop.find('div.bg-black\\/35')
    expect(overlay.exists()).toBe(true)
    const gradientMask = withBackdrop.find('div[style*="linear-gradient"]')
    expect(gradientMask.exists()).toBe(true)

    const withoutBackdrop = await render(MOVIE_WITHOUT_ARTWORK, '/?probe=13')
    expect(withoutBackdrop.find('div.bg-black\\/35').exists()).toBe(false)
    expect(withoutBackdrop.findAll('img')).toHaveLength(0)
  })

  it('never renders the tagline', async () => {
    const withTagline = await render(MOVIE_DETAIL, '/?probe=14')
    expect(withTagline.text()).not.toContain('超越即將來臨。')
  })

  it('emits playTrailer when the play button is clicked and a trailer exists', async () => {
    const wrapper = await render(MOVIE_DETAIL, '/?probe=18')

    const playButton = wrapper.findAll('button').find(button => button.attributes('aria-label') === '播放預告')
    expect(playButton).toBeDefined()
    await playButton!.trigger('click')

    expect(wrapper.emitted('playTrailer')).toHaveLength(1)
  })

  it('omits the play-trailer button when there is no trailer', async () => {
    const wrapper = await mountSuspended(TitleIdentityBlock, {
      route: '/?probe=19',
      props: { detail: { ...MOVIE_DETAIL, trailerKey: null } },
    })

    expect(wrapper.findAll('button').find(button => button.attributes('aria-label') === '播放預告')).toBeUndefined()
  })

  it('displays the TMDB vote average as a one-decimal star score in row 6', async () => {
    const wrapper = await render(MOVIE_DETAIL, '/?probe=20')

    expect(wrapper.text()).toContain('7.8')
    expect(wrapper.text()).not.toContain('7.805')
    expect(wrapper.find('svg[aria-hidden="true"]').exists()).toBe(true)
  })

  it('hides the rating score when voteAverage is null', async () => {
    const wrapper = await render({ ...MOVIE_DETAIL, voteAverage: null }, '/?probe=20b')

    const scoreText = wrapper.find('span.tabular-nums')
    expect(scoreText.exists()).toBe(false)
  })

  it('renders content rating in a badge component after the genres', async () => {
    const wrapper = await render(MOVIE_DETAIL, '/?probe=23')

    const badge = wrapper.find('[data-slot="badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('PG-13')
  })

  it('hides content rating badge when contentRating is absent', async () => {
    const wrapper = await render({ ...MOVIE_DETAIL, contentRating: null }, '/?probe=24')

    expect(wrapper.find('[data-slot="badge"]').exists()).toBe(false)
  })

  it('does not render director or writer crewline in the hero', async () => {
    const wrapper = await render(MOVIE_DETAIL, '/?probe=25')

    expect(wrapper.text()).not.toContain('導演')
    expect(wrapper.text()).not.toContain('編劇')
    expect(wrapper.text()).not.toContain('Denis Villeneuve')
    expect(wrapper.text()).not.toContain('Jon Spaihts')
  })

  it('pulls the hero up behind the fixed header so backdrop fills header + hero as one region', async () => {
    const wrapper = await render(MOVIE_DETAIL, '/?probe=26')
    const section = wrapper.find('section')
    expect(section.exists()).toBe(true)

    const className = section.classes().join(' ')
    // Negative top margin escapes the parent's `--header-h` top padding so the hero sits behind the header.
    expect(className).toContain('-mt-[var(--header-h)]')
    // Padding-top still reserves the header band for the title text.
    expect(className).toContain('pt-[calc(var(--header-h)')
    // Negative side margins escape the parent's max-width container for a true full-bleed backdrop.
    expect(className).toContain('-mx-[calc((100vw-100%)/2)]')
  })
})
