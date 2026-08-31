import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

describe('skeleton', () => {
  it('shadcn skeleton component exists and renders', async () => {
    const mod = await import('./skeleton.vue')
    expect(mod.default).toBeTruthy()
    const wrapper = mount(mod.default as unknown as object, {
      props: { class: 'h-4 w-32' },
    })
    const el = wrapper.element as HTMLElement
    expect(el.getAttribute('data-slot')).toBe('skeleton')
    expect(el.className).toContain('animate-pulse')
  })

  it('hero and browse grid use skeleton to avoid layout shift', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const indexFile = fs.readFileSync(path.resolve(process.cwd(), 'app/pages/index.vue'), 'utf-8')
    const browseFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/browse-grid.vue'), 'utf-8')
    // index should reserve hero space with skeleton while loading
    const indexUsesSkeleton = indexFile.includes('Skeleton') || indexFile.includes('skeleton') || indexFile.includes('HeroSkeleton') || indexFile.includes('aria-busy')
    expect(indexUsesSkeleton).toBe(true)
    // browse-grid should use Skeleton component instead of raw animate-pulse divs
    expect(browseFile).toMatch(/Skeleton/)
    expect(browseFile).toMatch(/from.*skeleton/i)
    // skeleton should be imported from ui
    expect(browseFile).toMatch(/@\/components\/ui\/skeleton|components\/ui\/skeleton/)
  })
})
