import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import type { RatingLabel } from '#server/db/schema/rating'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import RatingTrio from './rating-trio.vue'

function findButton(wrapper: VueWrapper<unknown>, label: string): DOMWrapper<Element> | undefined {
  return wrapper.findAll('button').find(button => button.attributes('aria-label') === label)
}

function options(wrapper: VueWrapper<unknown>): DOMWrapper<Element>[] {
  return wrapper.findAll('button[data-option]')
}

async function render(
  props: { label: RatingLabel | null, signedIn: boolean, pending?: boolean, voteAverage?: number | null },
): Promise<VueWrapper<InstanceType<typeof RatingTrio>>> {
  return await mountSuspended(RatingTrio, { route: `/?probe=${props.voteAverage ?? 0}-${props.label ?? 'none'}`, props })
}

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('rating trio', () => {
  it('shows the average rating alongside the trio', async () => {
    const wrapper = await render({ label: null, signedIn: true, voteAverage: 7.8 })

    expect(wrapper.text()).toContain('7.8')
    expect(wrapper.text()).toContain('平均評分')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('hides the average rating when the title has none', async () => {
    const wrapper = await render({ label: null, signedIn: true, voteAverage: null })

    expect(wrapper.text()).not.toContain('平均評分')
  })

  it('idle signed-in: one icon that reveals the three options, and select emits the label', async () => {
    const wrapper = await render({ label: null, signedIn: true })
    expect(options(wrapper)).toHaveLength(0)

    await findButton(wrapper, '評價這部片')!.trigger('click')

    expect(options(wrapper).map(option => option.attributes('aria-label'))).toEqual(['不行', '不錯', '超棒'])
    await findButton(wrapper, '超棒')!.trigger('click')
    await new Promise(resolve => setTimeout(resolve, 650))
    expect(wrapper.emitted('select')).toEqual([['AWESOME']])
    expect(options(wrapper)).toHaveLength(0)
  })

  it('idle anonymous: click on the button requests sign-in', async () => {
    const wrapper = await render({ label: null, signedIn: false })

    await findButton(wrapper, '評價這部片')!.trigger('click')

    expect(wrapper.emitted('signInRequested')).toHaveLength(1)
    expect(options(wrapper)).toHaveLength(0)
  })

  it('idle anonymous: hovering the trigger reveals the trio and clicking an option requests sign-in', async () => {
    const wrapper = await render({ label: null, signedIn: false })

    await findButton(wrapper, '評價這部片')!.trigger('mouseenter')
    expect(options(wrapper).map(option => option.attributes('aria-label'))).toEqual(['不行', '不錯', '超棒'])

    await findButton(wrapper, '超棒')!.trigger('click')

    expect(wrapper.emitted('signInRequested')).toHaveLength(1)
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.emitted('clear')).toBeUndefined()
  })

  it('hovering the trigger alone opens the trio, and leaving the whole control closes it again', async () => {
    const wrapper = await render({ label: null, signedIn: true })
    const trigger = findButton(wrapper, '評價這部片')!

    await trigger.trigger('mouseenter')
    expect(options(wrapper)).toHaveLength(3)

    await trigger.trigger('mouseleave')
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(options(wrapper)).toHaveLength(0)

    await trigger.trigger('mouseenter')
    expect(options(wrapper)).toHaveLength(3)
    await trigger.trigger('mouseleave')
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(options(wrapper)).toHaveLength(0)
  })

  it('moving away across the flyout keeps it open only until the flyout is fully left', async () => {
    const wrapper = await render({ label: null, signedIn: true })
    const trigger = findButton(wrapper, '評價這部片')!

    await trigger.trigger('mouseenter')
    const flyout = wrapper.find('[role="group"]')
    expect(flyout.exists()).toBe(true)

    await trigger.trigger('mouseleave')
    await flyout.trigger('mouseenter')
    await flyout.trigger('mouseleave')
    await new Promise(resolve => setTimeout(resolve, 300))

    expect(options(wrapper)).toHaveLength(0)
  })

  it('hovering the average-rating label alone never reveals the trio', async () => {
    const wrapper = await render({ label: null, signedIn: true, voteAverage: 8.1 })

    await wrapper.find('div.flex').trigger('mouseenter')

    expect(options(wrapper)).toHaveLength(0)
  })

  it('rated: the icon reflects the persisted label and clicking it opens the flyout for re-rating', async () => {
    const wrapper = await render({ label: 'GOOD', signedIn: true })

    const trigger = findButton(wrapper, '已評價：不錯')
    expect(trigger).toBeDefined()
    await trigger!.trigger('click')

    expect(options(wrapper).map(option => option.attributes('aria-label'))).toEqual(['不行', '不錯', '超棒'])
    await findButton(wrapper, '超棒')!.trigger('click')
    await new Promise(resolve => setTimeout(resolve, 650))
    expect(wrapper.emitted('select')).toEqual([['AWESOME']])
    expect(wrapper.emitted('clear')).toBeUndefined()
  })

  it('rated: the flyout marks the active option, selecting another re-rates', async () => {
    const wrapper = await render({ label: 'GOOD', signedIn: true })

    await findButton(wrapper, '已評價：不錯')!.trigger('mouseenter')
    const good = findButton(wrapper, '不錯')!
    expect(good.attributes('aria-pressed')).toBe('true')
    await findButton(wrapper, '超棒')!.trigger('click')
    await new Promise(resolve => setTimeout(resolve, 650))

    expect(wrapper.emitted('select')).toEqual([['AWESOME']])
    expect(wrapper.emitted('clear')).toBeUndefined()
  })

  it('rated: clicking the active option clears the rating', async () => {
    const wrapper = await render({ label: 'SUCKS', signedIn: true })

    await findButton(wrapper, '已評價：不行')!.trigger('click')
    await findButton(wrapper, '不行')!.trigger('click')
    await new Promise(resolve => setTimeout(resolve, 500))

    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('changing: pending disables the trio so no further actions fire', async () => {
    const wrapper = await render({ label: 'GOOD', signedIn: true, pending: true })

    for (const button of wrapper.findAll('button'))
      expect(button.attributes('disabled')).toBeDefined()
    await findButton(wrapper, '已評價：不錯')!.trigger('click')
    expect(wrapper.emitted('clear')).toBeUndefined()
    expect(wrapper.emitted('signInRequested')).toBeUndefined()
  })
})
