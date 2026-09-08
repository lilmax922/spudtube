import fs from 'node:fs'
import path from 'node:path'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import TheHeader from './the-header.vue'

const routePath = shallowRef('/')

mockNuxtImport('useRoute', () => () => ({ path: routePath.value, query: {}, fullPath: routePath.value }))

vi.mock('./../composables/use-browse-listing', () => ({
  useBrowseListing: () => ({
    kind: shallowRef<'MOVIE' | 'TV_SHOW'>('MOVIE'),
    setKind: vi.fn(),
  }),
}))

function readHeader(): string {
  return fs.readFileSync(path.resolve(process.cwd(), 'app/components/the-header.vue'), 'utf-8')
}

function readNavSection(header: string): string {
  const navStart = header.indexOf('<nav id="appnav"')
  return header.slice(navStart, header.indexOf('</nav>', navStart))
}

function readSheetSection(header: string): string {
  return header.slice(header.indexOf('<SheetContent'), header.indexOf('</SheetContent>'))
}

describe('the-header', () => {
  describe('kind-synced triggers', () => {
    it('search button mirrors kind button idle/hover (32px, 8px radius, white 72% / 8%)', () => {
      const header = readHeader()
      expect(header).toMatch(/class="headerSearchBtn"/)
      expect(header).not.toMatch(/searchOpenBtn\.ghost/)
      const searchCss = header.slice(header.indexOf('#searchOpenBtn {'), header.indexOf('@media (max-width: 880px)'))
      expect(searchCss).toMatch(/width:\s*32px/)
      expect(searchCss).toMatch(/height:\s*32px/)
      expect(searchCss).toMatch(/border-radius:\s*8px/)
      expect(searchCss).toMatch(/rgba\(255,\s*255,\s*255,\s*0\.72\)/)
      expect(searchCss).toMatch(/rgba\(255,\s*255,\s*255,\s*0\.08\)/)
    })

    it('language trigger mirrors kind button idle/hover instead of pill ghost', () => {
      const switcher = fs.readFileSync(path.resolve(process.cwd(), 'app/components/language-switcher.vue'), 'utf-8')
      const btnClass = switcher.match(/id="langBtn"[\s\S]*?class="([^"]*)"/)?.[1] ?? ''
      expect(btnClass).toMatch(/h-8/)
      expect(btnClass).toMatch(/rounded-lg/)
      expect(btnClass).toMatch(/text-button-md/)
      expect(btnClass).toMatch(/rgba\(255,255,255,0\.72\)/)
      expect(btnClass).toMatch(/rgba\(255,255,255,0\.08\)/)
      expect(btnClass).not.toMatch(/rounded-full/)
      expect(btnClass).not.toMatch(/h-\[38px\]/)
      expect(btnClass).not.toMatch(/hover:bg-muted/)
    })

    it('drops dead appnav ghost/outline/on variants once every trigger is kind-synced', () => {
      const header = readHeader()
      expect(header).not.toMatch(/#appnav a\.ghost/)
      expect(header).not.toMatch(/#appnav \.ghost/)
      expect(header).not.toMatch(/#appnav a\.on/)
      expect(header).not.toMatch(/\.outline/)
    })
  })

  describe('my-list desktop button', () => {
    it('renders a My List entry point in the desktop nav next to the account control', () => {
      const header = readHeader()
      expect(header).toMatch(/headerMyListDesktop/)
      expect(header).toMatch(/to="\/my-list"/)
      expect(header).toMatch(/myList\.heading/)
      expect(header).toMatch(/isMyListSelected/)
      expect(header).toMatch(/aria-current/)
    })

    it('renders the desktop My List link as a plain navigate link with no route selected state', () => {
      const nav = readNavSection(readHeader())
      expect(nav).toMatch(/headerMyListDesktop/)
      expect(nav).not.toMatch(/isMyListSelected/)
      expect(nav).not.toMatch(/aria-current/)
    })

    it('keeps the My List button immediately left of AccountMenu (before sign-in control)', () => {
      const nav = readNavSection(readHeader())
      const myListIndex = nav.indexOf('headerMyListDesktop')
      const accountIndex = nav.indexOf('<AccountMenu')
      expect(myListIndex).toBeGreaterThan(-1)
      expect(accountIndex).toBeGreaterThan(-1)
      expect(myListIndex).toBeLessThan(accountIndex)
      expect(nav.slice(myListIndex, accountIndex)).not.toMatch(/<LanguageSwitcher|<button[^>]*searchOpenBtn/)
    })

    it('hides the desktop My List button below 880px like the other desktop nav items', () => {
      const header = readHeader()
      const mqStart = header.indexOf('@media (max-width: 880px)')
      expect(mqStart).toBeGreaterThan(-1)
      const mqEnd = header.indexOf('@media (max-width: 560px)', mqStart)
      const mq = header.slice(mqStart, mqEnd === -1 ? undefined : mqEnd)
      expect(mq).toMatch(/\.headerMyListDesktop/)
      expect(mq).toMatch(/display:\s*none/)
    })

    it('hides the desktop My List link from signed-out visitors', async () => {
      const wrapper = await mountSuspended(TheHeader, {
        props: { user: null },
        route: '/',
      })

      const nav = wrapper.find('#appnav')
      expect(nav.exists()).toBe(true)
      expect(nav.find('a[href="/my-list"]').exists()).toBe(false)
      expect(nav.text()).not.toContain('My List')
      expect(nav.text()).toContain('Sign in')
      wrapper.unmount()
    })

    it('shows the My List link left of the account control when signed in', async () => {
      const wrapper = await mountSuspended(TheHeader, {
        props: { user: { name: 'Max', image: null } },
        route: '/',
      })

      const nav = wrapper.find('#appnav')
      const link = nav.find('a[href="/my-list"]')
      expect(link.exists()).toBe(true)
      expect(link.text()).toContain('My List')
      expect(link.attributes('aria-current')).toBeUndefined()

      const html = nav.html()
      expect(html.indexOf('/my-list')).toBeLessThan(html.indexOf('aria-label="Max"'))
      wrapper.unmount()
    })

    it('stays a plain navigate link with no selected state on the my-list route', async () => {
      routePath.value = '/my-list'
      const wrapper = await mountSuspended(TheHeader, {
        props: { user: { name: 'Max', image: null } },
      })

      const link = wrapper.find('#appnav a[href="/my-list"]')
      expect(link.exists()).toBe(true)
      expect(link.attributes('aria-current')).toBeUndefined()
      expect(link.classes()).not.toContain('on')
      wrapper.unmount()
      routePath.value = '/'
    })
  })

  describe('full width sheet', () => {
    it('sheetContent uses w-full (full width) not w-[300px]', () => {
      const header = readHeader()
      expect(header).toMatch(/SheetContent[^>]*w-full/)
      expect(header).not.toMatch(/w-\[300px\]/)
    })

    it('contains nav links for Movies TV Search My List with selected state', () => {
      const header = readHeader()
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

    it('uses v-for with single button class and no duplicated components in Sheet', () => {
      const header = readHeader()
      expect(header).toMatch(/SHEET_BTN_CLASS/)
      expect(header).toMatch(/v-for="item in sheetNavItems"/)
      expect(header).toMatch(/sheetNavItems/)
      // Sheet should not contain KindSwitch or LanguageSwitcher or separate search trigger
      const sheetSection = readSheetSection(header)
      expect(sheetSection).not.toMatch(/<KindSwitch/)
      expect(sheetSection).not.toMatch(/<LanguageSwitcher/)
      expect(sheetSection).not.toMatch(/onSearchFromSheet/)
      expect(header).toMatch(/headerLangDesktop/)
    })

    it('sheet nav item for search navigates to /search', () => {
      const header = readHeader()
      expect(header).toMatch(/onNavigateTo\('\/search'\)/)
      expect(header).toMatch(/sheetNavItems[\s\S]*search\.label/)
    })

    it('sheet title is visually removed (no SheetHeader, sr-only SheetTitle)', () => {
      const sheetSection = readSheetSection(readHeader())
      expect(sheetSection).not.toMatch(/<SheetHeader/)
      expect(sheetSection).toMatch(/sr-only/)
    })

    it('sheet renders language buttons and divider between nav and language', () => {
      const header = readHeader()
      expect(header).toMatch(/LANGUAGE_LABELS/)
      expect(header).toMatch(/繁體中文/)
      expect(header).toMatch(/English/)
      expect(header).toMatch(/sheetLangItems/)
      expect(header).toMatch(/item\.selected \? 'secondary' : 'ghost'/)
      expect(header).toMatch(/lang\.selected \? 'secondary' : 'ghost'/)
      expect(header).toMatch(/role="separator"/)
      const sheetSection = readSheetSection(header)
      const navIndex = sheetSection.indexOf('sheetNavItems')
      const separatorIndex = sheetSection.indexOf('role="separator"')
      const langIndex = sheetSection.indexOf('sheetLangItems')
      expect(navIndex).toBeGreaterThan(-1)
      expect(separatorIndex).toBeGreaterThan(navIndex)
      expect(langIndex).toBeGreaterThan(separatorIndex)
    })

    it('sheet shows group labels above nav and language sections', () => {
      const header = readHeader()
      expect(header).toMatch(/t\('menu\.browse'\)/)
      expect(header).toMatch(/t\('menu\.language'\)/)
      const sheetSection = readSheetSection(header)
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

    it('sheet My List only appears when signed in', () => {
      const header = readHeader()
      const itemsMatch = header.match(/const sheetNavItems = computed<SheetNavItem\[\]>\s*\(\(\) => \{[\s\S]*?\n\}/)
      expect(itemsMatch).toBeTruthy()
      const itemsBlock = itemsMatch ? itemsMatch[0] : ''
      expect(itemsBlock).toMatch(/props\.user/)
      expect(itemsBlock).toMatch(/items\.push/)
      expect(itemsBlock).toMatch(/myList\.heading/)
    })

    it('sheet buttons use same radius as sheet close button (rounded-md), not pill', () => {
      const header = readHeader()
      expect(header).toMatch(/SHEET_BTN_CLASS = 'h-10 w-full justify-start gap-2 rounded-md px-4 text-button-md'/)
      // sheet close button uses size icon-sm -> rounded-[min(var(--radius-md),10px)]
      const buttonIndex = fs.readFileSync(path.resolve(process.cwd(), 'app/components/ui/button/index.ts'), 'utf-8')
      expect(buttonIndex).toMatch(/rounded-\[min\(var\(--radius-md\),10px\)\]/)
      expect(header).not.toMatch(/SHEET_BTN_CLASS[^']*rounded-full/)
    })
  })

  describe('sheet z-index', () => {
    it('shadcn sheet keeps default z-50 (do not mutate shadcn)', () => {
      const overlayFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/ui/sheet/SheetOverlay.vue'), 'utf-8')
      const contentFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/ui/sheet/SheetContent.vue'), 'utf-8')
      expect(overlayFile).toMatch(/z-50/)
      expect(overlayFile).not.toMatch(/z-70/)
      expect(contentFile).toMatch(/z-50/)
      expect(contentFile).not.toMatch(/z-70/)
    })

    it('header sheet content is lifted above header via consumer class (z-[70])', () => {
      const headerFile = readHeader()
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

    it('sheet overlay and content share same z at runtime (both 70 > header 60)', () => {
      const headerFile = readHeader()
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

    it('sheet uses DialogPortal', () => {
      const contentFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/ui/sheet/SheetContent.vue'), 'utf-8')
      expect(contentFile).toMatch(/DialogPortal/)
    })
  })
})
