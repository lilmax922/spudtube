import type { Genre, TmdbLanguage } from './types'

export const ZH_TW_GENRE_MAP: Record<number, string> = {
  // Movie
  28: '動作',
  12: '冒險',
  16: '動畫',
  35: '喜劇',
  80: '犯罪',
  99: '紀錄',
  18: '劇情',
  10751: '家庭',
  14: '奇幻',
  36: '歷史',
  27: '恐怖',
  10402: '音樂',
  9648: '懸疑',
  10749: '愛情',
  878: '科幻',
  10770: '電視電影',
  53: '驚悚',
  10752: '戰爭',
  37: '西部',
  // TV extra
  10759: '動作冒險',
  10762: '兒童',
  10763: '新聞',
  10764: '真人秀',
  10765: '科幻與奇幻',
  10766: '肥皂劇',
  10767: '脫口秀',
  10768: '戰爭與政治',
}

export function localizeGenreName(id: number, upstreamName: string, language: TmdbLanguage): string {
  if (language === 'zh-TW') {
    return ZH_TW_GENRE_MAP[id] ?? upstreamName
  }
  return upstreamName
}

export function localizeGenres(genres: Genre[], language: TmdbLanguage): Genre[] {
  if (language !== 'zh-TW')
    return genres
  return genres.map(genre => ({
    id: genre.id,
    name: ZH_TW_GENRE_MAP[genre.id] ?? genre.name,
  }))
}
