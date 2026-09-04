import type { DiscoverSortBy, TrendingWindow } from '../tmdb/client'
import type { Kind } from '../tmdb/types'

export type SectionSource
  = | 'trending'
    | 'topRated'
    | 'popular'
    | 'nowPlaying'
    | 'upcoming'
    | 'airingToday'
    | 'onTheAir'
    | 'discover'

export interface SectionQuery {
  source: SectionSource
  genreIds?: number[]
  keywordIds?: number[]
  minRating?: number
  minVoteCount?: number
  sortBy?: DiscoverSortBy
  releaseDateGte?: string
  releaseDateLte?: string
  firstAirDateGte?: string
  firstAirDateLte?: string
  trendingWindow?: TrendingWindow
}

export interface SectionDefinition {
  key: string
  kind: Kind
  titleKey: string
  query: SectionQuery
}

/** Rows with fewer titles than one carousel page are hidden, never rendered half empty. */
export const MIN_TITLES_PER_SECTION = 8

// Keyword IDs are pre-resolved upstream numeric IDs passed straight through,
// verified live against GET /search/keyword on 2026-09-05:
// twist-heavy films = twist ending 326438 + plot twist 275311 + mind-bending 362567;
// theories = mystery 316332 + conspiracy 10410. Spec rule: words with no
// matching entry are dropped rather than blocking, so adjust by editing values only.
const TWIST_KEYWORD_IDS = [326438, 275311, 362567]
const THEORIES_KEYWORD_IDS = [316332, 10410]

export const BROWSE_SECTIONS: SectionDefinition[] = [
  { key: 'movie.trending', kind: 'MOVIE', titleKey: 'browse.sections.movieTrending', query: { source: 'trending', trendingWindow: 'week' } },
  { key: 'movie.horror', kind: 'MOVIE', titleKey: 'browse.sections.movieHorror', query: { source: 'discover', genreIds: [27], minVoteCount: 100 } },
  { key: 'movie.twist', kind: 'MOVIE', titleKey: 'browse.sections.movieTwist', query: { source: 'discover', genreIds: [9648, 53, 80], keywordIds: TWIST_KEYWORD_IDS, minVoteCount: 50 } },
  { key: 'movie.crowd', kind: 'MOVIE', titleKey: 'browse.sections.movieCrowd', query: { source: 'discover', genreIds: [35, 10751, 12], minRating: 7, minVoteCount: 100 } },
  { key: 'movie.mood', kind: 'MOVIE', titleKey: 'browse.sections.movieMood', query: { source: 'discover', genreIds: [10749, 18], minRating: 7, minVoteCount: 100 } },
  { key: 'movie.gems', kind: 'MOVIE', titleKey: 'browse.sections.movieGems', query: { source: 'discover', minRating: 7.5, minVoteCount: 100, sortBy: 'vote_average.desc' } },
  { key: 'tv.trending', kind: 'TV_SHOW', titleKey: 'browse.sections.tvTrending', query: { source: 'trending', trendingWindow: 'week' } },
  { key: 'tv.obsessed', kind: 'TV_SHOW', titleKey: 'browse.sections.tvObsessed', query: { source: 'topRated' } },
  { key: 'tv.binge', kind: 'TV_SHOW', titleKey: 'browse.sections.tvBinge', query: { source: 'discover', genreIds: [35, 18, 9648], minVoteCount: 100 } },
  // TV has no Thriller (53) or Science Fiction (878) genre codes; theories use Mystery + Crime + Sci-Fi-Fantasy instead.
  { key: 'tv.theories', kind: 'TV_SHOW', titleKey: 'browse.sections.tvTheories', query: { source: 'discover', genreIds: [9648, 80, 10765], keywordIds: THEORIES_KEYWORD_IDS, minVoteCount: 50 } },
  { key: 'tv.worlds', kind: 'TV_SHOW', titleKey: 'browse.sections.tvWorlds', query: { source: 'discover', genreIds: [10765, 10759], minVoteCount: 100 } },
  { key: 'tv.wordOfMouth', kind: 'TV_SHOW', titleKey: 'browse.sections.tvWordOfMouth', query: { source: 'discover', minRating: 8, minVoteCount: 50, sortBy: 'vote_average.desc' } },
]

export function sectionsForKind(kind: Kind): SectionDefinition[] {
  return BROWSE_SECTIONS.filter(section => section.kind === kind)
}
