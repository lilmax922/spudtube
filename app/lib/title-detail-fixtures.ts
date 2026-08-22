import type { Page, TitleDetail, TitleSummary } from '#server/tmdb/types'

export const MOVIE_DETAIL: TitleDetail = {
  kind: 'MOVIE',
  tmdbId: 419430,
  name: '沙丘',
  posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
  backdropPath: '/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg',
  releaseDate: '2021-10-22',
  voteAverage: 7.805,
  overview: '天賦異稟的保羅·亞崔迪…',
  tagline: '超越即將來臨。',
  genres: [
    { id: 878, name: '科幻' },
    { id: 12, name: '冒險' },
  ],
  runtimeMinutes: 155,
  trailerKey: 'zhTrailerKey',
}

export const MOVIE_DETAIL_NO_TRAILER: TitleDetail = {
  ...MOVIE_DETAIL,
  trailerKey: null,
}

export const TV_DETAIL: TitleDetail = {
  kind: 'TV_SHOW',
  tmdbId: 94605,
  name: '奧術',
  posterPath: '/fqldf2tl8bJQXgaXnA9tw6pbRns.jpg',
  backdropPath: '/6TLvNexZw9mNyTOVTHZOLripeLy.jpg',
  releaseDate: '2021-11-06',
  voteAverage: 8.7,
  overview: '在烏托邦皮爾特沃夫…',
  tagline: null,
  genres: [
    { id: 16, name: '動畫' },
    { id: 10765, name: '科幻與奇幻' },
  ],
  runtimeMinutes: 42,
  trailerKey: null,
}

export const MOVIE_WITHOUT_ARTWORK: TitleDetail = {
  kind: 'MOVIE',
  tmdbId: 999001,
  name: 'Untranslated Film',
  posterPath: null,
  backdropPath: null,
  releaseDate: '1999-01-01',
  voteAverage: 5.5,
  overview: 'An English overview for an untranslated film.',
  tagline: null,
  genres: [],
  runtimeMinutes: 90,
  trailerKey: null,
}

export const RECOMMENDATIONS_PAGE: Page<TitleSummary> = {
  page: 1,
  totalPages: 3,
  totalResults: 55,
  results: [
    {
      kind: 'MOVIE',
      tmdbId: 693134,
      name: '沙丘：第二部',
      posterPath: '/1pdfLUkbDBtcDQNkh0Zkwv6hrvb.jpg',
      backdropPath: '/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
      releaseDate: '2024-02-27',
      voteAverage: 8.12,
    },
    {
      kind: 'TV_SHOW',
      tmdbId: 135431,
      name: '最後生還者',
      posterPath: '/uC6SNHt5DdzDJKRzjUx0OJcA9fi.jpg',
      backdropPath: '/6QR1LRmOsQmIXfcYw7Pg7P0RPBq.jpg',
      releaseDate: '2023-01-15',
      voteAverage: 8.5,
    },
  ],
}
