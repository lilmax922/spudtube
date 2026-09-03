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

  it('renders default landing with recommended grid and no recent or trending sections', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const file = fs.readFileSync(path.resolve(process.cwd(), 'app/pages/search.vue'), 'utf-8')
    expect(file).toMatch(/useDefaultTrending/)
    expect(file).toMatch(/isEmptyQuery/)
    expect(file).toMatch(/data-testid="search-default"/)
    expect(file).not.toMatch(/useTrendingNames/)
    expect(file).not.toMatch(/spudtube:recent/)
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
