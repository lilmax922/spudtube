import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MOVIE_DETAIL, MOVIE_WITHOUT_ARTWORK, TV_DETAIL } from '../lib/title-detail-fixtures'
import TitleFactsPanel from './title-facts-panel.vue'

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('title facts panel', () => {
  it('renders the heading and the non-hero facts for a movie', async () => {
    const wrapper = await mountSuspended(TitleFactsPanel, { route: '/?probe=1', props: { detail: MOVIE_DETAIL } })

    expect(wrapper.text()).toContain('詳細資料')
    expect(wrapper.text()).toContain('上映／首播')
    expect(wrapper.text()).toContain('2021年10月22日')
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
  })

  it('does not repeat facts already shown in the hero', async () => {
    const wrapper = await mountSuspended(TitleFactsPanel, { route: '/?probe=2', props: { detail: MOVIE_DETAIL } })

    expect(wrapper.text()).not.toContain('類型')
    expect(wrapper.text()).not.toContain('片長')
    expect(wrapper.text()).not.toContain('155 分鐘')
    expect(wrapper.text()).not.toContain('分級')
    expect(wrapper.text()).not.toContain('PG-13')
  })

  it('skips movie-only budget and revenue cells for a tv show', async () => {
    const wrapper = await mountSuspended(TitleFactsPanel, { route: '/?probe=3', props: { detail: TV_DETAIL } })

    expect(wrapper.text()).not.toContain('預算')
    expect(wrapper.text()).not.toContain('票房')
    expect(wrapper.text()).toContain('2021年11月6日')
    expect(wrapper.text()).toContain('Arcane')
    expect(wrapper.text()).toContain('Ended')
  })

  it('renders nothing when every fact is missing', async () => {
    const detail = { ...MOVIE_WITHOUT_ARTWORK, releaseDate: null, originalName: null, status: null, originalLanguage: null }
    const wrapper = await mountSuspended(TitleFactsPanel, { route: '/?probe=4', props: { detail } })

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('uses tabular-nums only for numeric cells', async () => {
    const wrapper = await mountSuspended(TitleFactsPanel, { route: '/?probe=5', props: { detail: MOVIE_DETAIL } })

    const numericCells = wrapper.findAll('dd.tabular-nums')
    expect(numericCells.length).toBe(3)
    const numericText = numericCells.map(cell => cell.text()).join(' ')
    expect(numericText).toContain('2021')
    expect(numericText).toContain('$165,000,000')

    const nameCell = wrapper.findAll('dd').find(cell => cell.text().includes('Dune'))
    expect(nameCell?.classes().join(' ')).not.toContain('tabular-nums')
  })

  it('keeps section heading at heading-lg 20/700 foreground', async () => {
    const wrapper = await mountSuspended(TitleFactsPanel, { route: '/?probe=6', props: { detail: MOVIE_DETAIL } })

    const heading = wrapper.find('h2')
    expect(heading.classes().join(' ')).toContain('text-heading-lg')
    expect(heading.classes().join(' ')).toContain('text-foreground')
  })
})
