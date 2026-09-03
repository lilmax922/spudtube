import { describe, expect, it } from 'vitest'

describe('the-header full width sheet', () => {
  it('sheetContent uses w-full (full width) not w-[300px]', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const header = fs.readFileSync(path.resolve(process.cwd(), 'app/components/the-header.vue'), 'utf-8')
    expect(header).toMatch(/SheetContent[^>]*w-full/)
    expect(header).not.toMatch(/w-\[300px\]/)
  })

  it('contains nav links for Movies TV Search My List with selected state', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const header = fs.readFileSync(path.resolve(process.cwd(), 'app/components/the-header.vue'), 'utf-8')
    expect(header).toMatch(/browse\.kindMovies/)
    expect(header).toMatch(/browse\.kindTvShows/)
    expect(header).toMatch(/search\.label/)
    expect(header).toMatch(/myList\.heading/)
    expect(header).toMatch(/isMoviesSelected/)
    expect(header).toMatch(/isTvShowsSelected/)
    expect(header).toMatch(/isSearchSelected/)
    expect(header).toMatch(/isMyListSelected/)
    expect(header).toMatch(/aria-current/)
  })

  it('uses v-for with single button class and no duplicated components in Sheet', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const header = fs.readFileSync(path.resolve(process.cwd(), 'app/components/the-header.vue'), 'utf-8')
    expect(header).toMatch(/SHEET_BTN_CLASS/)
    expect(header).toMatch(/v-for="item in sheetNavItems"/)
    expect(header).toMatch(/sheetNavItems/)
    // Sheet should not contain KindSwitch or LanguageSwitcher or separate search trigger
    const sheetSection = header.slice(header.indexOf('<SheetContent'), header.indexOf('</SheetContent>'))
    expect(sheetSection).not.toMatch(/<KindSwitch/)
    expect(sheetSection).not.toMatch(/<LanguageSwitcher/)
    expect(sheetSection).not.toMatch(/onSearchFromSheet/)
    expect(header).toMatch(/headerLangDesktop/)
  })

  it('sheet nav item for search navigates to /search', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const header = fs.readFileSync(path.resolve(process.cwd(), 'app/components/the-header.vue'), 'utf-8')
    expect(header).toMatch(/onNavigateTo\('\/search'\)/)
    expect(header).toMatch(/sheetNavItems[\s\S]*search\.label/)
  })

  it('sheet title is visually removed (no SheetHeader, sr-only SheetTitle)', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const header = fs.readFileSync(path.resolve(process.cwd(), 'app/components/the-header.vue'), 'utf-8')
    const sheetSection = header.slice(header.indexOf('<SheetContent'), header.indexOf('</SheetContent>'))
    expect(sheetSection).not.toMatch(/<SheetHeader/)
    expect(sheetSection).toMatch(/sr-only/)
  })

  it('sheet renders language buttons and divider between nav and language', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const header = fs.readFileSync(path.resolve(process.cwd(), 'app/components/the-header.vue'), 'utf-8')
    expect(header).toMatch(/LANGUAGE_LABELS/)
    expect(header).toMatch(/繁體中文/)
    expect(header).toMatch(/English/)
    expect(header).toMatch(/sheetLangItems/)
    expect(header).toMatch(/item\.selected \? 'secondary' : 'ghost'/)
    expect(header).toMatch(/lang\.selected \? 'secondary' : 'ghost'/)
    expect(header).toMatch(/role="separator"/)
    const sheetSection = header.slice(header.indexOf('<SheetContent'), header.indexOf('</SheetContent>'))
    const navIndex = sheetSection.indexOf('sheetNavItems')
    const separatorIndex = sheetSection.indexOf('role="separator"')
    const langIndex = sheetSection.indexOf('sheetLangItems')
    expect(navIndex).toBeGreaterThan(-1)
    expect(separatorIndex).toBeGreaterThan(navIndex)
    expect(langIndex).toBeGreaterThan(separatorIndex)
  })

  it('sheet shows group labels above nav and language sections', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const header = fs.readFileSync(path.resolve(process.cwd(), 'app/components/the-header.vue'), 'utf-8')
    expect(header).toMatch(/t\('menu\.browse'\)/)
    expect(header).toMatch(/t\('menu\.language'\)/)
    const sheetSection = header.slice(header.indexOf('<SheetContent'), header.indexOf('</SheetContent>'))
    const browseLabel = sheetSection.indexOf('menu.browse')
    const navItems = sheetSection.indexOf('sheetNavItems')
    const langLabel = sheetSection.indexOf('menu.language')
    const langItems = sheetSection.indexOf('sheetLangItems')
    expect(browseLabel).toBeGreaterThan(-1)
    expect(navItems).toBeGreaterThan(browseLabel)
    expect(langLabel).toBeGreaterThan(navItems)
    expect(langItems).toBeGreaterThan(langLabel)
    // group labels exist in both locale files
    const zh = fs.readFileSync(path.resolve(process.cwd(), 'i18n/locales/zh-TW.json'), 'utf-8')
    const en = fs.readFileSync(path.resolve(process.cwd(), 'i18n/locales/en.json'), 'utf-8')
    expect(zh).toMatch(/menu/)
    expect(en).toMatch(/menu/)
  })

  it('sheet My List only appears when signed in', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const header = fs.readFileSync(path.resolve(process.cwd(), 'app/components/the-header.vue'), 'utf-8')
    const itemsMatch = header.match(/const sheetNavItems = computed<SheetNavItem\[\]>\s*\(\(\) => \{[\s\S]*?\n\}/)
    expect(itemsMatch).toBeTruthy()
    const itemsBlock = itemsMatch ? itemsMatch[0] : ''
    expect(itemsBlock).toMatch(/props\.user/)
    expect(itemsBlock).toMatch(/items\.push/)
    expect(itemsBlock).toMatch(/myList\.heading/)
  })

  it('sheet buttons use same radius as sheet close button (rounded-md), not pill', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const header = fs.readFileSync(path.resolve(process.cwd(), 'app/components/the-header.vue'), 'utf-8')
    expect(header).toMatch(/SHEET_BTN_CLASS = 'h-10 w-full justify-start gap-2 rounded-md px-4 text-button-md'/)
    // sheet close button uses size icon-sm -> rounded-[min(var(--radius-md),10px)]
    const buttonIndex = fs.readFileSync(path.resolve(process.cwd(), 'app/components/ui/button/index.ts'), 'utf-8')
    expect(buttonIndex).toMatch(/rounded-\[min\(var\(--radius-md\),10px\)\]/)
    expect(header).not.toMatch(/SHEET_BTN_CLASS[^']*rounded-full/)
  })
})
