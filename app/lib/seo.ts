export const SEO_SITE_URL = 'https://spudtube.pages.dev'

export const SEO_TITLES = {
  'zh-TW': 'SpudTube - 拯救劇荒，快速找到今晚想看的電影與影集',
  'en': 'SpudTube - Discover Movies & TV Shows Worth Watching',
} as const

export const SEO_DESCRIPTIONS = {
  'zh-TW': '探索電影與影集，查看台灣串流上架資訊，收藏你的待看清單。從此告別「今晚看什麼」的選擇困難。',
  'en': 'Discover movies and TV shows, check streaming availability, and manage your watchlists. No more "what to watch tonight" fatigue.',
} as const

export type AppSeoLocale = 'zh-TW' | 'en'

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen)
    return text
  const slice = text.slice(0, maxLen)
  const lastSpace = slice.lastIndexOf(' ')
  if (lastSpace === -1)
    return `${slice}...`
  return `${slice.slice(0, lastSpace)}...`
}

export function extractYear(date: string | null | undefined): string | null {
  if (date == null || date === '')
    return null
  const match = date.match(/^(\d{4})/)
  if (match == null)
    return null
  const year = match[1]
  if (year == null || !/^\d{4}$/.test(year))
    return null
  const num = Number(year)
  if (Number.isNaN(num) || num < 1000 || num > 9999)
    return null
  return year
}

export function buildDetailTitle(title: string, releaseDate: string | null | undefined): string {
  const year = extractYear(releaseDate)
  if (year)
    return `${title} (${year}) - SpudTube`
  return `${title} - SpudTube`
}

export function buildDetailDescription(
  overview: string | null | undefined,
  title: string,
  releaseDate: string | null | undefined,
  locale: AppSeoLocale,
): string {
  const trimmed = (overview ?? '').trim()
  if (trimmed !== '') {
    if (trimmed.length <= 150)
      return trimmed
    return truncate(trimmed, 150)
  }
  const year = extractYear(releaseDate)
  const yearSegment = year ? ` (${year})` : ''
  if (locale === 'zh-TW')
    return `${title}${yearSegment} 在 SpudTube 上的介紹、演員陣容與串流上架資訊。`
  return `${title}${yearSegment} on SpudTube - cast, details and streaming availability.`
}

export function getOgLocale(locale: string): string {
  return locale === 'zh-TW' ? 'zh_TW' : 'en_US'
}

export function getOgLocaleAlternate(locale: string): string {
  return locale === 'zh-TW' ? 'en_US' : 'zh_TW'
}

export function buildCanonicalUrl(siteUrl: string | undefined, path: string): string {
  const base = (siteUrl ?? SEO_SITE_URL).replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}
