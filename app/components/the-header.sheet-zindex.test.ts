import { describe, expect, it } from 'vitest'

describe('the-header sheet z-index', () => {
  it('shadcn sheet keeps default z-50 (do not mutate shadcn)', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const overlayFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/ui/sheet/SheetOverlay.vue'), 'utf-8')
    const contentFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/ui/sheet/SheetContent.vue'), 'utf-8')
    expect(overlayFile).toMatch(/z-50/)
    expect(overlayFile).not.toMatch(/z-70/)
    expect(contentFile).toMatch(/z-50/)
    expect(contentFile).not.toMatch(/z-70/)
  })

  it('header sheet content is lifted above header via consumer class (z-[70])', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const headerFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/the-header.vue'), 'utf-8')
    const headerMatch = headerFile.match(/#siteHeader\s*\{[^}]*z-index:\s*(\d+)/)
    expect(headerMatch).toBeTruthy()
    const headerZ = headerMatch ? Number(headerMatch[1]) : 0
    expect(headerZ).toBe(60)
    // consumer must override SheetContent via class prop - twMerge will keep z-[70] and drop z-50
    expect(headerFile).toMatch(/SheetContent/)
    expect(headerFile).toMatch(/z-\[70\]/)
    // overlay has no prop forwarding from consumer -> must be lifted via global CSS in header
    expect(headerFile).toMatch(/\[data-slot="sheet-overlay"\]/)
    expect(headerFile).toMatch(/z-index:\s*70/)
    // content global fallback also present
    expect(headerFile).toMatch(/headerSheetContent/)
  })

  it('sheet overlay and content share same z at runtime (both 70 > header 60)', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const headerFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/the-header.vue'), 'utf-8')
    const headerZ = Number(headerFile.match(/#siteHeader\s*\{[^}]*z-index:\s*(\d+)/)?.[1] ?? 0)
    // effective z comes from header consumer override, not shadcn file
    const contentOverride = headerFile.match(/SheetContent[^>]*class="[^"]*z-\[(\d+)\]/)?.[1]
    const overlayOverride = headerFile.match(/\[data-slot="sheet-overlay"\][^}]*z-index:\s*(\d+)/)?.[1]
    expect(contentOverride).toBeTruthy()
    expect(overlayOverride).toBeTruthy()
    expect(Number(contentOverride)).toBeGreaterThan(headerZ)
    expect(Number(overlayOverride)).toBeGreaterThan(headerZ)
    expect(contentOverride).toBe(overlayOverride)
    expect(Number(contentOverride)).toBeGreaterThanOrEqual(70)
  })

  it('sheet uses DialogPortal', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const contentFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/ui/sheet/SheetContent.vue'), 'utf-8')
    expect(contentFile).toMatch(/DialogPortal/)
  })
})
