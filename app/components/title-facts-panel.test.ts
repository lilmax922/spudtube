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
})
