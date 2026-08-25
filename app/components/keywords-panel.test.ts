import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import KeywordsPanel from './keywords-panel.vue'

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('keywords panel', () => {
  it('renders each keyword as a pill', async () => {
    const wrapper = await mountSuspended(KeywordsPanel, {
      route: '/?probe=1',
      props: { keywords: ['based on novel', 'desert', 'epic'] },
    })

    expect(wrapper.text()).toContain('關鍵字')
    expect(wrapper.text()).toContain('based on novel')
    expect(wrapper.text()).toContain('desert')
    expect(wrapper.text()).toContain('epic')
  })

  it('falls back to an em dash when keywords are empty', async () => {
    const wrapper = await mountSuspended(KeywordsPanel, {
      route: '/?probe=2',
      props: { keywords: [] },
    })

    expect(wrapper.text()).toContain('關鍵字')
    expect(wrapper.text()).toContain('—')
  })
})
