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
    expect(wrapper.find('svg').exists()).toBe(false)
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

    expect(wrapper.find('img').attributes('src')).toBe('https://example.com/avatar.png')
    expect(wrapper.find('[data-slot="avatar"]').exists()).toBe(true)
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(findButton(wrapper, 'Sign in')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Max')

    await findButton(wrapper, 'Max')!.trigger('click')
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(document.body.textContent).not.toContain('Max')
    expect(document.body.textContent).toContain('Sign out')
    expect(document.body.querySelector('[data-slot="dropdown-menu-label"]')).toBeNull()
    wrapper.unmount()
    document.querySelectorAll('[data-slot="dropdown-menu-content"]').forEach(el => el.remove())
  })

  it('emits signOut when a signed-in user clicks the sign-out button', async () => {
    const wrapper = await mountSuspended(AccountMenu, {
      props: { user: { name: 'Max', image: null } },
    })

    await findButton(wrapper, 'Max')!.trigger('click')
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    const item = document.body.querySelector('[data-slot="dropdown-menu-item"]') as HTMLElement | null
    expect(item).not.toBeNull()
    expect(item!.textContent).toContain('Sign out')
    item!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('signOut')).toHaveLength(1)
    wrapper.unmount()
    document.querySelectorAll('[data-slot="dropdown-menu-content"]').forEach(el => el.remove())
  })
})
