import { describe, expect, it } from 'vitest'

describe('browse-grid motion', () => {
  it('uses motion-v AnimatePresence for carousel/grid switching', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const vueFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/browse-grid.vue'), 'utf-8')
    expect(vueFile).toMatch(/AnimatePresence/)
    expect(vueFile).toMatch(/from\s+['"]motion-v['"]/)
    expect(vueFile).toMatch(/<motion\./)
  })

  it('animates grid/filter changes with layout and popLayout', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const vueFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/browse-grid.vue'), 'utf-8')
    expect(vueFile).toMatch(/layout/)
    expect(vueFile).toMatch(/popLayout/)
  })

  it('wraps grid items with motion for filtering animation', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const vueFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/browse-grid.vue'), 'utf-8')
    // should have motion wrapper around TitleCard loops
    expect(vueFile).toMatch(/motion\.(div|li)/)
    expect(vueFile).toMatch(/TitleCard/)
    // should have initial/animate/exit props
    expect(vueFile).toMatch(/:initial/)
    expect(vueFile).toMatch(/:animate/)
    expect(vueFile).toMatch(/:exit/)
  })
})
