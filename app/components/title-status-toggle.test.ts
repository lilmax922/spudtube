import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import TitleStatusToggle from './title-status-toggle.vue'

async function render(props: { status?: 'WATCHLISTED' | 'WATCHED' | null, signedIn?: boolean, pending?: boolean } = {}) {
  return await mountSuspended(TitleStatusToggle, {
    props: {
      status: props.status ?? null,
      signedIn: props.signedIn ?? false,
      pending: props.pending ?? false,
    },
  })
}

function findButton(wrapper: Awaited<ReturnType<typeof render>>, label: string) {
  return wrapper.findAll('button').find(button => button.attributes('aria-label') === label)
}

describe('title-status-toggle', () => {
  it('renders both idle actions for a signed-out visitor', async () => {
    const wrapper = await render({ signedIn: false })

    expect(wrapper.text()).toContain('Watchlist')
    expect(wrapper.text()).toContain('Watched')
    expect(findButton(wrapper, 'Add to watchlist')?.attributes('aria-pressed')).toBe('false')
    expect(findButton(wrapper, 'Mark as watched')?.attributes('aria-pressed')).toBe('false')
  })

  it('requests sign-in instead of setting a status when signed out', async () => {
    const wrapper = await render({ signedIn: false })

    await findButton(wrapper, 'Add to watchlist')!.trigger('click')
    await findButton(wrapper, 'Mark as watched')!.trigger('click')

    const emitted = wrapper.emitted()
    expect(emitted.signInRequested).toHaveLength(2)
    expect(emitted.setStatus).toBeUndefined()
  })

  it('emits setStatus WATCHLISTED when the watchlist action is idle', async () => {
    const wrapper = await render({ signedIn: true, status: null })

    await findButton(wrapper, 'Add to watchlist')!.trigger('click')

    expect(wrapper.emitted('setStatus')).toEqual([['WATCHLISTED']])
  })

  it('emits setStatus WATCHED when the watched action is idle, even while watchlisted', async () => {
    const wrapper = await render({ signedIn: true, status: 'WATCHLISTED' })

    await findButton(wrapper, 'Mark as watched')!.trigger('click')

    expect(wrapper.emitted('setStatus')).toEqual([['WATCHED']])
  })

  it('emits clearStatus when clicking the active action', async () => {
    const wrapper = await render({ signedIn: true, status: 'WATCHED' })

    await findButton(wrapper, 'Watched — click to clear')!.trigger('click')

    expect(wrapper.emitted('clearStatus')).toHaveLength(1)
  })

  it('marks the active action as pressed and renders the remove label', async () => {
    const wrapper = await render({ signedIn: true, status: 'WATCHLISTED' })

    const active = findButton(wrapper, 'In watchlist — click to remove')
    expect(active).toBeDefined()
    expect(active!.attributes('aria-pressed')).toBe('true')
    expect(findButton(wrapper, 'Mark as watched')!.attributes('aria-pressed')).toBe('false')
  })

  it('disables both actions while a change is pending', async () => {
    const wrapper = await render({ signedIn: true, status: null, pending: true })

    expect(findButton(wrapper, 'Add to watchlist')!.attributes('disabled')).toBeDefined()
    expect(findButton(wrapper, 'Mark as watched')!.attributes('disabled')).toBeDefined()
  })
})
