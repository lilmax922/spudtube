import { describe, expect, it } from 'vitest'

describe('useTrendingNames', () => {
  it('fetches both movie and tv trending in parallel via $fetch', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const file = fs.readFileSync(path.resolve(process.cwd(), 'app/composables/use-trending-names.ts'), 'utf-8')
    expect(file).toMatch(/\/api\/catalog\/movie\/trending/)
    expect(file).toMatch(/\/api\/catalog\/tv\/trending/)
    expect(file).toMatch(/Promise\.all/)
  })

  it('merges movie and tv names and caps at 6 (top 3 per kind)', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const file = fs.readFileSync(path.resolve(process.cwd(), 'app/composables/use-trending-names.ts'), 'utf-8')
    expect(file).toMatch(/merged/)
    expect(file).toMatch(/TRENDING_CHIPS_LIMIT/)
    expect(file).toContain('6')
    expect(file).not.toMatch(/slice\(0, 8\)/)
  })
})
