import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AccountMenu from './account-menu.vue'

function findButton(wrapper: VueWrapper<unknown>, label: string): DOMWrapper<Element> | undefined {
  return wrapper.findAll('button').find(button => button.text() === label || button.attributes('aria-label') === label)
}

describe('account menu', () => {
  it('offers sign-in to signed-out visitors', async () => {
    const wrapper = await mountSuspended(AccountMenu, { props: { user: null } })

    const signIn = findButton(wrapper, 'Sign in')
    expect(signIn).toBeDefined()
    expect(findButton(wrapper, 'Sign out')).toBeUndefined()
  })

  it('emits signIn when a signed-out visitor clicks the button', async () => {
    const wrapper = await mountSuspended(AccountMenu, { props: { user: null } })

    await findButton(wrapper, 'Sign in')!.trigger('click')

    expect(wrapper.emitted('signIn')).toHaveLength(1)
  })

  it('shows the signed-in user with their avatar and sign-out', async () => {
    const wrapper = await mountSuspended(AccountMenu, {
      props: { user: { name: 'Max', image: 'https://example.com/avatar.png' } },
    })

    expect(wrapper.text()).toContain('Max')
    expect(wrapper.find('img').attributes('src')).toBe('https://example.com/avatar.png')
    expect(findButton(wrapper, 'Sign out')).toBeDefined()
    expect(findButton(wrapper, 'Sign in')).toBeUndefined()
  })

  it('emits signOut when a signed-in user clicks the sign-out button', async () => {
    const wrapper = await mountSuspended(AccountMenu, {
      props: { user: { name: 'Max', image: null } },
    })

    await findButton(wrapper, 'Sign out')!.trigger('click')

    expect(wrapper.emitted('signOut')).toHaveLength(1)
  })
})
