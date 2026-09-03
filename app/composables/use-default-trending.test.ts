import { describe, expect, it } from 'vitest'

describe('useDefaultTrending', () => {
  it('fetches both movie and tv trending in parallel via $fetch', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const file = fs.readFileSync(path.resolve(process.cwd(), 'app/composables/use-default-trending.ts'), 'utf-8')
    expect(file).toMatch(/\/api\/catalog\/movie\/trending/)
    expect(file).toMatch(/\/api\/catalog\/tv\/trending/)
    expect(file).toMatch(/Promise\.all/)
  })

  it('interleaves both kinds for the all tab and caps single-kind lists', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const file = fs.readFileSync(path.resolve(process.cwd(), 'app/composables/use-default-trending.ts'), 'utf-8')
    expect(file).toMatch(/allTitles/)
    expect(file).toMatch(/DEFAULT_TRENDING_ALL_LIMIT/)
    expect(file).toMatch(/DEFAULT_TRENDING_PER_KIND/)
  })
})
