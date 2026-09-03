import { describe, expect, it } from 'vitest'

describe('search page input', () => {
  it('contains inline search input with draft sync on original layout', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const file = fs.readFileSync(path.resolve(process.cwd(), 'app/pages/search.vue'), 'utf-8')
    expect(file).toMatch(/role="search"/)
    expect(file).toMatch(/draft/)
    expect(file).toMatch(/useDebounceFn/)
    expect(file).toMatch(/max-w-\[var\(--max-content-width\)\]/)
  })

  it('keeps original layout without trending or recent sections', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const file = fs.readFileSync(path.resolve(process.cwd(), 'app/pages/search.vue'), 'utf-8')
    expect(file).not.toMatch(/useTrendingNames/)
    expect(file).not.toMatch(/spudtube:recent/)
    expect(file).not.toMatch(/isEmptyQuery/)
  })

  it('preserves header and grid structure from original', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const file = fs.readFileSync(path.resolve(process.cwd(), 'app/pages/search.vue'), 'utf-8')
    expect(file).toMatch(/data-testid="search-header"/)
    expect(file).toMatch(/TitleCard/)
    expect(file).toMatch(/useInfiniteScroll/)
  })
})
