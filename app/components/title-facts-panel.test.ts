import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MOVIE_DETAIL, TV_DETAIL } from '../lib/title-detail-fixtures'
import TitleFactsPanel from './title-facts-panel.vue'

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('title facts panel', () => {
  it('renders the heading and the three facts for a movie', async () => {
    const wrapper = await mountSuspended(TitleFactsPanel, { route: '/?probe=1', props: { detail: MOVIE_DETAIL } })

    expect(wrapper.text()).toContain('作品資料')
    expect(wrapper.text()).toContain('類型')
    expect(wrapper.text()).toContain('電影')
    expect(wrapper.text()).toContain('上映／首播')
    expect(wrapper.text()).toContain('2021')
    expect(wrapper.text()).not.toContain('2021-10-22')
    expect(wrapper.text()).toContain('片長')
    expect(wrapper.text()).toContain('155 分鐘')
  })

  it('renders the localized kind label for a tv show', async () => {
    const wrapper = await mountSuspended(TitleFactsPanel, { route: '/?probe=2', props: { detail: TV_DETAIL } })

    expect(wrapper.text()).toContain('影集')
    expect(wrapper.text()).toContain('2021')
    expect(wrapper.text()).not.toContain('2021-11-06')
  })

  it('falls back to an em dash when runtime is missing', async () => {
    const detail = { ...MOVIE_DETAIL, runtimeMinutes: null }
    const wrapper = await mountSuspended(TitleFactsPanel, { route: '/?probe=3', props: { detail } })

    expect(wrapper.text()).toContain('片長')
    expect(wrapper.text()).not.toContain('155 分鐘')
    expect(wrapper.text()).toContain('—')
  })

  it('uses tabular-nums only for numeric fields', async () => {
    const wrapper = await mountSuspended(TitleFactsPanel, { route: '/?probe=4', props: { detail: MOVIE_DETAIL } })

    const numericCells = wrapper.findAll('dd.tabular-nums')
    expect(numericCells.length).toBeGreaterThanOrEqual(2)
    const numericText = numericCells.map(cell => cell.text()).join(' ')
    expect(numericText).toContain('2021')
    expect(numericText).toContain('155')

    const kindCell = wrapper.findAll('dd').find(cell => cell.text().includes('電影'))
    expect(kindCell?.classes().join(' ')).not.toContain('tabular-nums')
  })

  it('keeps section heading at Outfit 700 with prototype detailSection tracking', async () => {
    const wrapper = await mountSuspended(TitleFactsPanel, { route: '/?probe=5', props: { detail: MOVIE_DETAIL } })

    const heading = wrapper.find('h2')
    expect(heading.classes().join(' ')).toContain('font-bold')
    // prototype detailSection uses uppercase .06em, not tight; verify uppercase + muted
    expect(heading.classes().join(' ')).toContain('uppercase')
    expect(heading.classes().join(' ')).toContain('tracking-[')
    expect(heading.classes().join(' ')).toContain('text-muted-foreground')
  })

  it('renders the extended facts when the movie carries original name, status, language, budget, revenue and rating', async () => {
    const wrapper = await mountSuspended(TitleFactsPanel, { route: '/?probe=6', props: { detail: MOVIE_DETAIL } })

    expect(wrapper.text()).toContain('原名')
    expect(wrapper.text()).toContain('Dune')
    expect(wrapper.text()).toContain('狀態')
    expect(wrapper.text()).toContain('Released')
    expect(wrapper.text()).toContain('原語言')
    expect(wrapper.text()).toContain('EN')
    expect(wrapper.text()).toContain('預算')
    expect(wrapper.text()).toContain('$165,000,000')
    expect(wrapper.text()).toContain('票房')
    expect(wrapper.text()).toContain('$402,000,000')
    expect(wrapper.text()).toContain('分級')
    expect(wrapper.text()).toContain('PG-13')
  })

  it('omits extended facts when the values are null', async () => {
    const detail = { ...MOVIE_DETAIL, originalName: null, status: null, originalLanguage: null, budget: null, revenue: null, contentRating: null }
    const wrapper = await mountSuspended(TitleFactsPanel, { route: '/?probe=7', props: { detail } })

    expect(wrapper.text()).not.toContain('原名')
    expect(wrapper.text()).not.toContain('狀態')
    expect(wrapper.text()).not.toContain('原語言')
    expect(wrapper.text()).not.toContain('分級')
    expect(wrapper.text()).toContain('預算')
    expect(wrapper.text()).toContain('票房')
    expect(wrapper.text()).not.toContain('$165,000,000')
    expect(wrapper.text()).not.toContain('$402,000,000')
  })

  it('skips movie-only budget and revenue rows for a tv show', async () => {
    const wrapper = await mountSuspended(TitleFactsPanel, { route: '/?probe=8', props: { detail: TV_DETAIL } })

    expect(wrapper.text()).not.toContain('預算')
    expect(wrapper.text()).not.toContain('票房')
    expect(wrapper.text()).toContain('分級')
    expect(wrapper.text()).toContain('TV-MA')
  })
})
