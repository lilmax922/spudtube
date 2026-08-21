import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import App from './app.vue'

describe('app shell', () => {
  it('renders brand and tagline', async () => {
    const wrapper = await mountSuspended(App)

    expect(wrapper.text()).toContain('SpudTube')
    expect(wrapper.text()).toContain('Decide what to watch')
  })
})
