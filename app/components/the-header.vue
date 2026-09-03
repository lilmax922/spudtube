<script setup lang="ts">
import type { AppLocale } from '#shared/i18n/locale'
import { Menu, Search } from '@lucide/vue'
import { onKeyStroke } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { navigateTo, useCookie, useRoute } from '#imports'
import { LOCALE_COOKIE, LOCALES } from '#shared/i18n/locale'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useBrowseGrid } from '../composables/use-browse-grid'
import { useMediaLightboxState } from '../composables/use-media-lightbox'
import { useTrailerState } from '../composables/use-trailer'
import AccountMenu from './account-menu.vue'
import KindSwitch from './kind-switch.vue'
import LanguageSwitcher from './language-switcher.vue'

interface HeaderUser {
  name: string
  image?: string | null
}

const props = defineProps<{ user?: HeaderUser | null, isOverlayOpenProp?: boolean }>()
const emit = defineEmits<{
  signIn: []
  signOut: []
  openSearch: []
  toggleSearch: []
}>()

const SHEET_BTN_CLASS = 'h-10 w-full justify-start gap-2 rounded-md px-4 text-button-md'

const { t, locale, setLocale } = useI18n()
const route = useRoute()
const { kind: browseKind, setKind } = useBrowseGrid()

const isScrolled = shallowRef(false)
const isSheetOpen = shallowRef(false)
const { isOpen: isTrailerOpen } = useTrailerState()
const { isOpen: isMediaLightboxOpen } = useMediaLightboxState()
const isOverlayOpen = computed(() => props.isOverlayOpenProp ?? (isTrailerOpen.value || isMediaLightboxOpen.value))

const isHome = shallowRef(route.path === '/')
watch(() => route.path, (path) => {
  isHome.value = path === '/'
})

function handleKindSwitch(kind: 'MOVIE' | 'TV_SHOW'): void {
  setKind(kind)
  if (!isHome.value) {
    void navigateTo('/')
  }
  isSheetOpen.value = false
}

function onKindSelect(kind: 'MOVIE' | 'TV_SHOW'): void {
  handleKindSwitch(kind)
}

function onNavigateTo(path: string): void {
  isSheetOpen.value = false
  if (route.path !== path) {
    void navigateTo(path)
  }
}

const isMoviesSelected = computed(() => isHome.value && browseKind.value === 'MOVIE')
const isTvShowsSelected = computed(() => isHome.value && browseKind.value === 'TV_SHOW')
const isSearchSelected = computed(() => route.path === '/search')
const isMyListSelected = computed(() => route.path === '/my-list')

interface SheetNavItem {
  id: string
  label: string
  selected: boolean
  action: () => void
}

const sheetNavItems = computed<SheetNavItem[]>(() => {
  const items: SheetNavItem[] = [
    { id: 'movies', label: t('browse.kindMovies'), selected: isMoviesSelected.value, action: () => onKindSelect('MOVIE') },
    { id: 'tv', label: t('browse.kindTvShows'), selected: isTvShowsSelected.value, action: () => onKindSelect('TV_SHOW') },
    { id: 'search', label: t('search.label'), selected: isSearchSelected.value, action: () => onNavigateTo('/search') },
  ]
  if (props.user) {
    items.push({ id: 'myList', label: t('myList.heading'), selected: isMyListSelected.value, action: () => onNavigateTo('/my-list') })
  }
  return items
})

const LANGUAGE_LABELS: Record<AppLocale, string> = {
  'zh-TW': '繁體中文',
  'en': 'English',
}

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365
const localeCookie = useCookie(LOCALE_COOKIE, { maxAge: COOKIE_MAX_AGE_SECONDS, path: '/', sameSite: 'lax' })

function chooseLanguage(code: AppLocale): void {
  if (code === locale.value)
    return
  void setLocale(code)
  localeCookie.value = code
}

const sheetLangItems = computed(() => LOCALES.map(code => ({
  code,
  label: LANGUAGE_LABELS[code],
  selected: locale.value === code,
  action: () => chooseLanguage(code),
})))

function openSearch(): void {
  emit('openSearch')
}

function goHome(): void {
  void navigateTo('/')
}

function onScroll(): void {
  const y = typeof window === 'undefined' ? 0 : window.scrollY
  isScrolled.value = y > 50
}

onKeyStroke(
  event => event.key.toLowerCase() === 'k',
  (event) => {
    if (event.shiftKey || event.altKey)
      return
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault()
      emit('toggleSearch')
    }
  },
  { dedupe: true },
)

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <header
    id="siteHeader"
    :class="{ scrolled: isScrolled }"
    :data-hidden="isOverlayOpen ? 'true' : undefined"
    :aria-hidden="isOverlayOpen ? 'true' : undefined"
    :style="isOverlayOpen ? 'display:none' : undefined"
  >
    <div class="header-inner">
      <Sheet v-model:open="isSheetOpen">
        <SheetContent side="left" class="headerSheetContent z-[70] w-full bg-popover p-0" :show-close-button="true">
          <SheetTitle class="sr-only">
            SpudTube
          </SheetTitle>
          <div class="flex flex-col gap-6 px-5 pb-10 pt-14">
            <section class="flex flex-col gap-2.5" aria-label="Browse navigation">
              <h2 class="px-1 text-heading-xs text-muted-foreground">
                {{ t('menu.browse') }}
              </h2>
              <div class="flex flex-col gap-2">
                <Button
                  v-for="item in sheetNavItems"
                  :key="item.id"
                  type="button"
                  :variant="item.selected ? 'secondary' : 'ghost'"
                  :class="SHEET_BTN_CLASS"
                  :aria-current="item.selected ? 'page' : undefined"
                  @click="item.action"
                >
                  {{ item.label }}
                </Button>
              </div>
            </section>
            <div role="separator" aria-orientation="horizontal" class="h-px w-full bg-border" />
            <section class="flex flex-col gap-2.5" :aria-label="t('language.label')">
              <h2 class="px-1 text-heading-xs text-muted-foreground">
                {{ t('menu.language') }}
              </h2>
              <div class="flex flex-col gap-2">
                <Button
                  v-for="lang in sheetLangItems"
                  :key="lang.code"
                  type="button"
                  :variant="lang.selected ? 'secondary' : 'ghost'"
                  :class="SHEET_BTN_CLASS"
                  :aria-pressed="lang.selected"
                  @click="lang.action"
                >
                  {{ lang.label }}
                </Button>
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>
      <button
        type="button"
        class="headerHamburger"
        aria-label="Open navigation menu"
        :aria-expanded="isSheetOpen"
        aria-controls="sheet-content"
        @click="isSheetOpen = !isSheetOpen"
      >
        <Menu :size="20" :stroke-width="1.75" aria-hidden="true" />
      </button>
      <span
        class="logo"
        tabindex="0"
        role="button"
        aria-label="SpudTube 首頁"
        @click="goHome"
        @keydown.enter.prevent="goHome"
        @keydown.space.prevent="goHome"
      >SpudTube</span>
      <div class="headerKindDesktop">
        <KindSwitch
          :model-value="browseKind"
          :is-home="isHome"
          @select="onKindSelect"
        />
      </div>
      <nav id="appnav" aria-label="主要導覽">
        <button
          id="searchOpenBtn"
          type="button"
          :aria-label="t('search.open')"
          aria-keyshortcuts="Meta+K Control+K"
          class="ghost headerSearchBtn"
          @click="openSearch"
        >
          <Search :size="18" :stroke-width="1.75" aria-hidden="true" />
        </button>
        <span class="headerLangDesktop">
          <LanguageSwitcher />
        </span>
        <AccountMenu
          :user="props.user ?? null"
          @sign-in="emit('signIn')"
          @sign-out="emit('signOut')"
        />
      </nav>
    </div>
  </header>
</template>

<style scoped>
#siteHeader {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  height: var(--header-h);
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 var(--content-gutter);
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.35) 45%, transparent 100%);
  border-bottom: none;
  transition: background 0.28s ease, backdrop-filter 0.28s ease;
}
#siteHeader.scrolled {
  background: rgba(15, 15, 15, 0.96);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.header-inner {
  max-width: var(--max-content-width);
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 18px;
}
.headerHamburger {
  display: none;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--foreground);
  cursor: pointer;
}
.headerHamburger:hover {
  background: var(--muted);
}
.logo {
  display: inline-flex;
  align-items: center;
  font-size: var(--text-heading-lg);
  line-height: var(--leading-heading-lg);
  letter-spacing: var(--tracking-display);
  font-weight: var(--weight-display);
  padding: 6px 8px;
  border-radius: var(--radius);
  cursor: pointer;
  color: var(--foreground);
}
.logo:hover {
  background: rgba(255, 255, 255, 0.06);
}
.headerKindDesktop {
  display: flex;
  align-items: center;
}
#appnav {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-left: auto;
}
#appnav :deep(a),
#appnav a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: 9999px;
  font-weight: 600;
  font-size: var(--text-caption-md);
  line-height: var(--leading-caption-md);
  letter-spacing: var(--tracking-caption-md);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  text-decoration: none;
}
#appnav a.ghost,
#appnav .ghost {
  background: transparent;
  border: 1px solid transparent;
  color: var(--muted-foreground);
}
#appnav a.ghost:hover,
#appnav .ghost:hover {
  background: var(--muted);
  color: var(--foreground);
}
#appnav a.outline,
#appnav .outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--foreground);
}
#appnav a.outline:hover,
#appnav .outline:hover {
  background: var(--muted);
  border-color: var(--ring);
}
#appnav a.on {
  color: var(--foreground);
  background: var(--muted);
  border-color: var(--border);
}
#searchOpenBtn.ghost {
  background: transparent;
  border: 1px solid transparent;
  color: var(--muted-foreground);
  width: 38px;
  height: 38px;
  border-radius: 9999px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
#searchOpenBtn.ghost:hover {
  background: var(--muted);
  color: var(--foreground);
}
@media (max-width: 880px) {
  .headerHamburger {
    display: inline-flex;
  }
  .headerKindDesktop {
    display: none;
  }
  .headerLangDesktop {
    display: none;
  }
  .header-inner {
    gap: 8px;
  }
  .logo {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }
  .headerSearchBtn {
    display: none !important;
  }
}
@media (max-width: 560px) {
  #siteHeader {
    padding: 0 14px;
  }
  .logo {
    font-size: var(--text-heading-sm);
  }
}
</style>

<style>
/* Header Sheet must sit above #siteHeader (z-60). Sheet shadcn default is z-50
   — override here in consumer only, keep shadcn z-50 intact. Content lifted
   via class prop + twMerge (z-[70] wins over z-50); overlay lifted via global
   selector because SheetContent owns it internally. */
.headerSheetContent {
  z-index: 70 !important;
}
[data-slot="sheet-overlay"] {
  z-index: 70 !important;
}
[data-slot="sheet-content"].headerSheetContent {
  z-index: 70 !important;
}
</style>
